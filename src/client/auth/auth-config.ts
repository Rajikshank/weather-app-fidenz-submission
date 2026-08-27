/**
 * Persist Auth0's SDK session across normal browser reloads.
 *
 * Keeping this value outside the React component makes the security-sensitive
 * choice independently testable without importing JSX into the unit suite.
 */
export const AUTH0_SESSION_CACHE = "localstorage" as const;

/** A missing or misspelled mode must retain production authentication. */
export const resolveAuthMode = (value: string | undefined) => value === "demo" ? "demo" : "auth0";
