import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getSessionTokenFromCookieHeader } from "./auth";
import { authService } from "./services";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const sessionToken = getSessionTokenFromCookieHeader(req.headers.cookie);
  const session = sessionToken ? await authService.getSessionFromToken(sessionToken) : null;

  return {
    req,
    res,
    sessionToken,
    session: session
      ? {
          id: session.id,
          userId: session.userId,
          expiresAt: session.expiresAt,
        }
      : null,
    user: session?.user ?? null,
  };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
