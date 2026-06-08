import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Card, CardContent, Chip, Grid2 as Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { api, crud, currentUser } from "../api/client";
import { DataState } from "../components/DataState";
import { IssueDetailDialog } from "../components/IssueDetailDialog";
import { PageHeader } from "../components/PageHeader";
import type { Issue, IssueStatus, Project, Role, User } from "../types";
import { issueStatusLabel } from "../utils/issues";

const statuses: IssueStatus[] = ["BUG_BUCKET", "ASSIGNED", "IN_PROGRESS", "FIXED", "READY_FOR_TESTING", "REOPENED", "CLOSED"];
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const categories = ["UI Bug", "Backend Bug", "API Bug", "Database Bug", "Performance Bug", "Security Bug", "Mobile Bug", "Enhancement Request"];

function KanbanCard({ issue, role, onDragStart }: { issue: Issue; role?: Role; onDragStart: (e: React.DragEvent) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card
        draggable
        onDragStart={onDragStart}
        onClick={() => setOpen(true)}
        sx={{
          cursor: "pointer",
          border: "1px solid #dde3ea",
          transition: "box-shadow 0.15s, transform 0.1s",
          "&:hover": {
            boxShadow: "0 4px 16px rgba(15,98,254,0.13)",
            transform: "translateY(-2px)",
            borderColor: "#0f62fe"
          }
        }}
      >
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography variant="body2" fontWeight={800}>{issue.issueNumber}</Typography>
          <Typography variant="body2">{issue.title}</Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
            <Chip size="small" label={issue.category} />
            <Chip size="small" label={issue.priority} />
            <Chip size="small" label={issue.assignee?.name ?? "Unassigned"} />
          </Box>
        </CardContent>
      </Card>
      <IssueDetailDialog
        issue={issue}
        open={open}
        currentUserRole={role}
        onClose={() => setOpen(false)}
        onIssuePatched={() => qc.invalidateQueries({ queryKey: ["issues"] })}
      />
    </>
  );
}

export function KanbanPage() {
  const qc = useQueryClient();
  const me = currentUser<User>();
  const [filters, setFilters] = useState({ project: "", assignee: "", priority: "", category: "" });
  const issues = useQuery({ queryKey: ["issues", "kanban"], queryFn: () => api<Issue[]>("/issues") });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => crud.list<Project>("projects") });
  const users = useQuery({ queryKey: ["users"], queryFn: () => crud.list<User>("users") });
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => crud.update<Issue>("issues", id, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }) });
  if (issues.isPending || projects.isPending || users.isPending || issues.error || projects.error || users.error) return <DataState loading={issues.isPending || projects.isPending || users.isPending} error={issues.error || projects.error || users.error} />;
  const filtered = issues.data!.filter((i) => (!filters.project || i.project?._id === filters.project) && (!filters.assignee || i.assignee?._id === filters.assignee) && (!filters.priority || i.priority === filters.priority) && (!filters.category || i.category === filters.category));

  return (
    <>
      <PageHeader title="Kanban Board" />
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField select size="small" label="Project" value={filters.project} onChange={(e) => setFilters({ ...filters, project: e.target.value })} sx={{ minWidth: 220 }}><MenuItem value="">All Projects</MenuItem>{projects.data!.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}</TextField>
        <TextField select size="small" label="Assignee" value={filters.assignee} onChange={(e) => setFilters({ ...filters, assignee: e.target.value })} sx={{ minWidth: 220 }}><MenuItem value="">All Assignees</MenuItem>{users.data!.map((u) => <MenuItem key={u._id ?? u.id} value={u._id ?? u.id}>{u.name}</MenuItem>)}</TextField>
        <TextField select size="small" label="Priority" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} sx={{ minWidth: 180 }}><MenuItem value="">All Priorities</MenuItem>{priorities.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField>
        <TextField select size="small" label="Category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} sx={{ minWidth: 200 }}><MenuItem value="">All Categories</MenuItem>{categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
      </Stack>
      <Grid container spacing={2} sx={{ flexWrap: "nowrap", overflowX: "auto", pb: 1 }}>
        {statuses.map((status) => (
          <Grid key={status} sx={{ minWidth: 280, flex: "0 0 280px" }}>
            <Card className="kanban-column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => update.mutate({ id: e.dataTransfer.getData("issueId"), status })}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>{issueStatusLabel(status, me?.role)}</Typography>
                <Stack spacing={1}>
                  {filtered.filter((i) => i.status === status).map((issue) => (
                    <KanbanCard key={issue._id} issue={issue} role={me?.role} onDragStart={(e) => e.dataTransfer.setData("issueId", issue._id)} />
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
