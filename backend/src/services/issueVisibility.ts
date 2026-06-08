import type { FilterQuery } from "mongoose";
import { Issue, type IssueDocument } from "../models/Issue.js";
import { Project } from "../models/Project.js";

export type IssueFilter = FilterQuery<IssueDocument>;

export function combineIssueFilters(...filters: IssueFilter[]): IssueFilter {
  const activeFilters = filters.filter((filter) => Object.keys(filter).length > 0);
  if (activeFilters.length === 0) return {};
  if (activeFilters.length === 1) return activeFilters[0];
  return { $and: activeFilters };
}

export async function issueVisibilityFilter(user: Express.User): Promise<IssueFilter> {
  if (user.role === "Tester") {
    return { reporter: user.id };
  }

  if (user.role !== "Developer") {
    return {};
  }

  const projectIds = await Project.find({ members: user.id }).distinct("_id");

  return {
    $or: [
      { assignee: user.id },
      {
        status: "BUG_BUCKET",
        project: { $in: projectIds }
      }
    ]
  };
}

export async function visibleIssueFilter(user: Express.User, filter: IssueFilter = {}): Promise<IssueFilter> {
  return combineIssueFilters(filter, await issueVisibilityFilter(user));
}

export async function findVisibleIssueById(user: Express.User, id: unknown) {
  return Issue.findOne(await visibleIssueFilter(user, { _id: String(id) }));
}
