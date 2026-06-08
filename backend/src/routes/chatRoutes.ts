import { Router } from "express";
import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { ChatMessage } from "../models/ChatMessage.js";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

export const chatRoutes = Router();
chatRoutes.use(authenticate);

type HistoryAggregate = {
  _id: mongoose.Types.ObjectId;
  body: string;
  createdAt: Date;
};

function requireObjectId(value: unknown, label: string) {
  if (typeof value !== "string") throw new AppError(400, `${label} is invalid`);
  if (!mongoose.Types.ObjectId.isValid(value)) throw new AppError(400, `${label} is invalid`);
  return value;
}

function messageBody(input: unknown) {
  const body = typeof input === "object" && input && "body" in input ? String((input as { body?: unknown }).body ?? "").trim() : "";
  if (!body) throw new AppError(400, "Message is required");
  return body;
}

function populateMessage(query: ReturnType<typeof ChatMessage.find>) {
  return query
    .populate("sender", "name email role profileImage")
    .populate("recipient", "name email role profileImage")
    .populate("project", "name key");
}

async function findMessage(id: mongoose.Types.ObjectId) {
  return ChatMessage.findById(id)
    .populate("sender", "name email role profileImage")
    .populate("recipient", "name email role profileImage")
    .populate("project", "name key");
}

chatRoutes.get("/history", (async (req, res) => {
  const currentUserId = new mongoose.Types.ObjectId(req.user!.id);

  const directMessages = await ChatMessage.aggregate<HistoryAggregate>([
    {
      $match: {
        scope: "Direct",
        $or: [{ sender: currentUserId }, { recipient: currentUserId }]
      }
    },
    { $sort: { createdAt: -1 } },
    {
      $addFields: {
        conversationUser: {
          $cond: [{ $eq: ["$sender", currentUserId] }, "$recipient", "$sender"]
        }
      }
    },
    {
      $group: {
        _id: "$conversationUser",
        body: { $first: "$body" },
        createdAt: { $first: "$createdAt" }
      }
    },
    { $limit: 20 }
  ]);

  const projectMessages = await ChatMessage.aggregate<HistoryAggregate>([
    { $match: { scope: "Project", project: { $exists: true, $ne: null } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$project",
        body: { $first: "$body" },
        createdAt: { $first: "$createdAt" }
      }
    },
    { $limit: 20 }
  ]);

  const history = [
    ...directMessages.map((message) => ({
      id: `direct:${message._id.toString()}`,
      kind: "direct",
      targetId: message._id.toString(),
      preview: message.body,
      updatedAt: message.createdAt.toISOString()
    })),
    ...projectMessages.map((message) => ({
      id: `project:${message._id.toString()}`,
      kind: "project",
      targetId: message._id.toString(),
      preview: message.body,
      updatedAt: message.createdAt.toISOString()
    }))
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json(history.slice(0, 20));
}) as RequestHandler);

chatRoutes.get("/direct/:userId", (async (req, res) => {
  const userId = requireObjectId(req.params.userId, "User");
  const recipient = await User.exists({ _id: userId });
  if (!recipient) throw new AppError(404, "User not found");

  const currentUserId = req.user!.id;
  const messages = await populateMessage(
    ChatMessage.find({
      scope: "Direct",
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId }
      ]
    }).sort({ createdAt: 1 })
  );
  res.json(messages);
}) as RequestHandler);

chatRoutes.post("/direct/:userId", (async (req, res) => {
  const userId = requireObjectId(req.params.userId, "User");
  const recipient = await User.exists({ _id: userId });
  if (!recipient) throw new AppError(404, "User not found");

  const message = await ChatMessage.create({
    scope: "Direct",
    sender: req.user!.id,
    recipient: userId,
    body: messageBody(req.body)
  });
  res.status(201).json(await findMessage(message._id));
}) as RequestHandler);

chatRoutes.get("/projects/:projectId", (async (req, res) => {
  const projectId = requireObjectId(req.params.projectId, "Project");
  const project = await Project.exists({ _id: projectId });
  if (!project) throw new AppError(404, "Project not found");

  const messages = await populateMessage(ChatMessage.find({ scope: "Project", project: projectId }).sort({ createdAt: 1 }));
  res.json(messages);
}) as RequestHandler);

chatRoutes.post("/projects/:projectId", (async (req, res) => {
  const projectId = requireObjectId(req.params.projectId, "Project");
  const project = await Project.exists({ _id: projectId });
  if (!project) throw new AppError(404, "Project not found");

  const message = await ChatMessage.create({
    scope: "Project",
    sender: req.user!.id,
    project: projectId,
    body: messageBody(req.body)
  });
  res.status(201).json(await findMessage(message._id));
}) as RequestHandler);
