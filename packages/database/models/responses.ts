import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { forms } from "./forms";

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .references(() => forms.id, { onDelete: "cascade" })
      .notNull(),
    respondentEmail: varchar("respondent_email", { length: 255 }),
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
    metadata: jsonb("metadata").$type<{ ip_hash?: string }>().default({}),
    isComplete: boolean("is_complete").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    formIdIdx: index("idx_responses_form_id").on(table.formId),
    createdAtIdx: index("idx_responses_created_at").on(table.createdAt),
    formCreatedIdx: index("idx_responses_form_created").on(
      table.formId,
      table.createdAt
    ),
  })
);