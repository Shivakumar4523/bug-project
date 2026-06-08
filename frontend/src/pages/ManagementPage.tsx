import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Avatar, AvatarGroup, Badge, Box, Chip, Divider, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import GroupsIcon from "@mui/icons-material/Groups";
import MoodIcon from "@mui/icons-material/Mood";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import TagIcon from "@mui/icons-material/Tag";
import { api, crud, currentUser } from "../api/client";
import { DataState } from "../components/DataState";
import { PageHeader } from "../components/PageHeader";
import type { Project, User } from "../types";

type Conversation = {
  id: string;
  kind: "direct" | "project";
  targetId: string;
  name: string;
  subtitle: string;
  label: string;
  participants: User[];
  preview: string;
};

type ChatMessage = {
  _id: string;
  body: string;
  sender: User;
  createdAt: string;
};

function entityId(entity?: { _id?: string; id?: string } | string | null) {
  if (!entity) return "";
  return typeof entity === "string" ? entity : entity._id ?? entity.id ?? "";
}

function initials(name?: string) {
  return String(name ?? "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function messageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function conversationsFrom(users: User[], projects: Project[], currentUserId: string): Conversation[] {
  const direct = users
    .filter((user) => entityId(user) && entityId(user) !== currentUserId)
    .map((user) => ({
      id: `direct:${entityId(user)}`,
      kind: "direct" as const,
      targetId: entityId(user),
      name: user.name,
      subtitle: user.role,
      label: "direct",
      participants: [user],
      preview: user.department || user.email
    }));

  const projectChannels = projects.map((project) => {
    const members = (project.members ?? []).filter((member): member is User => typeof member !== "string");
    return {
      id: `project:${project._id}`,
      kind: "project" as const,
      targetId: project._id,
      name: project.name,
      subtitle: `${members.length || users.length} participants`,
      label: "project",
      participants: members.length ? members : users.slice(0, 5),
      preview: project.description || `${project.key} workspace channel`
    };
  });

  return [...projectChannels, ...direct];
}

export function ManagementPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState("");
  const [draft, setDraft] = useState("");
  const me = currentUser<User>();
  const currentUserId = entityId(me);
  const users = useQuery({ queryKey: ["users"], queryFn: () => crud.list<User>("users") });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => crud.list<Project>("projects") });

  const conversations = useMemo(
    () => conversationsFrom(users.data ?? [], projects.data ?? [], currentUserId),
    [currentUserId, projects.data, users.data]
  );
  const active = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0];
  const query = search.trim().toLowerCase();
  const visibleDirect = conversations.filter((conversation) => conversation.kind === "direct" && [conversation.name, conversation.preview, conversation.subtitle].some((value) => value.toLowerCase().includes(query)));
  const visibleProjects = conversations.filter((conversation) => conversation.kind === "project" && [conversation.name, conversation.preview, conversation.subtitle].some((value) => value.toLowerCase().includes(query)));

  const messages = useQuery({
    queryKey: ["management-chat", active?.id],
    queryFn: () => api<ChatMessage[]>(active!.kind === "project" ? `/chats/projects/${active!.targetId}` : `/chats/direct/${active!.targetId}`),
    enabled: Boolean(active)
  });

  const send = useMutation({
    mutationFn: (body: string) => api<ChatMessage>(active!.kind === "project" ? `/chats/projects/${active!.targetId}` : `/chats/direct/${active!.targetId}`, { method: "POST", body: JSON.stringify({ body }) }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["management-chat", active?.id] });
    }
  });

  const submitMessage = () => {
    const body = draft.trim();
    if (!body || !active || send.isPending) return;
    send.mutate(body);
  };

  if (users.isLoading || projects.isLoading || users.error || projects.error) {
    return <DataState loading={users.isLoading || projects.isLoading} error={users.error || projects.error} />;
  }

  return (
    <>
      <PageHeader title="Management Chat" />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "360px minmax(0, 1fr)" }, gap: 2, minHeight: { lg: "calc(100vh - 150px)" } }}>
        <Paper elevation={0} sx={{ border: "1px solid #dbe7f3", borderRadius: 2, p: 2.5, bgcolor: "#f6faff" }}>
          <Typography sx={{ fontSize: 12, fontWeight: 900, color: "primary.main", letterSpacing: 3 }}>REALTIME</Typography>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <ChatBubbleOutlineIcon color="primary" />
            <Typography variant="h5" fontWeight={900}>Chat</Typography>
          </Stack>
          <TextField
            fullWidth
            size="small"
            placeholder="Search users or projects"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
            sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "white" } }}
          />

          <Stack direction="row" justifyContent="space-between" sx={{ px: 0.5, mb: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: "text.secondary", letterSpacing: 3 }}>DIRECT MESSAGES</Typography>
            <Typography variant="caption" color="text.secondary">{visibleDirect.length}</Typography>
          </Stack>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {visibleDirect.map((conversation) => (
              <ConversationRow key={conversation.id} conversation={conversation} selected={active?.id === conversation.id} onClick={() => setActiveId(conversation.id)} />
            ))}
            {!visibleDirect.length && <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>No users found</Typography>}
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" justifyContent="space-between" sx={{ px: 0.5, mb: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: "text.secondary", letterSpacing: 3 }}>PROJECT TEAMS</Typography>
            <Typography variant="caption" color="text.secondary">{visibleProjects.length}</Typography>
          </Stack>
          <Stack spacing={1}>
            {visibleProjects.map((conversation) => (
              <ConversationRow key={conversation.id} conversation={conversation} selected={active?.id === conversation.id} onClick={() => setActiveId(conversation.id)} />
            ))}
            {!visibleProjects.length && <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>No projects found</Typography>}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ border: "1px solid #ccebdd", borderRadius: 2, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 640, bgcolor: "#f3fff7" }}>
          {active ? (
            <>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ px: 2.5, py: 2, bgcolor: "#e8f7e9", borderBottom: "1px solid #ccebdd" }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                  <Avatar sx={{ bgcolor: active.kind === "project" ? "#dcf7ff" : "#dce8ff", color: "primary.main", width: 48, height: 48 }}>
                    {active.kind === "project" ? <TagIcon /> : initials(active.name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="h6" fontWeight={900} noWrap>{active.name}</Typography>
                      <Chip size="small" label={active.label} color={active.kind === "project" ? "primary" : "default"} variant="outlined" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" noWrap>{active.subtitle} · Workspace channel</Typography>
                  </Box>
                </Stack>
                <AvatarGroup max={4}>
                  {active.participants.map((participant) => (
                    <Avatar key={entityId(participant) || participant.email} src={participant.profileImage}>{initials(participant.name)}</Avatar>
                  ))}
                </AvatarGroup>
              </Stack>

              <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, md: 3 }, bgcolor: "#f4fff7" }}>
                <Stack spacing={2.25}>
                  {messages.isLoading && <DataState loading />}
                  {messages.error && <DataState error={messages.error} />}
                  {!messages.isLoading && !messages.error && !messages.data?.length && (
                    <Typography align="center" color="text.secondary" sx={{ mt: 6 }}>No messages yet</Typography>
                  )}
                  {messages.data?.map((message) => {
                    const mine = entityId(message.sender) === currentUserId;
                    return <MessageBubble key={message._id} message={message} mine={mine} />;
                  })}
                </Stack>
              </Box>

              <Box sx={{ p: 2, bgcolor: "#f3fff7", borderTop: "1px solid #ccebdd" }}>
                <TextField
                  fullWidth
                  placeholder={active.kind === "project" ? "Message the team" : `Message ${active.name}`}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitMessage();
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconButton size="small" aria-label="Attach file"><AttachFileIcon /></IconButton>
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" aria-label="Insert emoji"><MoodIcon /></IconButton>
                        <IconButton color="primary" aria-label="Send message" onClick={submitMessage} disabled={!draft.trim() || send.isPending}>
                          <SendIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "white" } }}
                />
              </Box>
            </>
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ flex: 1 }}>
              <Typography color="text.secondary">Create users or projects to start chatting.</Typography>
            </Stack>
          )}
        </Paper>
      </Box>
    </>
  );
}

