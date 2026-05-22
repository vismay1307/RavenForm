"use client";

import { useState } from "react";
import { trpc, type RouterOutputs } from "~/lib/trpc";
import { FieldEditor } from "./FieldEditor";

type Field = RouterOutputs["fields"]["getFormFields"][number];

const TYPE_LABEL: Record<string, string> = {
  short_text:    "Short Text",
  long_text:     "Long Text",
  email:         "Email",
  number:        "Number",
  single_select: "Single Select",
  multi_select:  "Multi Select",
  rating:        "Rating",
  date:          "Date",
  yes_no:        "Yes / No",
};

export function FieldList({ fields, formId }: { fields: Field[]; formId: string }) {
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);

  const deleteMutation = trpc.fields.deleteField.useMutation({
    onSuccess: () => {
      utils.fields.getFormFields.invalidate({ formId });
      utils.forms.getFormById.invalidate({ id: formId });
    },
  });

  const reorderMutation = trpc.fields.reorderFields.useMutation({
    onSuccess: () => utils.fields.getFormFields.invalidate({ formId }),
  });

  function moveField(index: number, direction: "up" | "down") {
    const newOrder = [...fields];
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= newOrder.length) return;
    const currentField = newOrder[index];
    const swappedField = newOrder[swapWith];

    if (!currentField || !swappedField) {
      return;
    }

    [newOrder[index], newOrder[swapWith]] = [swappedField, currentField];
    reorderMutation.mutate({
      formId,
      orderedIds: newOrder.map((f) => f.id),
    });
  }

  if (fields.length === 0) {
    return (
      <p className="text-[#6A6478] text-sm text-center py-8">
        No fields yet. Add your first field below.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <div key={field.id}>
          {editingId === field.id ? (
            <FieldEditor
              field={field}
              formId={formId}
              onSaved={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="border border-[#2a2a2a] bg-[#111118] rounded-lg px-4 py-3 flex items-center gap-3">
              {/* Order buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveField(index, "up")}
                  disabled={index === 0 || reorderMutation.isPending}
                  className="text-[#6A6478] hover:text-[#B8960C] disabled:opacity-20 text-xs leading-none px-1"
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveField(index, "down")}
                  disabled={index === fields.length - 1 || reorderMutation.isPending}
                  className="text-[#6A6478] hover:text-[#B8960C] disabled:opacity-20 text-xs leading-none px-1"
                  title="Move down"
                >
                  ▼
                </button>
              </div>

              {/* Field info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[#E8E0D0] text-sm font-medium truncate">
                    {field.label}
                  </span>
                  {field.required && (
                    <span className="text-red-400 text-xs">*</span>
                  )}
                </div>
                <span className="text-[#6A6478] text-xs">
                  {TYPE_LABEL[field.type] ?? field.type}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditingId(field.id)}
                  className="text-xs px-2.5 py-1 border border-[#B8960C]/40 text-[#B8960C] rounded hover:bg-[#B8960C]/10 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm("Remove this field?")) {
                      deleteMutation.mutate({ id: field.id });
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="text-xs px-2.5 py-1 border border-red-900 text-red-400 rounded hover:bg-red-900/20 transition-colors disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
