import { createContext, useContext } from "react";

/** Authentication surface consumed by the UI in both Auth0 and deterministic demo modes. */
export interface AuthSession {
  isAuthenticated: boolean;
  isLoading: boolean;
  userName: string;
  userEmail: string;
  login: () => Promise<void>;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
}

export const AuthSessionContext = createContext<AuthSession | null>(null);

/** Failing fast here prevents pages from silently rendering outside AuthRoot. */
export function useAuthSession() {
  const value = useContext(AuthSessionContext);
  if (!value) throw new Error("useAuthSession must be used within AuthRoot");
  return value;
}
