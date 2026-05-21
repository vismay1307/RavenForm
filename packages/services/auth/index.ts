import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { db, eq, and, gt, isNull, desc } from "@repo/database";
import { authOtpRequestsTable, sessionsTable, usersTable } from "@repo/database/schema";
import type { MailerService } from "../mailer";

const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_LENGTH = 64;
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const OTP_DURATION_MS = 1000 * 60;

type AuthOtpPurpose = "email_verification" | "password_reset";

export class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CONFLICT"
      | "UNAUTHORIZED"
      | "BAD_REQUEST"
      | "NOT_FOUND"
      | "TOO_MANY_REQUESTS",
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString("hex");
  const derivedKey = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, storedKey] = passwordHash.split(":");

  if (!salt || !storedKey) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const storedKeyBuffer = Buffer.from(storedKey, "hex");

  if (derivedKey.length !== storedKeyBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedKeyBuffer);
}

function hashSessionToken(sessionToken: string): string {
  return createHash("sha256").update(sessionToken).digest("hex");
}

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

function generateOtp(): string {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export class AuthService {
  constructor(private readonly mailerService: MailerService) {}

  public hashSessionToken = hashSessionToken;

  public createSessionToken(): string {
    return randomBytes(32).toString("hex");
  }

  public getSessionExpiryDate(): Date {
    return new Date(Date.now() + SESSION_DURATION_MS);
  }

  public async startRegistration(input: { email: string; fullName: string; password: string }) {
    const email = input.email.trim().toLowerCase();

    const existingUser = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });

    if (existingUser) {
      throw new AuthServiceError("An account with this email already exists.", "CONFLICT");
    }

    const otp = generateOtp();
    await this.createOtpRequest({
      email,
      purpose: "email_verification",
      fullName: input.fullName.trim(),
      pendingPasswordHash: hashPassword(input.password),
      otp,
    });

    await this.mailerService.sendOtpEmail({
      email,
      otp,
      purpose: "email_verification",
    });

    return {
      email,
      expiresInSeconds: 60,
    };
  }

  public async verifyRegistration(input: { email: string; otp: string }) {
    const email = input.email.trim().toLowerCase();
    const otpRequest = await this.consumeOtpRequest({
      email,
      otp: input.otp,
      purpose: "email_verification",
    });

    if (!otpRequest.pendingPasswordHash) {
      throw new AuthServiceError("Registration request is incomplete. Request a new OTP.", "BAD_REQUEST");
    }

    const existingUser = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });

    if (existingUser) {
      throw new AuthServiceError("An account with this email already exists.", "CONFLICT");
    }

    const [user] = await db
      .insert(usersTable)
      .values({
        email,
        fullName: otpRequest.fullName ?? "RavenForm User",
        passwordHash: otpRequest.pendingPasswordHash,
        emailVerified: true,
      })
      .returning({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        createdAt: usersTable.createdAt,
      });

    if (!user) {
      throw new Error("Failed to create verified user.");
    }

    return user;
  }

  public async login(input: { email: string; password: string }) {
    const email = input.email.trim().toLowerCase();

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });

    if (!user) {
      throw new AuthServiceError("No account found with this email.", "NOT_FOUND");
    }

    if (!user.emailVerified) {
      throw new AuthServiceError("Please verify your email before signing in.", "UNAUTHORIZED");
    }

    if (!user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      throw new AuthServiceError("Invalid email or password.", "UNAUTHORIZED");
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  public async createSession(userId: string) {
    const sessionToken = this.createSessionToken();
    const expiresAt = this.getSessionExpiryDate();

    const [session] = await db
      .insert(sessionsTable)
      .values({
        tokenHash: hashSessionToken(sessionToken),
        userId,
        expiresAt,
      })
      .returning();

    if (!session) {
      throw new Error("Failed to create session.");
    }

    return { session, sessionToken };
  }

  public async getSessionFromToken(sessionToken: string) {
    const tokenHash = hashSessionToken(sessionToken);

    const session = await db.query.sessionsTable.findFirst({
      where: and(eq(sessionsTable.tokenHash, tokenHash), gt(sessionsTable.expiresAt, new Date())),
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    return session ?? null;
  }

  public async invalidateSession(sessionId: string) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  }

  public async requestPasswordReset(input: { email: string }) {
    const email = input.email.trim().toLowerCase();
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });

    if (!user) {
      throw new AuthServiceError("No account found with this email.", "NOT_FOUND");
    }

    const otp = generateOtp();
    await this.createOtpRequest({
      email,
      purpose: "password_reset",
      otp,
    });

    await this.mailerService.sendOtpEmail({
      email,
      otp,
      purpose: "password_reset",
    });

    return {
      email,
      expiresInSeconds: 60,
    };
  }

  public async resetPassword(input: { email: string; otp: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });

    if (!user) {
      throw new AuthServiceError("No account found with this email.", "NOT_FOUND");
    }

    await this.consumeOtpRequest({
      email,
      otp: input.otp,
      purpose: "password_reset",
    });

    await db
      .update(usersTable)
      .set({
        passwordHash: hashPassword(input.password),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id));

    await this.invalidateAllSessionsForUser(user.id);

    return { success: true as const };
  }

  public async invalidateAllSessionsForUser(userId: string) {
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
  }

  private async createOtpRequest(input: {
    email: string;
    purpose: AuthOtpPurpose;
    otp: string;
    fullName?: string;
    pendingPasswordHash?: string;
  }) {
    const activeRequest = await db.query.authOtpRequestsTable.findFirst({
      where: and(
        eq(authOtpRequestsTable.email, input.email),
        eq(authOtpRequestsTable.purpose, input.purpose),
        isNull(authOtpRequestsTable.consumedAt),
        gt(authOtpRequestsTable.expiresAt, new Date()),
      ),
      orderBy: [desc(authOtpRequestsTable.createdAt)],
    });

    if (activeRequest) {
      const waitSeconds = Math.max(
        1,
        Math.ceil((activeRequest.expiresAt.getTime() - Date.now()) / 1000),
      );
      throw new AuthServiceError(
        `OTP already sent. Wait ${waitSeconds} seconds before requesting another one.`,
        "TOO_MANY_REQUESTS",
      );
    }

    await db
      .delete(authOtpRequestsTable)
      .where(
        and(
          eq(authOtpRequestsTable.email, input.email),
          eq(authOtpRequestsTable.purpose, input.purpose),
        ),
      );

    await db.insert(authOtpRequestsTable).values({
      email: input.email,
      purpose: input.purpose,
      otpHash: hashOtp(input.otp),
      fullName: input.fullName,
      pendingPasswordHash: input.pendingPasswordHash,
      expiresAt: new Date(Date.now() + OTP_DURATION_MS),
    });
  }

  private async consumeOtpRequest(input: {
    email: string;
    otp: string;
    purpose: AuthOtpPurpose;
  }) {
    const otpRequest = await db.query.authOtpRequestsTable.findFirst({
      where: and(
        eq(authOtpRequestsTable.email, input.email),
        eq(authOtpRequestsTable.purpose, input.purpose),
        isNull(authOtpRequestsTable.consumedAt),
      ),
      orderBy: [desc(authOtpRequestsTable.createdAt)],
    });

    if (!otpRequest) {
      throw new AuthServiceError("OTP request not found. Request a new OTP.", "NOT_FOUND");
    }

    if (otpRequest.expiresAt.getTime() <= Date.now()) {
      throw new AuthServiceError("OTP expired. Request a new OTP.", "BAD_REQUEST");
    }

    if (otpRequest.otpHash !== hashOtp(input.otp)) {
      throw new AuthServiceError("Incorrect OTP.", "BAD_REQUEST");
    }

    await db
      .update(authOtpRequestsTable)
      .set({
        consumedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(authOtpRequestsTable.id, otpRequest.id));

    return otpRequest;
  }
}

export default AuthService;
