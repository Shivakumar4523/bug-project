import { Card, CardContent, Stack, Box, Typography, SvgIconProps } from "@mui/material";
import { ReactElement } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactElement<SvgIconProps>;
  color: string;
}

export function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <Card
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "8px",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        border: "1px solid",
        borderColor: "divider",
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "5px",
          backgroundColor: color,
        }
      }}
    >
      <CardContent sx={{ py: "28px !important", px: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body1" sx={{ color: "#374151", fontWeight: 500, mb: 0.5 }}>
              {label}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#111827" }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "& svg": {
              fontSize: 52,
              color: color,
              opacity: 0.9
            }
          }}>
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
