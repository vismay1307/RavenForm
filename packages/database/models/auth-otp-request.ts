import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const authOtpRequestsTable = pgTable("auth_otp_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  purpose: varchar("purpose", { length: 32 }).notNull(),
  otpHash: varchar("otp_hash", { length: 64 }).notNull(),
  fullName: varchar("full_name", { length: 80 }),
  pendingPasswordHash: text("pending_password_hash"),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export type SelectAuthOtpRequest = typeof authOtpRequestsTable.$inferSelect;
export type InsertAuthOtpRequest = typeof authOtpRequestsTable.$inferInsert;
