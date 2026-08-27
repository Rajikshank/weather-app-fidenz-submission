import { useAuthSession } from "./auth/auth-context";
import { OcuLoader } from "./components/OcuLoader";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";

/** Keeps authentication routing deliberately small: loading, signed out, or dashboard. */
export function App() {
  const auth = useAuthSession();
  if (auth.isLoading) return <OcuLoader message="Verifying your secure session…" phase="auth" />;
  if (!auth.isAuthenticated) return <LoginPage />;
  return <DashboardPage />;
}
