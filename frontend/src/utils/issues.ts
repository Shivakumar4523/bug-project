import type { IssueStatus, Role } from "../types";

const statusLabels: Record<IssueStatus, string> = {
  OPEN: "Open",
  BUG_BUCKET: "Bug Bucket",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  FIXED: "Fixed",
  READY_FOR_TESTING: "Ready For Testing",
  REOPENED: "Reopened",
  CLOSED: "Closed"
};

export function issueStatusLabel(status?: string, role?: Role) {
  if (status === "BUG_BUCKET" && role === "Tester") return "Reported Bug";
  return statusLabels[status as IssueStatus] ?? status ?? "";
}
