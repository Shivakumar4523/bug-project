import { Issue } from "../models/Issue.js";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
export const reportController = {
    dashboard: (async (_req, res) => {
        const [total, open, assigned, inProgress, fixed, readyForTesting, closed, totalProjects, totalUsers, byPriority, byStatus, byProject] = await Promise.all([
            Issue.countDocuments(),
            Issue.countDocuments({ status: "OPEN" }),
            Issue.countDocuments({ status: "ASSIGNED" }),
            Issue.countDocuments({ status: "IN_PROGRESS" }),
            Issue.countDocuments({ status: "FIXED" }),
            Issue.countDocuments({ status: "READY_FOR_TESTING" }),
            Issue.countDocuments({ status: "CLOSED" }),
            Project.countDocuments(),
            User.countDocuments(),
            Issue.aggregate([{ $group: { _id: "$priority", value: { $sum: 1 } } }]),
            Issue.aggregate([{ $group: { _id: "$status", value: { $sum: 1 } } }]),
            Issue.aggregate([{ $group: { _id: "$project", issues: { $sum: 1 } } }])
        ]);
        res.json({ total, open, assigned, inProgress, fixed, readyForTesting, closed, totalProjects, totalUsers, byPriority, byStatus, byProject });
    }),
    reports: (async (_req, res) => {
        const projects = await Project.find();
        const issues = await Issue.find().populate("project", "name key").populate("assignee", "name");
        res.json({
            bugSummary: issues,
            resolutionTime: issues.filter((i) => i.status === "CLOSED"),
            teamPerformance: await Issue.aggregate([{ $group: { _id: "$assignee", resolved: { $sum: { $cond: [{ $eq: ["$status", "CLOSED"] }, 1, 0] } }, total: { $sum: 1 } } }]),
            projectStatus: projects
        });
    })
};