function ConversationRow({ conversation, selected, onClick }: { conversation: Conversation; selected: boolean; onClick: () => void }) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.25,
        borderRadius: 2,
        cursor: "pointer",
        color: selected ? "white" : "text.primary",
        bgcolor: selected ? "primary.main" : "rgba(255,255,255,0.55)",
        backgroundImage: selected ? "linear-gradient(90deg, #2d6cdf, #3fc6ed)" : "none",
        boxShadow: selected ? "0 12px 24px rgba(45,108,223,0.22)" : "none",
        border: selected ? "1px solid transparent" : "1px solid #e7eef7"
      }}
    >
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        variant={conversation.kind === "direct" ? "dot" : "standard"}
        color={conversation.kind === "direct" ? "success" : "primary"}
        badgeContent={conversation.kind === "project" ? conversation.participants.length : undefined}
      >
        <Avatar sx={{ bgcolor: selected ? "rgba(255,255,255,0.2)" : "#e4efff", color: selected ? "white" : "primary.main" }}>
          {conversation.kind === "project" ? <TagIcon /> : initials(conversation.name)}
        </Avatar>
      </Badge>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography fontWeight={800} noWrap>{conversation.name}</Typography>
        <Typography variant="body2" color={selected ? "rgba(255,255,255,0.86)" : "text.secondary"} noWrap>{conversation.preview}</Typography>
      </Box>
    </Box>
  );
}

function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <Stack direction="row" justifyContent={mine ? "flex-end" : "flex-start"} spacing={1.25} alignItems="flex-end">
      {!mine && <Avatar sx={{ width: 34, height: 34, bgcolor: "#dce8ff", color: "primary.main" }}>{initials(message.sender?.name)}</Avatar>}
      <Box sx={{ maxWidth: { xs: "82%", md: "68%" } }}>
        {!mine && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2" fontWeight={800}>{message.sender?.name ?? "User"}</Typography>
            {message.sender?.role && <Chip size="small" label={message.sender.role} variant="outlined" />}
          </Stack>
        )}
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            bgcolor: mine ? "primary.main" : "white",
            color: mine ? "primary.contrastText" : "text.primary",
            border: mine ? "none" : "1px solid #ccebdd",
            boxShadow: "0 10px 24px rgba(44, 88, 64, 0.08)"
          }}
        >
          <Typography>{message.body}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, textAlign: mine ? "right" : "left" }}>
          {messageTime(message.createdAt)}
        </Typography>
      </Box>
    </Stack>
  );
}
