// packages/trpc/server/routes/responses/route.ts

import { TRPCError } from "@trpc/server";
import db from "@repo/database";
import { forms, formFields, responses } from "@repo/database/schema";
import { eq, and, desc, asc, count, sql } from "@repo/database";
import { z } from "../../schema";
import { router, protectedProcedure } from "../../trpc";

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const ResponseItemSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  respondentEmail: z.string().nullable(),
  answers: z.record(z.string(), z.unknown()),
  metadata: z.object({ ip_hash: z.string().optional() }).nullable(),
  isComplete: z.boolean(),
  createdAt: z.date(),
});

// ---------------------------------------------------------------------------
// Ownership helpers
// ---------------------------------------------------------------------------

async function assertFormOwner(formId: string, userId: string) {
  const form = await db.query.forms.findFirst({
    where: and(eq(forms.id, formId), eq(forms.userId, userId)),
  });
  if (!form) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Form not found or you do not own it.",
    });
  }
  return form;
}

async function assertResponseOwner(responseId: string, userId: string) {
  // Step 1: fetch the response
  const [response] = await db
    .select()
    .from(responses)
    .where(eq(responses.id, responseId));

  if (!response) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Response not found." });
  }

  // Step 2: fetch the form and check ownership
  const [form] = await db
    .select()
    .from(forms)
    .where(and(eq(forms.id, response.formId), eq(forms.userId, userId)));

  if (!form) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Form not found or you do not own it.",
    });
  }

  return response;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const responsesRouter = router({
  // -------------------------------------------------------------------------
  // 1. list
  // -------------------------------------------------------------------------
  list: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/responses" as `/${string}`,
        tags: ["responses"],
      },
    })
    .input(
      z.object({
        formId: z.string().uuid(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .output(
      z.object({
        items: z.array(ResponseItemSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { formId, page, limit, dateFrom, dateTo } = input;

      await assertFormOwner(formId, ctx.user.id);

      // Build where conditions
      const conditions = [eq(responses.formId, formId)];
      if (dateFrom) {
        conditions.push(
          sql`${responses.createdAt} >= ${new Date(dateFrom)}`
        );
      }
      if (dateTo) {
        conditions.push(
          sql`${responses.createdAt} <= ${new Date(dateTo)}`
        );
      }
      const where = and(...conditions);

      // Count total
      const countResult = await db
        .select({ value: count() })
        .from(responses)
        .where(where);
      const total = Number(countResult[0]?.value ?? 0);

      // Paginated rows
      const items = await db
        .select()
        .from(responses)
        .where(where)
        .orderBy(desc(responses.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // -------------------------------------------------------------------------
  // 2. getById
  // -------------------------------------------------------------------------
  getById: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/responses/:id" as `/${string}`,
        tags: ["responses"],
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .output(ResponseItemSchema)
    .query(async ({ input, ctx }) => {
      const response = await assertResponseOwner(input.id, ctx.user.id);
      return response;
    }),

  // -------------------------------------------------------------------------
  // 3. delete
  // -------------------------------------------------------------------------
  delete: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/responses/:id" as `/${string}`,
        tags: ["responses"],
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      await assertResponseOwner(input.id, ctx.user.id);
      await db.delete(responses).where(eq(responses.id, input.id));
      return { success: true as const };
    }),

  // -------------------------------------------------------------------------
  // 4. export
  // -------------------------------------------------------------------------
  export: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/responses/export" as `/${string}`,
        tags: ["responses"],
      },
    })
    .input(z.object({ formId: z.string().uuid() }))
    .output(z.object({ csv: z.string(), filename: z.string() }))
    .query(async ({ input, ctx }) => {
      const { formId } = input;

      const form = await assertFormOwner(formId, ctx.user.id);

      // Fetch fields ordered by sortOrder
      const fields = await db
        .select()
        .from(formFields)
        .where(eq(formFields.formId, formId))
        .orderBy(asc(formFields.sortOrder));

      // Fetch ALL responses
      const allResponses = await db
        .select()
        .from(responses)
        .where(eq(responses.formId, formId))
        .orderBy(desc(responses.createdAt));

      // CSV escape helper
      const escape = (value: unknown): string => {
        const str =
          Array.isArray(value)
            ? value.join(", ")
            : value === null || value === undefined
            ? ""
            : String(value);
        return `"${str.replace(/"/g, '""')}"`;
      };

      // Headers
      const staticHeaders = [
        "Response ID",
        "Submitted At",
        "Respondent Email",
        "IP Hash",
      ];
      const fieldHeaders = fields.map((f) => f.label);
      const headerRow = [...staticHeaders, ...fieldHeaders]
        .map(escape)
        .join(",");

      // Data rows
      const dataRows = allResponses.map((r) => {
        const metadata = (r.metadata ?? {}) as { ip_hash?: string };
        const staticCols = [
          r.id,
          r.createdAt.toISOString(),
          r.respondentEmail ?? "",
          metadata.ip_hash ?? "",
        ];
        const fieldCols = fields.map((f) => {
          const val = (r.answers as Record<string, unknown>)[f.id];
          return Array.isArray(val) ? val.join(", ") : (val ?? "");
        });
        return [...staticCols, ...fieldCols].map(escape).join(",");
      });

      const csv = [headerRow, ...dataRows].join("\n");
      const filename = `${form.title
        .toLowerCase()
        .replace(/\s+/g, "-")}-responses-${Date.now()}.csv`;

      return { csv, filename };
    }),

  // -------------------------------------------------------------------------
  // 5. getAnalytics
  // -------------------------------------------------------------------------
  getAnalytics: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/responses/analytics" as `/${string}`,
        tags: ["responses"],
      },
    })
    .input(
      z.object({
        formId: z.string().uuid(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .output(
      z.object({
        totalResponses: z.number(),
        dailyData: z.array(
          z.object({ date: z.string(), count: z.number() })
        ),
        fieldSummaries: z.array(
          z.object({
            fieldId: z.string(),
            label: z.string(),
            type: z.string(),
            breakdown: z.array(
              z.object({ value: z.string(), count: z.number() })
            ),
            avgRating: z.number().nullable(),
          })
        ),
      })
    )
    .query(async ({ input, ctx }) => {
      const { formId } = input;

      await assertFormOwner(formId, ctx.user.id);

      // Step 1 — Total responses
      const totalResult = await db
        .select({ value: count() })
        .from(responses)
        .where(eq(responses.formId, formId));
      const totalResponses = Number(totalResult[0]?.value ?? 0);

      // Step 2 — Daily data (last 30 days)
      const dailyResult = await db.execute(sql`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
        FROM responses
        WHERE form_id = ${formId} AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `);
      const dailyData = (dailyResult.rows as { date: string; count: number }[]).map(
        (row) => ({ date: row.date, count: row.count })
      );

      // Step 3 — Field summaries
      const fields = await db
        .select()
        .from(formFields)
        .where(eq(formFields.formId, formId))
        .orderBy(asc(formFields.sortOrder));

      const fieldSummaries = await Promise.all(
        fields.map(async (field) => {
          const fieldId = field.id;
          const type = field.type;

          if (type === "single_select" || type === "multi_select") {
            const rows = await db.execute(sql`
              SELECT answers->>${fieldId} AS option_value, COUNT(*)::int AS count
              FROM responses
              WHERE form_id = ${formId} AND answers ? ${fieldId}
              GROUP BY answers->>${fieldId}
              ORDER BY count DESC
            `);
            const breakdown = (
              rows.rows as { option_value: string; count: number }[]
            ).map((r) => ({ value: r.option_value, count: r.count }));
            return { fieldId, label: field.label, type, breakdown, avgRating: null };
          }

          if (type === "rating") {
            const avgRows = await db.execute(sql`
              SELECT ROUND(AVG((answers->>${fieldId})::numeric), 1) AS avg
              FROM responses
              WHERE form_id = ${formId} AND answers ? ${fieldId}
            `);
            const avgRaw = (avgRows.rows as { avg: string | null }[])[0]?.avg;
            const avgRating = avgRaw !== null && avgRaw !== undefined ? Number(avgRaw) : null;

            const distRows = await db.execute(sql`
              SELECT (answers->>${fieldId})::int AS rating, COUNT(*)::int AS count
              FROM responses
              WHERE form_id = ${formId} AND answers ? ${fieldId}
              GROUP BY rating
              ORDER BY rating ASC
            `);
            const breakdown = (
              distRows.rows as { rating: number; count: number }[]
            ).map((r) => ({ value: String(r.rating), count: r.count }));

            return { fieldId, label: field.label, type, breakdown, avgRating };
          }

          // All other types
          return {
            fieldId,
            label: field.label,
            type,
            breakdown: [],
            avgRating: null,
          };
        })
      );

      return { totalResponses, dailyData, fieldSummaries };
    }),
});