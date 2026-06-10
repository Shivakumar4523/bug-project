import { useQuery } from "@tanstack/react-query";
import { Box, Card, CardContent, Chip, Grid2 as Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useState } from "react";
import { Line, LineChart, Pie, PieChart, ResponsiveContainer, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import PeopleIcon from "@mui/icons-material/People";
import FolderIcon from "@mui/icons-material/Folder";
import { api, currentUser } from "../api/client";
import { DataState } from "../components/DataState";
import { IssueDetailDialog } from "../components/IssueDetailDialog";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import type { Issue, User } from "../types";
import { issueStatusLabel } from "../utils/issues";

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

export function DashboardPage() {
  const me = currentUser<User>();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const stats = useQuery({ queryKey: ["dashboard"], queryFn: () => api<any>("/reports/dashboard") });
  const issues = useQuery({ queryKey: ["issues", "recent"], queryFn: () => api<Issue[]>("/issues") });
  if (stats.isPending || issues.isPending || stats.error || issues.error) return <DataState loading={stats.isPending || issues.isPending} error={stats.error || issues.error} />;
  const bugBucketLabel = me?.role === "Tester" ? "Reported Bug" : "Bug Bucket";
  const allIssues = issues.data!;
  const allTasks = allIssues.filter((issue) => issue.type === "Task");
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
  const cards = [
    { label: "Total Projects", value: stats.data!.totalProjects, icon: <FolderIcon />, color: "#525252" },
    { label: "Total Issues", value: stats.data!.total, icon: <AssignmentIcon />, color: "#0f62fe" },
    { label: "Open Issues", value: stats.data!.open, icon: <ErrorOutlineIcon />, color: "#da1e28" },
    { label: bugBucketLabel, value: stats.data!.bugBucket, icon: <ErrorOutlineIcon />, color: "#da1e28" },
    { label: "Assigned Issues", value: stats.data!.assigned, icon: <ErrorOutlineIcon />, color: "#da1e28" },
    { label: "In Progress", value: stats.data!.inProgress, icon: <HourglassEmptyIcon />, color: "#ff832b" },
    { label: "Fixed Issues", value: stats.data!.fixed, icon: <TaskAltIcon />, color: "#24a148" },
    { label: "Ready For Testing", value: stats.data!.readyForTesting, icon: <TaskAltIcon />, color: "#24a148" },
    { label: "Closed Issues", value: stats.data!.closed, icon: <TaskAltIcon />, color: "#24a148" },
    { label: "Total Users", value: stats.data!.totalUsers, icon: <PeopleIcon />, color: "#525252" }
  ];
  const taskCards = [
    { label: "Total Tasks", value: totalTasks, icon: <AssignmentIcon />, color: "#0f62fe" },
    { label: "Open Tasks", value: openTasks, icon: <ErrorOutlineIcon />, color: "#da1e28" },
    { label: "In Progress", value: inProgressTasks, icon: <HourglassEmptyIcon />, color: "#ff832b" },
    { label: "Completed Tasks", value: completedTasks, icon: <TaskAltIcon />, color: "#24a148" }
  ];
  const lineData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => ({ day, issues: Math.max(0, (stats.data!.total ?? 0) - 5 + i * 2) }));
  const priorityData = stats.data!.byPriority.map((x: any) => ({ name: x._id, value: x.value }));
  const statusData = stats.data!.byStatus.map((x: any) => ({ name: issueStatusLabel(x._id, me?.role), value: x.value }));
  const taskStatusData = ["OPEN", "BUG_BUCKET", "ASSIGNED", "IN_PROGRESS", "FIXED", "READY_FOR_TESTING", "CLOSED"]
    .map((status) => ({ name: issueStatusLabel(status, me?.role), value: allTasks.filter((task) => task.status === status).length }))
    .filter((item) => item.value > 0);
  const taskPriorityData = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    .map((priority) => ({ name: priority, value: allTasks.filter((task) => task.priority === priority).length }))
    .filter((item) => item.value > 0);

  return (
    <>
      <PageHeader title="Dashboard" />
      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
            <StatCard {...card} />
          </Grid>
        ))}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h5" sx={{ mt: 1, fontWeight: 900 }}>
            Task Management Dashboard
          </Typography>
        </Grid>
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
                      <Tooltip />
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
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
                <Typography variant="h6">Task Priority</Typography>
                <Chip size="small" color={overdueTasks ? "error" : "default"} label={`${overdueTasks} overdue`} />
              </Stack>
              <Box sx={{ height: 260 }}>
                {taskPriorityData.length ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={taskPriorityData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} label>
                        {taskPriorityData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                      </Pie>
                      <Tooltip />
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
        <Grid size={{ xs: 12 }}>
          <Card sx={dashboardPanelSx}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Upcoming Tasks
              </Typography>
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
                        <Chip size="small" label={issueStatusLabel(task.status, me?.role)} />
                        <Chip size="small" variant="outlined" label={new Date(task.dueDate!).toLocaleDateString()} />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">No upcoming tasks.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={dashboardPanelSx}><CardContent><Typography variant="h6">Issues Overview</Typography><Box sx={{ height: 260 }}><ResponsiveContainer><LineChart data={lineData}><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="issues" stroke="#0f62fe" strokeWidth={3} /></LineChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={dashboardPanelSx}><CardContent><Typography variant="h6">Issues by Priority</Typography><Box sx={{ height: 260 }}><ResponsiveContainer><PieChart><Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} label>{priorityData.map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={dashboardPanelSx}><CardContent><Typography variant="h6">Team Performance</Typography><Box sx={{ height: 240 }}><ResponsiveContainer><BarChart data={statusData}><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#24a148" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={dashboardPanelSx}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Recent Issues</Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {["ID", "Title", "Project", "Category", "Status", "Priority", "Assignee", "Updated"].map((h) => (
                        <TableCell key={h} sx={{ whiteSpace: "nowrap", fontWeight: 800 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allIssues.slice(0, 8).map((issue) => (
                      <TableRow
                        key={issue._id}
                        hover
                        onClick={() => setSelectedIssue(issue)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.issueNumber}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.title}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.project?.key}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.category}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}><Chip size="small" label={issueStatusLabel(issue.status, me?.role)} /></TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.priority}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.assignee?.name ?? "Unassigned"}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{new Date(issue.updatedAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <IssueDetailDialog
        issue={selectedIssue}
        open={Boolean(selectedIssue)}
        currentUserRole={me?.role}
        onClose={() => setSelectedIssue(null)}
      />
    </>
  );
}
