import { Issue } from "../models/Issue.js";
import { Project } from "../models/Project.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { AppError } from "../middleware/errorHandler.js";
import { emitNotification } from "../realtime/socket.js";
import { logActivity } from "./activityService.js";
import { mailService } from "./mailService.js";

// Helper function to keep only the last 5 notifications per user
async function cleanupOldNotifications(userId: string) {
  const userNotifications = await Notification.find({ user: userId }).sort({ createdAt: -1 }).skip(5);
  if (userNotifications.length > 0) {
    const oldIds = userNotifications.map((n) => n._id);
    await Notification.deleteMany({ _id: { $in: oldIds } });
  }
}

async function nextIssueNumber(projectId: string) {
  const project = await Project.findById(projectId);
  if (!project) throw new AppError(404, "Project not found");
  const count = await Issue.countDocuments({ project: projectId });
  return `${project.key}-${count + 1}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function notifyAssignee(assignee: string | undefined, issueId: string, title: string, options: { sendEmail?: boolean } = {}) {
  if (!assignee) return;
  const user = await User.findById(assignee);
  if (!user) return;
  const notification = await Notification.create({ user: assignee, title: "Issue Assigned", message: title, type: "Issue Assigned", entity: issueId });
  emitNotification(assignee, notification);
  await cleanupOldNotifications(assignee);
  if (options.sendEmail !== false) {
    await mailService.send(user.email, "PIRNAV issue assigned", `<p>You were assigned: <strong>${escapeHtml(title)}</strong></p>`);
  }
}

async function notifyUsers(filter: Record<string, unknown>, title: string, message: string, type: "Issue Created" | "Issue Assigned" | "Status Changed" | "Comment Added", issueId: string) {
  const users = await User.find(filter).select("_id email");
  for (const user of users) {
    const notification = await Notification.create({ user: user._id, title, message, type, entity: issueId });
    emitNotification(user._id.toString(), notification);
    await cleanupOldNotifications(user._id.toString());
  }
}

async function emailDevelopersAboutTesterIssue(issue: any, reporter: Express.User, assignee?: string) {
  if (reporter.role !== "Tester") return;

  let users = assignee ? await User.find({ _id: assignee, role: "Developer", disabled: { $ne: true } }).select("email name") : [];
  if (!users.length) {
    users = await User.find({ role: "Developer", disabled: { $ne: true } }).select("email name");
  }
  if (!users.length) return;

  const subject = `PIRNAV issue created: ${issue.issueNumber}`;
  const html = `
    <p>A tester created a new issue for developer review.</p>
    <p><strong>${escapeHtml(issue.issueNumber)} - ${escapeHtml(issue.title)}</strong></p>
    <p>
      <strong>Reporter:</strong> ${escapeHtml(reporter.name)} (${escapeHtml(reporter.email)})<br/>
      <strong>Status:</strong> ${escapeHtml(issue.status)}<br/>
      <strong>Priority:</strong> ${escapeHtml(issue.priority)}
    </p>
    ${issue.description ? `<p><strong>Description:</strong><br/>${escapeHtml(issue.description).replace(/\n/g, "<br/>")}</p>` : ""}
  `;

  for (const user of users) {
    await mailService.send(user.email, subject, html, { fromName: `${reporter.name} via PIRNAV`, replyTo: reporter.email });
  }
}

export const issueService = {
  async create(data: any, user: Express.User) {
    const payload = { ...data };
    if (user.role === "Admin") {
      delete payload.priority;
      delete payload.severity;
      delete payload.status;
      delete payload.labels;
      delete payload.dueDate;
    }
    if (user.role === "Tester") {
      delete payload.severity;
      delete payload.labels;
    }

    const status = payload.status ?? (payload.assignee ? "ASSIGNED" : "OPEN");
    const issue = await Issue.create({ ...payload, status, reporter: user.id, assignedBy: payload.assignee ? user.id : undefined, issueNumber: await nextIssueNumber(payload.project) });
    await logActivity(user.id, "Issue Created", "Issue", issue._id.toString(), { title: issue.title });
    await notifyUsers({ role: "Admin", disabled: { $ne: true } }, "Issue Created", issue.title, "Issue Created", issue._id.toString());
    if (user.role === "Tester") {
      await emailDevelopersAboutTesterIssue(issue, user, payload.assignee);
      await notifyAssignee(payload.assignee, issue._id.toString(), issue.title, { sendEmail: false });
    } else {
      await notifyAssignee(payload.assignee, issue._id.toString(), issue.title);
    }
    return issue;
  },

  async update(id: string, data: any, user: Express.User) {
    const before = await Issue.findById(id);
    if (!before) throw new AppError(404, "Issue not found");
    const update = { ...data };
    if (user.role === "Admin") {
      delete update.priority;
      delete update.severity;
      delete update.status;
      delete update.labels;
      delete update.dueDate;
    }
    if (user.role === "Tester") {
      delete update.severity;
      delete update.labels;
    }

    if (update.assignee && update.assignee !== String(before.assignee)) {
      update.assignedBy = user.id;
      if (!update.status) update.status = "ASSIGNED";
    }
    const issue = await Issue.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (update.status && update.status !== before.status) {
      await logActivity(user.id, "Status Changed", "Issue", id, { from: before.status, to: update.status });
      if (update.status === "READY_FOR_TESTING") await notifyUsers({ _id: before.reporter }, "Ready For Testing", before.title, "Status Changed", id);
      if (update.status === "REOPENED" && before.assignee) await notifyUsers({ _id: before.assignee }, "Issue Reopened", before.title, "Status Changed", id);
      if (update.status === "CLOSED") await notifyUsers({ role: "Admin", disabled: { $ne: true } }, "Issue Closed", before.title, "Status Changed", id);
      for (const watcher of before.watchers) {
        await Notification.create({ user: watcher, title: "Status Changed", message: `${before.issueNumber} moved to ${update.status}`, type: "Status Changed", entity: id });
        await cleanupOldNotifications(watcher.toString());
      }
    } else if (update.assignee && update.assignee !== String(before.assignee)) {
      await logActivity(user.id, "Assignment Changed", "Issue", id, { assignee: update.assignee });
      await notifyAssignee(update.assignee, id, before.title);
    } else {
      await logActivity(user.id, "Issue Updated", "Issue", id);
    }
    return issue;
  }
};

export { cleanupOldNotifications };
