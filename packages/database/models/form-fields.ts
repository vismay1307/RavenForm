import { pgTable, uuid, varchar, text, boolean, integer, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { forms } from "./forms";   // ← forms, jo forms.ts export karta hai

export const fieldTypeEnum = pgEnum("field_type", [
  "short_text", "long_text", "email", "number",
  "single_select", "multi_select", "rating", "date", "yes_no",
]);

export const formFields = pgTable("form_fields", {
  id:          uuid("id").primaryKey().defaultRandom(),
  formId:      uuid("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  type:        fieldTypeEnum("type").notNull(),
  label:       varchar("label", { length: 255 }).notNull(),
  description: text("description"),
  placeholder: varchar("placeholder", { length: 255 }),
  required:    boolean("required").notNull().default(false),
  sortOrder:   integer("sort_order").notNull().default(0),
  options:     jsonb("options").$type<{ label: string; value: string }[]>().default([]),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export const formFieldsRelations = relations(formFields, ({ one }) => ({
  form: one(forms, { fields: [formFields.formId], references: [forms.id] }),   // ← forms
}));

export type FormField    = typeof formFields.$inferSelect;
export type NewFormField = typeof formFields.$inferInsert;