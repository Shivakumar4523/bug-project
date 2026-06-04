import { Alert, Box, CircularProgress } from "@mui/material";

export function DataState({ loading, error }: { loading?: boolean; error?: unknown }) {
  if (loading) return <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error instanceof Error ? error.message : "Something went wrong"}</Alert>;
  return null;
}
