import { Card, CardContent, Stack, Box, Typography, SvgIconProps } from "@mui/material";
import { ReactElement } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactElement<SvgIconProps>;
  color?: string;
  variant?: "default" | "plain";
}

export function StatCard({ label, value, icon, color = "#525252", variant = "default" }: StatCardProps) {
  const isPlain = variant === "plain";

  return (
    <Card
      sx={{
        position: "relative",
        overflow: "hidden",
        height: "100%",
        minHeight: 160,
        borderRadius: "8px",
        boxShadow: "0 1px 3px 0 rgb(15 23 42 / 0.1), 0 1px 2px -1px rgb(15 23 42 / 0.1)",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "#fff",
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: isPlain ? 0 : "5px",
          backgroundColor: color,
        }
      }}
    >
      <CardContent sx={{ height: "100%", py: "28px !important", px: 3 }}>
        <Stack
          direction="row"
          justifyContent={isPlain ? "flex-start" : "space-between"}
          alignItems={isPlain ? "flex-start" : "center"}
          spacing={2}
          sx={{ height: "100%" }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body1"
              sx={{
                color: isPlain ? "#3f3f46" : "#26364a",
                fontWeight: isPlain ? 400 : 600,
                fontSize: isPlain ? { xs: 22, md: 24 } : undefined,
                lineHeight: 1.3,
                mb: isPlain ? 1.2 : 1,
                overflowWrap: "anywhere"
              }}
            >
              {label}
            </Typography>
            <Typography variant="h3" sx={{ fontSize: { xs: 42, md: 50 }, lineHeight: 1, fontWeight: 900, color: isPlain ? "#111" : "#0f172a" }}>
              {value}
            </Typography>
          </Box>
          {!isPlain && icon && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto",
                width: 70,
                "& svg": {
                  fontSize: 64,
                  color,
                  opacity: 0.9
                }
              }}
            >
              {icon}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
