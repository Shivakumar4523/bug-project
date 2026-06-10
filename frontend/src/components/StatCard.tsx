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
          width: "5px",
          backgroundColor: color,
        }
      }}
    >
      <CardContent sx={{ height: "100%", py: "28px !important", px: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ height: "100%" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body1"
              sx={{
                color: "#26364a",
                fontWeight: 600,
                lineHeight: 1.3,
                mb: 1,
                overflowWrap: "anywhere"
              }}
            >
              {label}
            </Typography>
            <Typography variant="h3" sx={{ fontSize: { xs: 40, md: 44 }, lineHeight: 1, fontWeight: 900, color: "#0f172a" }}>
              {value}
            </Typography>
          </Box>
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
        </Stack>
      </CardContent>
    </Card>
  );
}
