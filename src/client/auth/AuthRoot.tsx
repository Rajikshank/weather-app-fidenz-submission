import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { useMemo, useState, type ReactNode } from "react";
import { AuthSessionContext, type AuthSession } from "./auth-context";
import { AUTH0_SESSION_CACHE, resolveAuthMode } from "./auth-config";

const authMode = resolveAuthMode(import.meta.env.VITE_AUTH_MODE);

function DemoAuth({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(() => sessionStorage.getItem("ocu-demo-session") === "active");
  const value = useMemo<AuthSession>(() => ({
    isAuthenticated,
    isLoading: false,
    userName: "Demo User",
    userEmail: "demo@ocucomfort.local",
    login: async () => { sessionStorage.setItem("ocu-demo-session", "active"); setAuthenticated(true); },
    logout: () => { sessionStorage.removeItem("ocu-demo-session"); setAuthenticated(false); },
    getAccessToken: async () => "demo-token",
  }), [isAuthenticated]);
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

function Auth0Session({ children }: { children: ReactNode }) {
  const auth = useAuth0();
  const value = useMemo<AuthSession>(() => ({
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    userName: auth.user?.name ?? "Authenticated user",
    userEmail: auth.user?.email ?? "",
    login: async () => auth.loginWithRedirect({ authorizationParams: { screen_hint: "login" } }),
    logout: () => auth.logout({ logoutParams: { returnTo: window.location.origin } }),
    getAccessToken: async () => auth.getAccessTokenSilently(),
  }), [auth]);
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

/** Demo auth exists only for reproducible local review; production uses Auth0 PKCE. */
export function AuthRoot({ children }: { children: ReactNode }) {
  if (authMode === "demo") return <DemoAuth>{children}</DemoAuth>;
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{ redirect_uri: window.location.origin, audience: import.meta.env.VITE_AUTH0_AUDIENCE }}
      // Persistence avoids returning authenticated users to the login screen on a
      // normal refresh. The security trade-off is documented in the README.
      cacheLocation={AUTH0_SESSION_CACHE}
      useRefreshTokens
      useRefreshTokensFallback
    >
      <Auth0Session>{children}</Auth0Session>
    </Auth0Provider>
  );
}
