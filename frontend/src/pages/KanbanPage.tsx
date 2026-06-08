import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Card, CardContent, Chip, Grid2 as Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { api, crud } from "../api/client";
import { DataState } from "../components/DataState";
import { PageHeader } from "../components/PageHeader";
import type { Issue, IssueStatus, Project, User } from "../types";
import { issueStatusLabel } from "../utils/issues";

const statuses: IssueStatus[] = ["BUG_BUCKET", "ASSIGNED", "IN_PROGRESS", "FIXED", "READY_FOR_TESTING", "REOPENED", "CLOSED"];
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function KanbanPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ project: "", assignee: "", priority: "" });
  const issues = useQuery({ queryKey: ["issues", "kanban"], queryFn: () => api<Issue[]>("/issues") });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => crud.list<Project>("projects") });
  const users = useQuery({ queryKey: ["users"], queryFn: () => crud.list<User>("users") });
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => crud.update<Issue>("issues", id, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }) });
  if (issues.isLoading || projects.isLoading || users.isLoading || issues.error || projects.error || users.error) return <DataState loading={issues.isLoading || projects.isLoading || users.isLoading} error={issues.error || projects.error || users.error} />;
  const filtered = issues.data!.filter((i) => (!filters.project || i.project?._id === filters.project) && (!filters.assignee || i.assignee?._id === filters.assignee) && (!filters.priority || i.priority === filters.priority));

  return (
    <>
      <PageHeader title="Kanban Board" />
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField select size="small" label="Project" value={filters.project} onChange={(e) => setFilters({ ...filters, project: e.target.value })} sx={{ minWidth: 220 }}><MenuItem value="">All Projects</MenuItem>{projects.data!.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}</TextField>
        <TextField select size="small" label="Assignee" value={filters.assignee} onChange={(e) => setFilters({ ...filters, assignee: e.target.value })} sx={{ minWidth: 220 }}><MenuItem value="">All Assignees</MenuItem>{users.data!.map((u) => <MenuItem key={u._id ?? u.id} value={u._id ?? u.id}>{u.name}</MenuItem>)}</TextField>
        <TextField select size="small" label="Priority" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} sx={{ minWidth: 180 }}><MenuItem value="">All Priorities</MenuItem>{priorities.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField>
      </Stack>
      <Grid container spacing={2} sx={{ flexWrap: "nowrap", overflowX: "auto", pb: 1 }}>
        {statuses.map((status) => (
          <Grid key={status} sx={{ minWidth: 280, flex: "0 0 280px" }}>
            <Card className="kanban-column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => update.mutate({ id: e.dataTransfer.getData("issueId"), status })}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>{issueStatusLabel(status)}</Typography>
                <Stack spacing={1}>
                  {filtered.filter((i) => i.status === status).map((issue) => (
                    <Card key={issue._id} draggable onDragStart={(e) => e.dataTransfer.setData("issueId", issue._id)} sx={{ cursor: "grab", border: "1px solid #dde3ea" }}>
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Typography variant="body2" fontWeight={800}>{issue.issueNumber}</Typography>
                        <Typography variant="body2">{issue.title}</Typography>
                        <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}><Chip size="small" label={issue.category} /><Chip size="small" label={issue.priority} /><Chip size="small" label={issue.assignee?.name ?? "Unassigned"} /></Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
