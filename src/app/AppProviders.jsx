import { CssBaseline, ThemeProvider } from "@mui/material";
import { AuthProvider } from "@/shared/context/AuthContext";
import FileSelectionProvider from "@/shared/context/FileSelectionProvider";
import theme from "@/styles/theme";

export default function AppProviders({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <FileSelectionProvider>{children}</FileSelectionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
