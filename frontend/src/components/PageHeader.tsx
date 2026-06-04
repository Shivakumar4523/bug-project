import type { ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export function PageHeader({ title, action, onAction, actions }: { title: string; action?: string; onAction?: () => void; actions?: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
      <Typography variant="h4">{title}</Typography>
      {actions ?? (action && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAction}>
          {action}
        </Button>
      ))}
    </Box>
  );
}
