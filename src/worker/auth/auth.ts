import { createRemoteJWKSet, jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";

export interface AuthEnv { AUTH0_DOMAIN?: string; AUTH0_AUDIENCE?: string; AUTH_MODE?: string }

/** API authorization is enforced independently of the protected React route. */
export function requireAuthentication(): MiddlewareHandler<{ Bindings: AuthEnv }> {
  return async (context, next) => {
    if (context.env.AUTH_MODE === "demo") return next();
    const domain = context.env.AUTH0_DOMAIN;
    const audience = context.env.AUTH0_AUDIENCE;
    const header = context.req.header("authorization");
    if (!domain || !audience || !header?.startsWith("Bearer ")) {
      return context.json({ error: "Authentication required" }, 401);
    }
    try {
      const issuer = `https://${domain}/`;
      await jwtVerify(header.slice(7), createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`)), { issuer, audience });
      return next();
    } catch {
      return context.json({ error: "Invalid or expired access token" }, 401);
    }
  };
}
