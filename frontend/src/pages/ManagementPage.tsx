import { useQuery } from "@tanstack/react-query";
import { Box, Card, CardContent, Grid2 as Grid, Stack, Typography } from "@mui/material";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { crud } from "../api/client";
import { DataState } from "../components/DataState";
import { PageHeader } from "../components/PageHeader";
import type { Project, User } from "../types";

type TimedEntity = {
  createdAt?: string;
};

function dateFromEntity(entity: TimedEntity) {
  const date = new Date(entity.createdAt ?? "");
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildGrowthData(users: User[], projects: Project[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 5 + index, 1));
  const userDates = users.map(dateFromEntity).filter((date): date is Date => Boolean(date));
  const projectDates = projects.map(dateFromEntity).filter((date): date is Date => Boolean(date));

  return months.map((month, index) => {
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
    const isCurrentMonth = index === months.length - 1;

    return {
      month: month.toLocaleString("en-US", { month: "short" }),
      users: userDates.length ? userDates.filter((date) => date <= monthEnd).length : isCurrentMonth ? users.length : 0,
      projects: projectDates.length ? projectDates.filter((date) => date <= monthEnd).length : isCurrentMonth ? projects.length : 0
    };
  });
}

export function ManagementPage() {
  const users = useQuery({ queryKey: ["users"], queryFn: () => crud.list<User>("users") });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => crud.list<Project>("projects") });

  if (users.isLoading || projects.isLoading || users.error || projects.error) {
    return <DataState loading={users.isLoading || projects.isLoading} error={users.error || projects.error} />;
  }

  const userList = users.data ?? [];
  const projectList = projects.data ?? [];
  const activeProjects = projectList.filter((project) => project.status === "Active").length;
  const chartData = buildGrowthData(userList, projectList);

  return (
    <>
      <PageHeader title="Management" />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Users</Typography>
              <Typography variant="h4">{userList.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Projects</Typography>
              <Typography variant="h4">{projectList.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Active Projects</Typography>
              <Typography variant="h4">{activeProjects}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Project Members</Typography>
              <Typography variant="h4">
                {projectList.reduce((total, project) => total + (project.members?.length ?? 0), 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6">Users and Projects</Typography>
                  <Typography variant="body2" color="text.secondary">Six-month management growth</Typography>
                </Box>
              </Stack>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="users" name="Users" stroke="#0f62fe" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="projects" name="Projects" stroke="#24a148" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
