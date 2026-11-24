import { AuthProvider } from "@/shared/context/AuthContext";
import FileSelectionProvider from "@/shared/context/FileSelectionProvider";

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <FileSelectionProvider>{children}</FileSelectionProvider>
    </AuthProvider>
  );
}
