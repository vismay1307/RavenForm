import { z } from "../../schema";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const FormStatusEnum     = z.enum(["draft", "published", "archived"]);
export const FormVisibilityEnum = z.enum(["public", "unlisted"]);

export const FieldTypeEnum = z.enum([
  "short_text",
  "long_text",
  "email",
  "number",
  "single_select",
  "multi_select",
  "rating",
  "date",
  "yes_no",
]);

// ─── Shared ───────────────────────────────────────────────────────────────────

export const FieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const FormFieldSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  type: FieldTypeEnum,
  label: z.string(),
  description: z.string().nullable(),
  placeholder: z.string().nullable(),
  required: z.boolean(),
  sortOrder: z.number().int(),
  options: z.array(FieldOptionSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const FormSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  status: FormStatusEnum,
  visibility: FormVisibilityEnum,
  theme: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  publishedAt: z.date().nullable(),
});

export const FormListItemSchema = FormSchema.extend({
  fieldCount: z.number().int().nonnegative(),
});

export const FormWithFieldsSchema = FormSchema.extend({
  fields: z.array(FormFieldSchema),
});

export const MutationSuccessSchema = z.object({
  success: z.literal(true),
});

// ─── Form schemas ─────────────────────────────────────────────────────────────

export const CreateFormSchema = z.object({
  title:       z.string().trim().min(1, "Title is required").max(255),
  description: z.string().max(1000).optional(),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, hyphens only")
    .optional(),
  visibility: FormVisibilityEnum.optional().default("public"),
  theme:      z.string().optional().default("ravenform"),
});

export const UpdateFormSchema = z.object({
  id:          z.string().uuid(),
  title:       z.string().trim().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  visibility: FormVisibilityEnum.optional(),
  theme:      z.string().optional(),
});

export const DeleteFormSchema     = z.object({ id: z.string().uuid() });
export const GetFormByIdSchema    = z.object({ id: z.string().uuid() });
export const PublishFormSchema    = z.object({ id: z.string().uuid() });
export const UnpublishFormSchema  = z.object({ id: z.string().uuid() });
export const CloneFormSchema      = z.object({ id: z.string().uuid() });

// ─── Field schemas ────────────────────────────────────────────────────────────

export const CreateFieldSchema = z.object({
  formId:      z.string().uuid(),
  type:        FieldTypeEnum,
  label:       z.string().trim().min(1, "Label is required").max(255),
  description: z.string().max(500).optional(),
  placeholder: z.string().max(255).optional(),
  required:    z.boolean().optional().default(false),
  options:     z.array(FieldOptionSchema).optional().default([]),
});

export const UpdateFieldSchema = z.object({
  id:          z.string().uuid(),
  label:       z.string().trim().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
  placeholder: z.string().max(255).optional(),
  required:    z.boolean().optional(),
  options:     z.array(FieldOptionSchema).optional(),
});

export const DeleteFieldSchema    = z.object({ id: z.string().uuid() });
export const GetFormFieldsSchema  = z.object({ formId: z.string().uuid() });

export const ReorderFieldsSchema = z.object({
  formId:     z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateFormInput    = z.infer<typeof CreateFormSchema>;
export type UpdateFormInput    = z.infer<typeof UpdateFormSchema>;
export type CreateFieldInput   = z.infer<typeof CreateFieldSchema>;
export type UpdateFieldInput   = z.infer<typeof UpdateFieldSchema>;
export type ReorderFieldsInput = z.infer<typeof ReorderFieldsSchema>;
