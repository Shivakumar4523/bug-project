import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { crud } from "../api/client";
import { DataState } from "../components/DataState";
import { PageHeader } from "../components/PageHeader";

type Item = { _id: string; name: string; color?: string; description?: string; subject?: string; body?: string };

function SettingsForm({ template, onSubmit }: { template?: boolean; onSubmit: (data: unknown) => void }) {
  const { register, handleSubmit } = useForm({ defaultValues: template ? { name: "", subject: "", body: "" } : { name: "", color: "#0f62fe", description: "" } });
  return <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
    <TextField label="Name" {...register("name")} />
    {template ? <><TextField label="Subject" {...register("subject")} /><TextField label="Body" multiline minRows={5} {...register("body")} /></> : <><TextField label="Color" type="color" {...register("color")} /><TextField label="Description" multiline minRows={3} {...register("description")} /></>}
    <Button type="submit" variant="contained">Save</Button>
  </Stack>;
}

export function SettingsPage({ resource, title, template }: { resource: string; title: string; template?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const items = useQuery({ queryKey: [resource], queryFn: () => crud.list<Item>(resource) });
  const create = useMutation({ mutationFn: (data: unknown) => crud.create<Item>(resource, data), onSuccess: () => { qc.invalidateQueries({ queryKey: [resource] }); setOpen(false); } });
  const remove = useMutation({ mutationFn: (id: string) => crud.remove(resource, id), onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }) });
  if (items.isLoading || items.error) return <DataState loading={items.isLoading} error={items.error} />;
  return <>
    <PageHeader title={title} action="Create" onAction={() => setOpen(true)} />
    <Table size="small"><TableHead><TableRow>{(template ? ["Name", "Subject", "Body", "Actions"] : ["Name", "Color", "Description", "Actions"]).map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead><TableBody>{items.data!.map((item) => <TableRow key={item._id}><TableCell>{item.name}</TableCell><TableCell>{template ? item.subject : item.color}</TableCell><TableCell>{template ? item.body : item.description}</TableCell><TableCell><IconButton color="error" onClick={() => remove.mutate(item._id)}><DeleteIcon /></IconButton></TableCell></TableRow>)}</TableBody></Table>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Create {title}</DialogTitle><DialogContent><SettingsForm template={template} onSubmit={(data) => create.mutate(data)} /></DialogContent></Dialog>
  </>;
}
