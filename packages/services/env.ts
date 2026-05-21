import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const envSchema = z.object({
  GOOGLE_OAUTH_CLIENT_ID: z.string(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string(),
  MAIL_FROM: z.string().default("RavenForm <no-reply@ravenform.app>"),
  SMTP_HOST: z.preprocess(emptyStringToUndefined, z.string().optional()),
  SMTP_PORT: z.preprocess(emptyStringToUndefined, z.coerce.number().default(587)),
  SMTP_SECURE: z
    .preprocess(emptyStringToUndefined, z.string().optional())
    .optional()
    .transform((value) => value === "true"),
  SMTP_USER: z.preprocess(emptyStringToUndefined, z.string().optional()),
  SMTP_PASS: z.preprocess(emptyStringToUndefined, z.string().optional()),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
