import { pgTable, uuid, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user";
import { formFields } from "./form-fields";   // ← formFields, jo form-fields.ts export karta hai

export const formStatusEnum     = pgEnum("form_status",     ["draft", "published", "archived"]);
export const formVisibilityEnum = pgEnum("form_visibility",  ["public", "unlisted"]);

export const forms = pgTable("forms", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title:       varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  slug:        varchar("slug", { length: 100 }).notNull().unique(),
  status:      formStatusEnum("status").notNull().default("draft"),
  visibility:  formVisibilityEnum("visibility").notNull().default("public"),
  theme:       varchar("theme", { length: 100 }).default("ravenform"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
  publishedAt: timestamp("published_at"),
});

export const formsRelations = relations(forms, ({ one, many }) => ({
  user:   one(usersTable, { fields: [forms.userId], references: [usersTable.id] }),
  fields: many(formFields),   // ← formFields
}));

export type Form    = typeof forms.$inferSelect;
export type NewForm = typeof forms.$inferInsert;