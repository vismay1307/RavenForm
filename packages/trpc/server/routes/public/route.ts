import { TRPCError } from "@trpc/server";
import { eq, asc } from "@repo/database";
import db from "@repo/database";
import { forms, formFields, responses } from "@repo/database/schema";
import { z } from "../../schema";
import { publicProcedure, router } from "../../trpc";
import type { ZodTypeAny } from "zod";

// ─── Dynamic Zod schema builder ──────────────────────────────────────────────

function buildAnswerSchema(fields: (typeof formFields.$inferSelect)[]): ZodTypeAny {
  const shape: Record<string, ZodTypeAny> = {};

  for (const field of fields) {
    let schema: ZodTypeAny;
    const options = (field.options as { label: string; value: string }[] | null) ?? [];

    switch (field.type) {
      case "short_text":
        schema = z.string().min(1).max(500);
        break;
      case "long_text":
        schema = z.string().max(5000);
        break;
      case "email":
        schema = z.string().email();
        break;
      case "number":
        schema = z.number();
        break;
      case "single_select": {
        const vals = options.map((o) => o.value) as [string, ...string[]];
        schema = vals.length > 0 ? z.enum(vals) : z.string().min(1);
        break;
      }
      case "multi_select":
        schema = z.array(z.string());
        break;
      case "rating":
        schema = z.number().int().min(1).max(5);
        break;
      case "date":
        schema = z.string().min(1);
        break;
      case "yes_no":
        schema = z.boolean();
        break;
      default:
        schema = z.unknown();
    }

    shape[field.id] = field.required ? schema : schema.optional();
  }

  return z.object(shape);
}

// ─── Helper: fetch published form + fields ────────────────────────────────────

async function fetchPublishedForm(slug: string) {
  const [form] = await db
    .select()
    .from(forms)
    .where(eq(forms.slug, slug))
    .limit(1);

  if (!form || form.status !== "published") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This raven never reached its destination.",
    });
  }

  const fields = await db
    .select()
    .from(formFields)
    .where(eq(formFields.formId, form.id))
    .orderBy(asc(formFields.sortOrder));

  return { form, fields };
}

// ─── Output schemas ───────────────────────────────────────────────────────────

const formFieldOutputSchema = z.object({
  id: z.string(),
  formId: z.string(),
  type: z.string(),
  label: z.string(),
  placeholder: z.string().nullable(),
  required: z.boolean(),
  options: z.unknown().nullable(),
  sortOrder: z.number(),
  createdAt: z.date(),
});

const formOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  status: z.string(),
  visibility: z.string(),
  creatorId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ─── Public router ────────────────────────────────────────────────────────────

export const publicRouter = router({
  getForm: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/public/forms/{slug}",
        tags: ["public"],
        summary: "Get a published form with its fields",
      },
    })
    .input(z.object({ slug: z.string().min(1) }))
    .output(
      z.object({
        form: formOutputSchema,
        fields: z.array(formFieldOutputSchema),
      })
    )
    .query(async ({ input }) => {
      const { form, fields } = await fetchPublishedForm(input.slug);
      const { userId, ...formData } = form;
      return { form: { ...formData, creatorId: userId }, fields };
    }),

  submitResponse: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/public/forms/{slug}/submit",
        tags: ["public"],
        summary: "Submit a response to a published form",
      },
    })
    .input(
      z.object({
        slug: z.string().min(1),
        answers: z.record(z.string(), z.unknown()),
        respondentEmail: z.string().email().optional(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        responseId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { form, fields } = await fetchPublishedForm(input.slug);

      // Build and validate dynamic schema
      const answerSchema = buildAnswerSchema(fields);
      const parseResult = answerSchema.safeParse(input.answers);

      if (!parseResult.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: parseResult.error.issues
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
        });
      }

      // Insert response
      const inserted = await db
        .insert(responses)
        .values({
          formId: form.id,
          respondentEmail: input.respondentEmail ?? null,
          answers: parseResult.data as Record<string, unknown>,
          metadata: {},
          isComplete: true,
        })
        .returning({ id: responses.id });

      if (!inserted[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "The raven was lost. Try again.",
        });
      }

      return { success: true, responseId: inserted[0].id };
    }),
});