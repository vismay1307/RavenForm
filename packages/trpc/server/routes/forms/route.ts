import { TRPCError } from "@trpc/server";
import { eq, and, desc, asc } from "@repo/database";
import { router, protectedProcedure } from "../../trpc";
import db from "@repo/database";
import { forms, formFields } from "@repo/database/schema";
import {
  CreateFormSchema,
  UpdateFormSchema,
  DeleteFormSchema,
  GetFormByIdSchema,
  PublishFormSchema,
  UnpublishFormSchema,
  CloneFormSchema,
  FormSchema,
  FormListItemSchema,
  FormWithFieldsSchema,
  MutationSuccessSchema,
} from "./validators";
import { z } from "../../schema";
import { generatePath } from "../../utils/path-generator";

const TAGS    = ["Forms"];
const getPath = generatePath("/forms");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

function normalizeFieldOutput<T extends { options: { label: string; value: string }[] | null }>(field: T) {
  return {
    ...field,
    options: field.options ?? [],
  };
}

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

// ─── Router ───────────────────────────────────────────────────────────────────

const formsRouter = router({

  createForm: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(CreateFormSchema)
    .output(FormSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      let slug = input.slug ?? generateSlug(input.title);

      const existing = await db.query.forms.findFirst({
        where: eq(forms.slug, slug),
      });
      if (existing) {
        slug = slug.slice(0, 75) + "-" + Math.random().toString(36).slice(2, 5);
      }

      const [form] = await db
        .insert(forms)
        .values({
          userId,
          title:       input.title,
          description: input.description,
          slug,
          visibility:  input.visibility ?? "public",
          theme:       input.theme ?? "ravenform",
          status:      "draft",
        })
        .returning();

      if (!form) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create form.",
        });
      }

      return form;
    }),

  getMyForms: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .output(z.array(FormListItemSchema))
    .query(async ({ ctx }) => {
      const rows = await db.query.forms.findMany({
        where:   eq(forms.userId, ctx.user.id),
        orderBy: [desc(forms.createdAt)],
        with: {
          fields: { columns: { id: true } },
        },
      });

      return rows.map((f) => ({
        ...f,
        fieldCount: f.fields.length,
        fields:     undefined as never,
      }));
    }),

  getFormById: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/:id"), tags: TAGS } })
    .input(GetFormByIdSchema)
    .output(FormWithFieldsSchema)
    .query(async ({ ctx, input }) => {
      const form = await db.query.forms.findFirst({
        where: and(
          eq(forms.id, input.id),
          eq(forms.userId, ctx.user.id)
        ),
      });

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found." });
      }

      // Separate query — avoids implicit any in orderBy callback
      const fields = await db.query.formFields.findMany({
        where:   eq(formFields.formId, input.id),
        orderBy: [asc(formFields.sortOrder)],
      });

      return { ...form, fields: fields.map(normalizeFieldOutput) };
    }),

  updateForm: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/:id"), tags: TAGS } })
    .input(UpdateFormSchema)
    .output(FormSchema)
    .mutation(async ({ ctx, input }) => {
      await assertFormOwner(input.id, ctx.user.id);

      if (input.slug) {
        const taken = await db.query.forms.findFirst({
          where: eq(forms.slug, input.slug),
        });
        if (taken && taken.id !== input.id) {
          throw new TRPCError({ code: "CONFLICT", message: "Slug is already taken." });
        }
      }

      const [updated] = await db
        .update(forms)
        .set({
          ...(input.title       !== undefined && { title:       input.title       }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.slug        !== undefined && { slug:        input.slug        }),
          ...(input.visibility  !== undefined && { visibility:  input.visibility  }),
          ...(input.theme       !== undefined && { theme:       input.theme       }),
          updatedAt: new Date(),
        })
        .where(eq(forms.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update form.",
        });
      }

      return updated;
    }),

  deleteForm: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/:id"), tags: TAGS } })
    .input(DeleteFormSchema)
    .output(MutationSuccessSchema)
    .mutation(async ({ ctx, input }) => {
      await assertFormOwner(input.id, ctx.user.id);
      await db.delete(forms).where(eq(forms.id, input.id));
      return { success: true as const };
    }),

  publishForm: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/:id/publish"), tags: TAGS } })
    .input(PublishFormSchema)
    .output(FormSchema)
    .mutation(async ({ ctx, input }) => {
      await assertFormOwner(input.id, ctx.user.id);

      const existingFields = await db.query.formFields.findMany({
        where: eq(formFields.formId, input.id),
      });
      if (existingFields.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Add at least one field before publishing.",
        });
      }

      const [updated] = await db
        .update(forms)
        .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
        .where(eq(forms.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to publish form.",
        });
      }

      return updated;
    }),

  unpublishForm: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/:id/unpublish"), tags: TAGS } })
    .input(UnpublishFormSchema)
    .output(FormSchema)
    .mutation(async ({ ctx, input }) => {
      await assertFormOwner(input.id, ctx.user.id);

      const [updated] = await db
        .update(forms)
        .set({ status: "draft", updatedAt: new Date() })
        .where(eq(forms.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to unpublish form.",
        });
      }

      return updated;
    }),

  cloneForm: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/:id/clone"), tags: TAGS } })
    .input(CloneFormSchema)
    .output(FormSchema)
    .mutation(async ({ ctx, input }) => {
      const original = await assertFormOwner(input.id, ctx.user.id);
      const newSlug  = generateSlug(original.title + " copy");

const inserted = await db
  .insert(forms)
  .values({
    userId: ctx.user.id,
    title: original.title + " (Copy)",
    description: original.description,
    slug: newSlug,
    visibility: original.visibility,
    theme: original.theme,
    status: "draft",
  })
  .returning();

const cloned = inserted[0];

if (!cloned) {
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to clone form",
  });
}

      // Clone fields — separate query, no implicit any
      const originalFields = await db.query.formFields.findMany({
        where:   eq(formFields.formId, input.id),
        orderBy: [asc(formFields.sortOrder)],
      });

      if (originalFields.length > 0) {
        await db.insert(formFields).values(
          originalFields.map((f) => ({
            formId:      cloned.id,
            type:        f.type,
            label:       f.label,
            description: f.description,
            placeholder: f.placeholder,
            required:    f.required,
            sortOrder:   f.sortOrder,
            options:     f.options,
          }))
        );
      }

      return cloned;
    }),
});
export { formsRouter };
