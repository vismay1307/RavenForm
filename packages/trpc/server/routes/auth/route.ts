import { z, zodUndefinedModel } from "../../schema";
import { TRPCError } from "@trpc/server";
import {
  createExpiredSessionCookie,
  createSessionCookie,
} from "../../auth";
import { authService, userService } from "../../services";
import { AuthServiceError } from "@repo/services/auth";
import { getAuthenticationMethodOutputSchema } from "@repo/services/user/model";
import { protectedProcedure, publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");
const authUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.email(),
  createdAt: z.date(),
});
const registerInputSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(128),
});
const verifyOtpInputSchema = z.object({
  email: z.email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits."),
});
const loginInputSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});
const requestPasswordResetInputSchema = z.object({
  email: z.email(),
});
const resetPasswordInputSchema = z.object({
  email: z.email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits."),
  password: z.string().min(8).max(128),
});
const emptyInputSchema = z.object({});
const otpDispatchSchema = z.object({
  email: z.email(),
  expiresInSeconds: z.number().int().positive(),
});

function rethrowAuthError(error: unknown): never {
  if (error instanceof AuthServiceError) {
    throw new TRPCError({
      code: error.code,
      message: error.message,
    });
  }

  throw error;
}

export const authRouter = router({
  getSupportedAuthenticationProviders: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/supported-providers"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(z.readonly(z.array(getAuthenticationMethodOutputSchema)))
    .query(async () => {
      const supportedMethods = await userService.getAuthenticationMethods();
      return supportedMethods;
    }),
  register: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/register"), tags: TAGS } })
    .input(registerInputSchema)
    .output(otpDispatchSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await authService.startRegistration(input);
      } catch (error) {
        rethrowAuthError(error);
      }
    }),
  verifyRegistration: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/verify-registration"), tags: TAGS } })
    .input(verifyOtpInputSchema)
    .output(authUserSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await authService.verifyRegistration(input);
        const { sessionToken, session } = await authService.createSession(user.id);

        ctx.res.append("Set-Cookie", createSessionCookie(sessionToken, session.expiresAt));

        return user;
      } catch (error) {
        rethrowAuthError(error);
      }
    }),
  login: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/login"), tags: TAGS } })
    .input(loginInputSchema)
    .output(authUserSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await authService.login(input);
        const { sessionToken, session } = await authService.createSession(user.id);

        ctx.res.append("Set-Cookie", createSessionCookie(sessionToken, session.expiresAt));

        return user;
      } catch (error) {
        rethrowAuthError(error);
      }
    }),
  requestPasswordReset: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/request-password-reset"), tags: TAGS } })
    .input(requestPasswordResetInputSchema)
    .output(otpDispatchSchema)
    .mutation(async ({ input }) => {
      try {
        return await authService.requestPasswordReset(input);
      } catch (error) {
        rethrowAuthError(error);
      }
    }),
  resetPassword: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/reset-password"), tags: TAGS } })
    .input(resetPasswordInputSchema)
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ input }) => {
      try {
        return await authService.resetPassword(input);
      } catch (error) {
        rethrowAuthError(error);
      }
    }),
  me: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/me"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(authUserSchema)
    .query(async ({ ctx }) => {
      return ctx.user;
    }),
  logout: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/logout"), tags: TAGS } })
    .input(emptyInputSchema)
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ ctx }) => {
      await authService.invalidateSession(ctx.session.id);
      ctx.res.append("Set-Cookie", createExpiredSessionCookie());

      return { success: true };
    }),
});
