import { TRPCError } from "@trpc/server";
import { eq, and, asc } from "@repo/database";
import { router, protectedProcedure } from "../../trpc";
import db from "@repo/database";
import { forms, formFields } from "@repo/database/schema";
import {
  CreateFieldSchema,
  UpdateFieldSchema,
  DeleteFieldSchema,
  ReorderFieldsSchema,
  GetFormFieldsSchema,
  FormFieldSchema,
  MutationSuccessSchema,
} from "../forms/validators";
import { generatePath } from "../../utils/path-generator";
import { z } from "../../schema";

const TAGS    = ["Fields"];
const getPath = generatePath("/fields");

function normalizeFieldOutput<T extends { options: { label: string; value: string }[] | null }>(field: T) {
  return {
    ...field,
    options: field.options ?? [],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertFormOwner(formId: string, userId: string) {
  const form = await db.query.forms.findFirst({
    where: and(eq(forms.id, formId), eq(forms.userId, userId)),
  });
  if (!form) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Form not found or access denied." });
  }
  return form;
}

async function assertFieldOwner(fieldId: string, userId: string) {
  const field = await db.query.formFields.findFirst({
    where: eq(formFields.id, fieldId),
    with:  { form: { columns: { userId: true, id: true } } },
  });
  if (!field || field.form.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Field not found or access denied." });
  }
  return field;
}

// ─── Router ───────────────────────────────────────────────────────────────────


const fieldsRouter = router({
  getFormFields: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(GetFormFieldsSchema)
    .output(z.array(FormFieldSchema))
    .query(async ({ ctx, input }) => {
      await assertFormOwner(input.formId, ctx.user.id);

      return db.query.formFields.findMany({
        where:   eq(formFields.formId, input.formId),
        orderBy: [asc(formFields.sortOrder)],
      }).then((fields) => fields.map(normalizeFieldOutput));
    }),

  addField: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(CreateFieldSchema)
    .output(FormFieldSchema)
    .mutation(async ({ ctx, input }) => {
      await assertFormOwner(input.formId, ctx.user.id);

      const existing = await db.query.formFields.findMany({
        where:   eq(formFields.formId, input.formId),
        columns: { sortOrder: true },
      });

      const nextOrder =
        existing.length === 0
          ? 0
          : Math.max(...existing.map((f) => f.sortOrder)) + 1;

      const [field] = await db
        .insert(formFields)
        .values({
          formId:      input.formId,
          type:        input.type,
          label:       input.label,
          description: input.description,
          placeholder: input.placeholder,
          required:    input.required ?? false,
          sortOrder:   nextOrder,
          options:     input.options ?? [],
        })
        .returning();

      if (!field) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add field.",
        });
      }

      await db
        .update(forms)
        .set({ updatedAt: new Date() })
        .where(eq(forms.id, input.formId));

      return normalizeFieldOutput(field);
    }),

  updateField: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/:id"), tags: TAGS } })
    .input(UpdateFieldSchema)
    .output(FormFieldSchema)
    .mutation(async ({ ctx, input }) => {
      await assertFieldOwner(input.id, ctx.user.id);

      const [updated] = await db
        .update(formFields)
        .set({
          ...(input.label       !== undefined && { label:       input.label       }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.placeholder !== undefined && { placeholder: input.placeholder }),
          ...(input.required    !== undefined && { required:    input.required    }),
          ...(input.options     !== undefined && { options:     input.options     }),
          updatedAt: new Date(),
        })
        .where(eq(formFields.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update field.",
        });
      }

      return normalizeFieldOutput(updated);
    }),

  deleteField: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/:id"), tags: TAGS } })
    .input(DeleteFieldSchema)
    .output(MutationSuccessSchema)
    .mutation(async ({ ctx, input }) => {
      const field = await assertFieldOwner(input.id, ctx.user.id);
      await db.delete(formFields).where(eq(formFields.id, input.id));

      // Re-sequence remaining fields
      const remaining = await db.query.formFields.findMany({
        where:   eq(formFields.formId, field.form.id),
        orderBy: [asc(formFields.sortOrder)],
      });

      await Promise.all(
        remaining.map((f, i) =>
          f.sortOrder !== i
            ? db.update(formFields).set({ sortOrder: i }).where(eq(formFields.id, f.id))
            : Promise.resolve()
        )
      );

      return { success: true as const };
    }),

  reorderFields: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/reorder"), tags: TAGS } })
    .input(ReorderFieldsSchema)
    .output(MutationSuccessSchema)
    .mutation(async ({ ctx, input }) => {
      await assertFormOwner(input.formId, ctx.user.id);

      await Promise.all(
        input.orderedIds.map((id, index) =>
          db
            .update(formFields)
            .set({ sortOrder: index, updatedAt: new Date() })
            .where(
              and(
                eq(formFields.id, id),
                eq(formFields.formId, input.formId)
              )
            )
        )
      );

      return { success: true as const };
    }),
});
export{fieldsRouter}
