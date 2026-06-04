import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0f62fe" },
    secondary: { main: "#24a148" },
    warning: { main: "#f1c21b" },
    error: { main: "#da1e28" },
    background: { default: "#f6f8fb", paper: "#ffffff" },
    text: { primary: "#161616", secondary: "#525252" }
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: ["Inter", "Segoe UI", "Arial", "sans-serif"].join(","),
    h4: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 }
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 6 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" } } }
  }
});
