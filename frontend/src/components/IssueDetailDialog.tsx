import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Chip, Dialog, DialogContent, DialogTitle, Divider, Stack, Typography } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SendIcon from "@mui/icons-material/Send";
import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { DataState } from "./DataState";
import type { Issue, Role, User } from "../types";
import { issueStatusLabel } from "../utils/issues";

type Comment = { _id: string; body: string; author: User; attachments?: string[]; createdAt: string };

export function IssueDetailDialog({
  issue,
  open,
  currentUserRole,
  onClose,
  onIssuePatched
}: {
  issue: Issue | null;
  open: boolean;
  currentUserRole?: Role;
  onClose: () => void;
  onIssuePatched?: (patch: Partial<Issue>) => void;
}) {
  const qc = useQueryClient();
  const editor = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [issueFiles, setIssueFiles] = useState<FileList | null>(null);
  const canUploadIssueAttachments = currentUserRole === "Tester";
  useEffect(() => {
    setFiles(null);
    setIssueFiles(null);
  }, [issue?._id, open]);

  const comments = useQuery({
    queryKey: ["comments", issue?._id],
    queryFn: () => api<Comment[]>(`/issues/${issue!._id}/comments`),
    enabled: Boolean(issue?._id && open)
  });
  const addComment = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("body", editor.current?.innerHTML ?? "");
      if (files) Array.from(files).forEach((file) => form.append("files", file));
      return api<Comment>(`/issues/${issue!._id}/comments`, { method: "POST", body: form });
    },
    onSuccess: () => {
      if (editor.current) editor.current.innerHTML = "";
      setFiles(null);
      qc.invalidateQueries({ queryKey: ["comments", issue?._id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
  const uploadIssueAttachments = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      if (issueFiles) Array.from(issueFiles).forEach((file) => form.append("files", file));
      return api<Issue>(`/issues/${issue!._id}/uploads`, { method: "POST", body: form });
    },
    onSuccess: (updated) => {
      setIssueFiles(null);
      onIssuePatched?.({ attachments: updated.attachments, updatedAt: updated.updatedAt });
      qc.invalidateQueries({ queryKey: ["issues"] });
    }
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{issue?.issueNumber} · {issue?.title}</DialogTitle>
      <DialogContent>
        {!issue ? null : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={issueStatusLabel(issue.status, currentUserRole)} />
              <Chip label={issue.category} />
              <Chip label={issue.priority} color={issue.priority === "CRITICAL" ? "error" : "default"} />
              <Chip label={issue.assignee?.name ?? "Unassigned"} />
              <Chip label={issue.project?.name} />
            </Stack>
            <Box sx={{ bgcolor: "#f5f5f5", p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>Description</Typography>
              <Typography color="text.secondary">{issue.description || "No description provided."}</Typography>
            </Box>
            {(canUploadIssueAttachments || issue.attachments?.length) && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Screenshots & Attachments</Typography>
                {issue.attachments?.length ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: canUploadIssueAttachments ? 1 : 0 }}>
                    {issue.attachments.map((file) => <Button key={file} size="small" startIcon={<AttachFileIcon />} href={file} target="_blank">{file.split("/").pop()}</Button>)}
                  </Stack>
                ) : null}
                {canUploadIssueAttachments && (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                    <Button component="label" startIcon={<AttachFileIcon />} variant="outlined">
                      Attach files
                      <input hidden type="file" multiple onChange={(e) => setIssueFiles(e.target.files)} />
                    </Button>
                    <Typography variant="body2" color="text.secondary">{issueFiles?.length ? `${issueFiles.length} file(s) selected` : "PNG, JPG, PDF, DOCX, ZIP"}</Typography>
                    <Box sx={{ flex: 1 }} />
                    <Button
                      variant="contained"
                      startIcon={<CloudUploadIcon />}
                      disabled={!issueFiles?.length || uploadIssueAttachments.isPending}
                      onClick={() => uploadIssueAttachments.mutate()}
                    >
                      Upload
                    </Button>
                  </Stack>
                )}
              </Box>
            )}
            <Divider />
            <Typography variant="h6">Activity Timeline</Typography>
            {comments.isLoading || comments.error ? <DataState loading={comments.isLoading} error={comments.error} /> : (
              <Stack spacing={1.5}>
                {comments.data!.map((comment) => (
                  <Box key={comment._id} sx={{ borderLeft: "3px solid #0f62fe", pl: 2 }}>
                    <Typography variant="body2" fontWeight={800}>{comment.author?.name ?? "User"} · {new Date(comment.createdAt).toLocaleString()}</Typography>
                    <Typography component="div" variant="body2" dangerouslySetInnerHTML={{ __html: comment.body }} />
                    {comment.attachments?.map((file) => <Button key={file} size="small" startIcon={<AttachFileIcon />} href={file} target="_blank">{file.split("/").pop()}</Button>)}
                  </Box>
                ))}
              </Stack>
            )}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Comment</Typography>
              <div className="rich-editor" contentEditable ref={editor} data-placeholder="Write a comment. Mention teammates with @name." />
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button component="label" startIcon={<AttachFileIcon />} variant="outlined">
                Attach
                <input hidden type="file" multiple onChange={(e) => setFiles(e.target.files)} />
              </Button>
              <Typography variant="body2" color="text.secondary">{files?.length ? `${files.length} file(s) selected` : "PNG, JPG, PDF, DOCX, ZIP"}</Typography>
              <Box sx={{ flex: 1 }} />
              <Button variant="contained" endIcon={<SendIcon />} onClick={() => addComment.mutate()}>Add Comment</Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
