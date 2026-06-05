import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, FormControlLabel, Stack, Switch, TextField } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { api, setCurrentUser } from "../api/client";
import { DataState } from "../components/DataState";
import { PageHeader } from "../components/PageHeader";
import type { User } from "../types";

type SmtpSettingsForm = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
};

function emptySmtpForm(): SmtpSettingsForm {
  return {
    enabled: false,
    host: "",
    port: 587,
    secure: false,
    user: "",
    password: "",
    fromName: ""
  };
}

function valuesFromUser(user?: User | null): SmtpSettingsForm {
  return {
    enabled: Boolean(user?.smtp?.enabled),
    host: user?.smtp?.host ?? "",
    port: user?.smtp?.port ?? 587,
    secure: Boolean(user?.smtp?.secure),
    user: user?.smtp?.user ?? user?.email ?? "",
    password: "",
    fromName: user?.smtp?.fromName ?? user?.name ?? ""
  };
}

export function AccountSettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["user-smtp-settings"], queryFn: () => api<User>("/users/me") });
  const { control, register, handleSubmit, reset } = useForm<SmtpSettingsForm>({ defaultValues: emptySmtpForm() });
  const save = useMutation({
    mutationFn: (data: SmtpSettingsForm) => {
      const smtp: Partial<SmtpSettingsForm> = { ...data };
      if (!smtp.password) delete smtp.password;
      return api<User>("/users/me/smtp", { method: "PUT", body: JSON.stringify({ smtp }) });
    },
    onSuccess: (user) => {
      reset(valuesFromUser(user));
      setCurrentUser(user);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    }
  });

  useEffect(() => {
    if (settings.data) reset(valuesFromUser(settings.data));
  }, [reset, settings.data]);

  if (settings.isLoading || settings.error) return <DataState loading={settings.isLoading} error={settings.error} />;

  return (
    <>
      <PageHeader title="Settings" />
      <Stack component="form" spacing={2} sx={{ maxWidth: 720 }} onSubmit={handleSubmit((data) => save.mutate(data))}>
        {save.isSuccess && <Alert severity="success">SMTP settings saved.</Alert>}
        {save.error && <Alert severity="error">{save.error instanceof Error ? save.error.message : "SMTP settings could not be saved"}</Alert>}
        <FormControlLabel
          control={<Controller name="enabled" control={control} render={({ field }) => <Switch checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />} />}
          label="SMTP sender"
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="SMTP Host" fullWidth {...register("host")} />
          <TextField label="Port" type="number" sx={{ width: { xs: "100%", sm: 140 } }} {...register("port", { valueAsNumber: true })} />
        </Stack>
        <FormControlLabel
          control={<Controller name="secure" control={control} render={({ field }) => <Switch checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />} />}
          label="SSL/TLS"
        />
        <TextField label="SMTP Username" {...register("user")} />
        <TextField label="SMTP Password" type="password" helperText={settings.data?.smtp?.hasPassword ? "Password saved. Enter a new password to replace it." : ""} {...register("password")} />
        <TextField label="From Name" {...register("fromName")} />
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={save.isPending} sx={{ alignSelf: "flex-start" }}>
          {save.isPending ? "Saving..." : "Save SMTP Settings"}
        </Button>
      </Stack>
    </>
  );
}
