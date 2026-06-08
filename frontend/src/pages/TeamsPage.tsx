import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { crud } from "../api/client";
import { DataState } from "../components/DataState";
import { PageHeader } from "../components/PageHeader";
import type { User } from "../types";

type UserReference = User | string;
type Team = { _id: string; name: string; description?: string; lead?: UserReference; members?: UserReference[] };

type TeamFormData = {
  name: string;
  description: string;
  lead: string;
  members: string[];
};

function entityId(value?: UserReference | null) {
  if (!value) return "";
  return typeof value === "string" ? value : value._id ?? value.id ?? "";
}

function entityName(value: UserReference | undefined | null, users: User[]) {
  if (!value) return "";
  if (typeof value !== "string") return value.name;
  return users.find((user) => (user._id ?? user.id) === value)?.name ?? "";
}

function valuesFromTeam(team?: Team | null): TeamFormData {
  if (!team) return { name: "", description: "", lead: "", members: [] };
  return {
    name: team.name,
    description: team.description ?? "",
    lead: entityId(team.lead),
    members: team.members?.map(entityId).filter(Boolean) ?? []
  };
}

function TeamForm({ team, users, onCancel, onSubmit }: { team?: Team | null; users: User[]; onCancel: () => void; onSubmit: (data: TeamFormData) => void }) {
  const { control, register, handleSubmit, reset } = useForm<TeamFormData>({ defaultValues: valuesFromTeam(team) });

  useEffect(() => {
    reset(valuesFromTeam(team));
  }, [reset, team]);

  return <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
    <TextField label="Team Name" {...register("name")} />
    <TextField label="Description" multiline minRows={3} {...register("description")} />
    <Controller
      control={control}
      name="lead"
      render={({ field }) => (
        <TextField select label="Lead" {...field} value={field.value ?? ""}><MenuItem value="">No lead</MenuItem>{users.map((u) => <MenuItem key={u._id ?? u.id} value={u._id ?? u.id}>{u.name}</MenuItem>)}</TextField>
      )}
    />
    <Controller
      control={control}
      name="members"
      render={({ field }) => (
        <TextField select SelectProps={{ multiple: true }} label="Members" {...field} value={field.value ?? []}>{users.map((u) => <MenuItem key={u._id ?? u.id} value={u._id ?? u.id}>{u.name}</MenuItem>)}</TextField>
      )}
    />
    <DialogActions sx={{ px: 0 }}>
      <Button onClick={onCancel}>Cancel</Button>
      <Button type="submit" variant="contained">Save Team</Button>
    </DialogActions>
  </Stack>;
}

export function TeamsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const teams = useQuery({ queryKey: ["teams"], queryFn: () => crud.list<Team>("teams") });
  const users = useQuery({ queryKey: ["users"], queryFn: () => crud.list<User>("users") });
  const create = useMutation({ mutationFn: (data: unknown) => crud.create<Team>("teams", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["teams"] }); setOpen(false); } });
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: unknown }) => crud.update<Team>("teams", id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["teams"] }); setEditingTeam(null); } });
  const remove = useMutation({ mutationFn: (id: string) => crud.remove("teams", id), onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }) });
  if (teams.isLoading || users.isLoading || teams.error || users.error) return <DataState loading={teams.isLoading || users.isLoading} error={teams.error || users.error} />;
  return <>
    <PageHeader title="Teams" action="Create Team" onAction={() => setOpen(true)} />
    <TableContainer sx={{ overflowX: "auto" }}><Table size="small"><TableHead><TableRow>{["Team Name", "Description", "Lead", "Members", "Actions"].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead><TableBody>{teams.data!.map((t) => <TableRow key={t._id}><TableCell>{t.name}</TableCell><TableCell>{t.description}</TableCell><TableCell>{entityName(t.lead, users.data!)}</TableCell><TableCell>{t.members?.length ?? 0}</TableCell><TableCell><IconButton color="primary" aria-label="Edit team" onClick={() => setEditingTeam(t)}><EditIcon /></IconButton><IconButton color="error" aria-label="Delete team" onClick={() => remove.mutate(t._id)}><DeleteIcon /></IconButton></TableCell></TableRow>)}</TableBody></Table></TableContainer>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Create Team</DialogTitle><DialogContent><TeamForm users={users.data!} onCancel={() => setOpen(false)} onSubmit={(data) => create.mutate(data)} /></DialogContent></Dialog>
    <Dialog open={Boolean(editingTeam)} onClose={() => setEditingTeam(null)} fullWidth maxWidth="sm"><DialogTitle>Edit Team</DialogTitle><DialogContent><TeamForm team={editingTeam} users={users.data!} onCancel={() => setEditingTeam(null)} onSubmit={(data) => update.mutate({ id: editingTeam!._id, data })} /></DialogContent></Dialog>
  </>;
}
