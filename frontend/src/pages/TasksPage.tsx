import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Box,
  Card,
  CardContent,
  Grid2 as Grid,
  TextField,
  MenuItem,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ForumIcon from "@mui/icons-material/Forum";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useState } from "react";
import { api, crud, currentUser } from "../api/client";
import { DataState } from "../components/DataState";
import { TaskForm } from "../components/TaskForm";
import { IssueDetailDialog } from "../components/IssueDetailDialog";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import type { Issue, Project, User } from "../types";
import { issueStatusLabel } from "../utils/issues";

const wrappingCellSx = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  whiteSpace: "normal",
  verticalAlign: "top"
};

function uploadTaskScreenshots(issueId: string, screenshots: File[]) {
  const form = new FormData();
  screenshots.forEach((file) => form.append("files", file));
  return api<Issue>(`/issues/${issueId}/uploads`, { method: "POST", body: form });
}

export function TasksPage() {
  const qc = useQueryClient();
  const me = currentUser<User>();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const issues = useQuery({ queryKey: ["issues"], queryFn: () => api<Issue[]>("/issues") });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => crud.list<Project>("projects") });
  const users = useQuery({ queryKey: ["users"], queryFn: () => crud.list<User>("users") });

  const create = useMutation({
    mutationFn: async ({ data, screenshots }: { data: any; screenshots: File[] }) => {
      // Force type to Task for this page
      const taskData = { ...data, type: "Task" };
      const issue = await crud.create<Issue>("issues", taskData);
      return screenshots.length ? uploadTaskScreenshots(issue._id, screenshots) : issue;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setCreateOpen(false);
    }
  });

  const update = useMutation({
    mutationFn: async ({ id, data, screenshots }: { id: string; data: unknown; screenshots: File[] }) => {
      const issue = await crud.update<Issue>("issues", id, data);
      return screenshots.length ? uploadTaskScreenshots(id, screenshots) : issue;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      setEditing(null);
    }
  });

  const remove = useMutation({
    mutationFn: (id: string) => crud.remove("issues", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] })
  });

  if (issues.isPending || projects.isPending || users.isPending || issues.error || projects.error || users.error) {
    return <DataState loading={issues.isPending || projects.isPending || users.isPending} error={issues.error || projects.error || users.error} />;
  }

  // Filter tasks (only issues of type "Task")
  const allTasks = issues.data!.filter((issue) => issue.type === "Task");

  // Filter based on search query and project
  const filteredTasks = allTasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.issueNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (task.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = !projectFilter || task.project?._id === projectFilter;
    return matchesSearch && matchesProject;
  });

  // Calculate Stats
  const totalTasks = allTasks.length;
  const openTasks = allTasks.filter(t => ["OPEN", "BUG_BUCKET", "ASSIGNED"].includes(t.status)).length;
  const inProgressTasks = allTasks.filter(t => t.status === "IN_PROGRESS").length;
  const completedTasks = allTasks.filter(t => ["FIXED", "READY_FOR_TESTING", "CLOSED"].includes(t.status)).length;

  return (
    <>
      <PageHeader 
        title="Admin Tasks Management" 
        action="Create Task" 
        onAction={() => setCreateOpen(true)} 
      />

      {/* Stats Cards Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total Tasks" value={totalTasks} icon={<AssignmentIcon />} color="#0f62fe" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Open Tasks" value={openTasks} icon={<ErrorOutlineIcon />} color="#da1e28" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="In Progress" value={inProgressTasks} icon={<HourglassEmptyIcon />} color="#ff832b" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Completed Tasks" value={completedTasks} icon={<TaskAltIcon />} color="#24a148" />
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }} alignItems="center">
        <TextField
          size="small"
          label="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <TextField
          select
          size="small"
          label="Filter by Project"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All Projects</MenuItem>
          {projects.data!.map((project) => (
            <MenuItem key={project._id} value={project._id}>{project.name}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {/* Tasks Table */}
      <TableContainer sx={{ maxWidth: "100%", overflowX: "auto", pb: 1, bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["ID", "Title", "Project", "Module/Page", "Status", "Assignee", "Due Date", "Actions"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 800, py: 1.5 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3, color: "text.secondary" }}>
                  No tasks found. Click "Create Task" to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TableRow key={task._id} hover>
                  <TableCell sx={wrappingCellSx}>
                    <Box
                      sx={{ cursor: "pointer", color: "primary.main", fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
                      onClick={() => setSelected(task)}
                    >
                      {task.issueNumber}
                    </Box>
                  </TableCell>
                  <TableCell sx={wrappingCellSx}>
                    <Box sx={{ cursor: "pointer", fontWeight: 600 }} onClick={() => setSelected(task)}>
                      {task.title}
                    </Box>
                  </TableCell>
                  <TableCell sx={wrappingCellSx}>{task.project?.name}</TableCell>
                  <TableCell sx={wrappingCellSx}>
                    {task.modulePage ? (
                      <Chip label={task.modulePage} size="small" variant="outlined" color="secondary" />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell sx={wrappingCellSx}>
                    <Chip size="small" label={issueStatusLabel(task.status, me?.role)} />
                  </TableCell>
                  <TableCell sx={wrappingCellSx}>{task.assignee?.name ?? "Unassigned"}</TableCell>
                  <TableCell sx={wrappingCellSx}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="View details and comments">
                        <IconButton size="small" onClick={() => setSelected(task)}>
                          <ForumIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit task">
                        <IconButton size="small" color="primary" onClick={() => setEditing(task)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete task">
                        <IconButton size="small" color="error" onClick={() => remove.mutate(task._id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Task Dialogs */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>Create Task</DialogTitle>
        <DialogContent>
          <TaskForm
            projects={projects.data!}
            users={users.data!}
            onSubmit={(data, screenshots) => create.mutate({ data, screenshots })}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>Edit Task</DialogTitle>
        <DialogContent>
          {editing && (
            <TaskForm
              projects={projects.data!}
              users={users.data!}
              initial={editing}
              onSubmit={(data, screenshots) => update.mutate({ id: editing._id, data, screenshots })}
            />
          )}
        </DialogContent>
      </Dialog>

      <IssueDetailDialog
        issue={selected}
        open={Boolean(selected)}
        currentUserRole={me?.role}
        onClose={() => setSelected(null)}
        onIssuePatched={(patch) => setSelected((current) => (current ? { ...current, ...patch } : current))}
      />
    </>
  );
}
