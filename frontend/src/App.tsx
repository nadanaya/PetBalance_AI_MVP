import { AuthProvider, useAuth } from "./state/auth";
import { SessionProvider } from "./state/session";
import { AuthGate } from "./components/AuthGate";
import { AppShell } from "./components/AppShell";

function Gate() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="auth-wrap">
        <div className="skeleton" style={{ width: 320, height: 180 }} />
      </div>
    );
  if (!user) return <AuthGate />;
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
