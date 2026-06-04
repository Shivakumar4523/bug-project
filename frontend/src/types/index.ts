export type Role = "Admin" | "Developer" | "Tester";
export type IssueStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "FIXED" | "READY_FOR_TESTING" | "REOPENED" | "CLOSED";
export type IssuePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IssueSeverity = "MINOR" | "MAJOR" | "CRITICAL" | "BLOCKER";

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  profileImage?: string;
  disabled?: boolean;
}

export interface Project {
  _id: string;
  name: string;
  key: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  members?: User[];
}

export interface Issue {
  _id: string;
  issueNumber: string;
  type: "Bug" | "Task" | "Story" | "Improvement";
  title: string;
  description?: string;
  project: Project;
  reporter: User;
  assignee?: User;
  priority: IssuePriority;
  severity: IssueSeverity;
  status: IssueStatus;
  assignedBy?: User;
  labels?: string[];
  attachments?: string[];
  watchers?: (User | string)[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}
