import { useQuery } from "@tanstack/react-query";
import { Box, Card, CardContent, Chip, Grid2 as Grid, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { Line, LineChart, Pie, PieChart, ResponsiveContainer, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { api, currentUser } from "../api/client";
import { DataState } from "../components/DataState";
import { PageHeader } from "../components/PageHeader";
import type { Issue, User } from "../types";
import { issueStatusLabel } from "../utils/issues";

const colors = ["#da1e28", "#ff832b", "#0f62fe", "#24a148", "#8a3ffc", "#525252"];

export function DashboardPage() {
  const me = currentUser<User>();
  const stats = useQuery({ queryKey: ["dashboard"], queryFn: () => api<any>("/reports/dashboard") });
  const issues = useQuery({ queryKey: ["issues", "recent"], queryFn: () => api<Issue[]>("/issues") });
  if (stats.isLoading || issues.isLoading || stats.error || issues.error) return <DataState loading={stats.isLoading || issues.isLoading} error={stats.error || issues.error} />;
  const bugBucketLabel = me?.role === "Tester" ? "Reported Bug" : "Bug Bucket";
  const cards = [
    ["Total Projects", stats.data!.totalProjects],
    ["Total Issues", stats.data!.total],
    ["Open Issues", stats.data!.open],
    [bugBucketLabel, stats.data!.bugBucket],
    ["Assigned Issues", stats.data!.assigned],
    ["In Progress", stats.data!.inProgress],
    ["Fixed Issues", stats.data!.fixed],
    ["Ready For Testing", stats.data!.readyForTesting],
    ["Closed Issues", stats.data!.closed],
    ["Total Users", stats.data!.totalUsers]
  ];
  const lineData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => ({ day, issues: Math.max(0, (stats.data!.total ?? 0) - 5 + i * 2) }));
  const priorityData = stats.data!.byPriority.map((x: any) => ({ name: x._id, value: x.value }));
  const statusData = stats.data!.byStatus.map((x: any) => ({ name: issueStatusLabel(x._id, me?.role), value: x.value }));

  return (
    <>
      <PageHeader title="Dashboard" />
      <Grid container spacing={2}>
        {cards.map(([label, value]) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={label}>
            <Card><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h4">{value}</Typography></CardContent></Card>
          </Grid>
        ))}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card><CardContent><Typography variant="h6">Issues Overview</Typography><Box sx={{ height: 260 }}><ResponsiveContainer><LineChart data={lineData}><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="issues" stroke="#0f62fe" strokeWidth={3} /></LineChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card><CardContent><Typography variant="h6">Issues by Priority</Typography><Box sx={{ height: 260 }}><ResponsiveContainer><PieChart><Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} label>{priorityData.map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card><CardContent><Typography variant="h6">Team Performance</Typography><Box sx={{ height: 240 }}><ResponsiveContainer><BarChart data={statusData}><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#24a148" /></BarChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Recent Issues</Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>{["ID", "Title", "Project", "Category", "Status", "Priority", "Assignee", "Updated", "Actions"].map((h) => <TableCell key={h} sx={{ whiteSpace: "nowrap", fontWeight: 800 }}>{h}</TableCell>)}</TableRow>
                  </TableHead>
                  <TableBody>
                    {issues.data!.slice(0, 8).map((issue) => (
                      <TableRow key={issue._id}>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.issueNumber}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.title}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.project?.key}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.category}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}><Chip size="small" label={issueStatusLabel(issue.status, me?.role)} /></TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.priority}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.assignee?.name ?? "Unassigned"}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{new Date(issue.updatedAt).toLocaleDateString()}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <IconButton size="small"><MoreHorizIcon /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
