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
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
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
const colors = ["#0f62fe", "#da1e28", "#ff832b", "#24a148", "#525252"];
const openTaskStatuses = new Set(["OPEN", "BUG_BUCKET", "ASSIGNED"]);
const completedTaskStatuses = new Set(["FIXED", "READY_FOR_TESTING", "CLOSED"]);
const dashboardPanelSx = {
  height: "100%",
  borderRadius: "8px",
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 1px 3px 0 rgb(15 23 42 / 0.1), 0 1px 2px -1px rgb(15 23 42 / 0.1)"
};

function uploadTaskAttachments(issueId: string, attachments: File[]) {
  const form = new FormData();
  attachments.forEach((file) => form.append("files", file));
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
    mutationFn: async ({ data, attachments }: { data: any; attachments: File[] }) => {
      // Force type to Task for this page
      const taskData = { ...data, type: "Task" };
      const issue = await crud.create<Issue>("issues", taskData);
      return attachments.length ? uploadTaskAttachments(issue._id, attachments) : issue;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setCreateOpen(false);
    }
  });

  const update = useMutation({
    mutationFn: async ({ id, data, attachments }: { id: string; data: unknown; attachments: File[] }) => {
      const issue = await crud.update<Issue>("issues", id, data);
      return attachments.length ? uploadTaskAttachments(id, attachments) : issue;
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

  const totalTasks = allTasks.length;
  const openTasks = allTasks.filter((task) => openTaskStatuses.has(task.status)).length;
  const inProgressTasks = allTasks.filter((task) => task.status === "IN_PROGRESS").length;
  const completedTasks = allTasks.filter((task) => completedTaskStatuses.has(task.status)).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueTasks = allTasks.filter((task) => task.dueDate && new Date(task.dueDate) < today && !completedTaskStatuses.has(task.status)).length;
  const upcomingTasks = allTasks
    .filter((task) => task.dueDate && !completedTaskStatuses.has(task.status))
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);
  const taskCards = [
    { label: "Total Tasks", value: totalTasks, icon: <AssignmentIcon />, color: "#0f62fe" },
    { label: "Open Tasks", value: openTasks, icon: <ErrorOutlineIcon />, color: "#da1e28" },
    { label: "In Progress", value: inProgressTasks, icon: <HourglassEmptyIcon />, color: "#ff832b" },
    { label: "Completed Tasks", value: completedTasks, icon: <TaskAltIcon />, color: "#24a148" }
  ];
  const taskStatusData = ["OPEN", "BUG_BUCKET", "ASSIGNED", "IN_PROGRESS", "FIXED", "READY_FOR_TESTING", "CLOSED"]
    .map((status) => ({ name: issueStatusLabel(status, me?.role), value: allTasks.filter((task) => task.status === status).length }))
    .filter((item) => item.value > 0);
  const taskPriorityData = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    .map((priority) => ({ name: priority, value: allTasks.filter((task) => task.priority === priority).length }))
    .filter((item) => item.value > 0);
  const taskProjectData = projects.data!
    .map((project) => ({ name: project.key || project.name, value: allTasks.filter((task) => task.project?._id === project._id).length }))
    .filter((item) => item.value > 0)
    .slice(0, 6);

  return (
    <>
      <PageHeader 
        title="Task Management Dashboard" 
        action="Create Task" 
        onAction={() => setCreateOpen(true)} 
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {taskCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
            <StatCard {...card} />
          </Grid>
        ))}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={dashboardPanelSx}>
            <CardContent>
              <Typography variant="h6">Tasks by Status</Typography>
              <Box sx={{ height: 260 }}>
                {taskStatusData.length ? (
                  <ResponsiveContainer>
                    <BarChart data={taskStatusData}>
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip />
                      <Bar dataKey="value" fill="#0f62fe" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack sx={{ height: "100%" }} alignItems="center" justifyContent="center">
                    <Typography color="text.secondary">No tasks yet.</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={dashboardPanelSx}>
            <CardContent>
              <Typography variant="h6">Tasks by Priority</Typography>
              <Box sx={{ height: 260 }}>
                {taskPriorityData.length ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={taskPriorityData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} label>
                        {taskPriorityData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack sx={{ height: "100%" }} alignItems="center" justifyContent="center">
                    <Typography color="text.secondary">No priority data.</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={dashboardPanelSx}>
            <CardContent>
              <Typography variant="h6">Tasks by Project</Typography>
              <Box sx={{ height: 250 }}>
                {taskProjectData.length ? (
                  <ResponsiveContainer>
                    <BarChart data={taskProjectData}>
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip />
                      <Bar dataKey="value" fill="#24a148" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack sx={{ height: "100%" }} alignItems="center" justifyContent="center">
                    <Typography color="text.secondary">No project data.</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={dashboardPanelSx}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
                <Typography variant="h6">Upcoming Deadlines</Typography>
                <Chip size="small" color={overdueTasks ? "error" : "default"} label={`${overdueTasks} overdue`} />
              </Stack>
              <Box sx={{ minHeight: 250 }}>
                {upcomingTasks.length ? (
                  <Stack>
                    {upcomingTasks.map((task, index) => (
                      <Box
                        key={task._id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 2,
                          py: 1.25,
                          borderBottom: index === upcomingTasks.length - 1 ? "none" : "1px solid",
                          borderColor: "divider"
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>{task.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {task.issueNumber} - {task.project?.name ?? "No project"}
                          </Typography>
                        </Box>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-end", sm: "center" }}>
                          <Chip size="small" label={task.priority} variant="outlined" />
                          <Chip size="small" label={new Date(task.dueDate!).toLocaleDateString()} />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Stack sx={{ minHeight: 210 }} alignItems="center" justifyContent="center">
                    <Typography color="text.secondary">No upcoming tasks.</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

      <TableContainer sx={{ maxWidth: "100%", overflowX: "auto", pb: 1, bgcolor: "background.paper", borderRadius: "8px", border: "1px solid", borderColor: "divider", boxShadow: "0 1px 3px 0 rgb(15 23 42 / 0.1), 0 1px 2px -1px rgb(15 23 42 / 0.1)" }}>
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
                      "-"
                    )}
                  </TableCell>
                  <TableCell sx={wrappingCellSx}>
                    <Chip size="small" label={issueStatusLabel(task.status, me?.role)} />
                  </TableCell>
                  <TableCell sx={wrappingCellSx}>{task.assignee?.name ?? "Unassigned"}</TableCell>
                  <TableCell sx={wrappingCellSx}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}
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
            onSubmit={(data, attachments) => create.mutate({ data, attachments })}
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
              onSubmit={(data, attachments) => update.mutate({ id: editing._id, data, attachments })}
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
