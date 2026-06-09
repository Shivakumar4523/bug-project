import { useForm, useWatch } from "react-hook-form";
import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Divider
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AssignmentIcon from "@mui/icons-material/Assignment";
import type { Issue, IssueCategory, IssueStatus, Project, ModulePage, User } from "../types";

const taskPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const taskStatuses: IssueStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "FIXED", "CLOSED"];
const categories: IssueCategory[] = [
  "UI Bug", "Backend Bug", "API Bug", "Database Bug",
  "Performance Bug", "Security Bug", "Mobile Bug", "Enhancement Request"
];
const modulePages: ModulePage[] = [
  "Login Page", "Dashboard", "Reports", "User Management",
  "API", "Database", "Mobile UI", "Notifications", "Authentication", "Chat", "File Upload"
];

const priorityColors: Record<string, string> = {
  LOW: "#24a148",
  MEDIUM: "#0f62fe",
  HIGH: "#ff832b",
  CRITICAL: "#da1e28"
};

export function TaskForm({
  projects,
  users,
  initial,
  onSubmit
}: {
  projects: Project[];
  users: User[];
  initial?: Partial<Issue>;
  onSubmit: (data: unknown, screenshots: File[]) => void;
}) {
  const [screenshots, setScreenshots] = useState<File[]>([]);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    defaultValues: {
      type: "Task",
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      modulePage: initial?.modulePage ?? "",
      category: initial?.category ?? "",
      project: initial?.project?._id ?? projects[0]?._id ?? "",
      assignee: initial?.assignee?._id ?? "",
      priority: initial?.priority ?? "MEDIUM",
      status: initial?.status ?? "OPEN",
      dueDate: initial?.dueDate?.slice(0, 10) ?? ""
    }
  });

  const selectedProjectId = useWatch({ control, name: "project" });
  const selectedPriority = watch("priority");
  const selectedProject = projects.find(p => p._id === selectedProjectId);
  const projectMembers = selectedProject?.members ?? [];
  const projectMemberIds = new Set(projectMembers.map(m => typeof m === "string" ? m : m._id ?? m.id));
  const availableDevs = users.filter(u => projectMemberIds.has(u._id ?? u.id));

  return (
    <Box component="form" onSubmit={handleSubmit((data) => {
      const payload = {
        ...data,
        type: "Task"
      };
      if (!payload.assignee) delete payload.assignee;
      if (!payload.dueDate) delete payload.dueDate;
      onSubmit(payload, screenshots);
    })}>
      <Stack spacing={2.5} sx={{ pt: 1 }}>

        {/* Task Header Badge */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <AssignmentIcon color="primary" fontSize="small" />
          <Chip
            label="Task"
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700 }}
          />
          <Typography variant="caption" color="text.secondary">
            Admin Task Management
          </Typography>
        </Stack>

        <Divider />

        {/* Task Title */}
        <TextField
          label="Task Title *"
          fullWidth
          error={Boolean(errors.title)}
          helperText={errors.title ? "Title is required" : undefined}
          {...register("title", { required: true })}
        />

        {/* Task Requirements / Description */}
        <TextField
          label="Task Requirements"
          multiline
          minRows={4}
          fullWidth
          placeholder="Describe the task requirements, acceptance criteria, and any relevant context..."
          {...register("description")}
        />

        {/* Module / Page */}
        <TextField
          select
          label="Module / Page *"
          fullWidth
          error={Boolean(errors.modulePage)}
          helperText={errors.modulePage ? "Please select a module/page" : undefined}
          {...register("modulePage", { required: true })}
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="">Select module/page</MenuItem>
          {modulePages.map((mp) => (
            <MenuItem key={mp} value={mp}>{mp}</MenuItem>
          ))}
        </TextField>

        {/* Category */}
        <TextField
          select
          label="Category *"
          fullWidth
          error={Boolean(errors.category)}
          helperText={errors.category ? "Please select a category" : undefined}
          {...register("category", { required: true })}
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="">Select category</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </TextField>

        {/* Project & Priority row */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Project *"
            fullWidth
            error={Boolean(errors.project)}
            {...register("project", { required: true })}
          >
            {projects.map((p) => (
              <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Priority"
            fullWidth
            {...register("priority")}
            SelectProps={{
              renderValue: (val) => (
                <Chip
                  label={String(val)}
                  size="small"
                  sx={{
                    bgcolor: priorityColors[String(val)] ?? "#525252",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 11
                  }}
                />
              )
            }}
          >
            {taskPriorities.map((p) => (
              <MenuItem key={p} value={p}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: priorityColors[p] }} />
                  <span>{p}</span>
                </Stack>
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* Suggested Developer & Status row */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Suggested Developer"
            fullWidth
            {...register("assignee")}
          >
            <MenuItem value="">Unassigned</MenuItem>
            {availableDevs.length > 0
              ? availableDevs.map((u) => (
                  <MenuItem key={u._id ?? u.id} value={u._id ?? u.id}>{u.name}</MenuItem>
                ))
              : <MenuItem disabled>No members in this project</MenuItem>
            }
          </TextField>

          <TextField
            select
            label="Status"
            fullWidth
            {...register("status")}
          >
            {taskStatuses.map((s) => (
              <MenuItem key={s} value={s}>{s.replace(/_/g, " ")}</MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* Due Date */}
        <TextField
          label="Due Date"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          {...register("dueDate")}
        />

        {/* Screenshots */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            component="label"
            startIcon={<AttachFileIcon />}
            variant="outlined"
            size="small"
          >
            Attach Screenshots
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg"
              multiple
              onChange={(e) => setScreenshots(Array.from(e.target.files ?? []).slice(0, 5))}
            />
          </Button>
          <Typography variant="caption" color="text.secondary">
            {screenshots.length
              ? `${screenshots.length} screenshot(s) selected`
              : "Max 5 screenshots. PNG or JPG."}
          </Typography>
        </Stack>

        <Divider />

        {/* Submit */}
        <Button
          variant="contained"
          type="submit"
          size="large"
          startIcon={<AssignmentIcon />}
          sx={{ fontWeight: 700 }}
        >
          {initial?._id ? "Update Task" : "Create Task"}
        </Button>
      </Stack>
    </Box>
  );
}
