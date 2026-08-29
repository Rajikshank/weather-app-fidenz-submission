// These checks make refresh persistence explicit and ensure demo mode cannot
// be enabled by a typo or missing production setting.
import { AUTH0_SESSION_CACHE, resolveAuthMode } from "../../src/client/auth/auth-config";

describe("Auth0 session configuration", () => {
  it("persists the SDK session across a normal browser refresh", () => {
    expect(AUTH0_SESSION_CACHE).toBe("localstorage");
  });

  it("enables demo authentication only when it is selected explicitly", () => {
    expect(resolveAuthMode("demo")).toBe("demo");
    expect(resolveAuthMode("auth0")).toBe("auth0");
    expect(resolveAuthMode(undefined)).toBe("auth0");
    expect(resolveAuthMode("typo")).toBe("auth0");
  });
});
