import { pgTable, uuid, varchar, timestamp, boolean, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sessionsTable } from "./session";
import { forms } from "./forms";   // ← forms, jo forms.ts export karta hai

export const usersTable = pgTable("users", {
  id:              uuid("id").primaryKey().defaultRandom(),
  fullName:        varchar("full_name", { length: 80 }).notNull(),
  email:           varchar("email", { length: 255 }).notNull().unique(),
  passwordHash:    text("password_hash"),
  emailVerified:   boolean("email_verified").default(false),
  profileImageUrl: text("profile_image_url"),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
  updatedAt:       timestamp("updated_at").$onUpdate(() => new Date()),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  sessions: many(sessionsTable),
  forms:    many(forms),   // ← forms
}));

export type SelectUser = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;