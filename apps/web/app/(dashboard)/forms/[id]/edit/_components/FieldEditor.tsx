"use client";

import { useState } from "react";
import { trpc, type RouterInputs, type RouterOutputs } from "~/lib/trpc";

const FIELD_TYPES = [
  { value: "short_text",    label: "Short Text" },
  { value: "long_text",     label: "Long Text" },
  { value: "email",         label: "Email" },
  { value: "number",        label: "Number" },
  { value: "single_select", label: "Single Select" },
  { value: "multi_select",  label: "Multi Select" },
  { value: "rating",        label: "Rating (1–5)" },
  { value: "date",          label: "Date" },
  { value: "yes_no",        label: "Yes / No" },
] as const;

const OPTION_TYPES = ["single_select", "multi_select"];

type Option = { label: string; value: string };
type FieldType = RouterInputs["fields"]["addField"]["type"];
type ExistingField = RouterOutputs["fields"]["getFormFields"][number];
type DraftField = Partial<ExistingField> & { type: FieldType };

type FieldEditorProps = {
  field: DraftField;
  formId: string;
  onSaved: () => void;
  onCancel: () => void;
};

export function FieldEditor({ field, formId, onSaved, onCancel }: FieldEditorProps) {
  const utils = trpc.useUtils();

  const [label,       setLabel]       = useState(field.label ?? "");
  const [description, setDescription] = useState(field.description ?? "");
  const [placeholder, setPlaceholder] = useState(field.placeholder ?? "");
  const [required,    setRequired]    = useState(field.required ?? false);
  const [options,     setOptions]     = useState<Option[]>(
    () =>
      field.options?.flatMap((option) => {
        if (!option?.label || !option?.value) {
          return [];
        }

        return [{ label: option.label, value: option.value }];
      }) ?? [],
  );
  const [error,       setError]       = useState("");

  const isNew = !field.id; // no id = adding new field
  const showOptions = OPTION_TYPES.includes(field.type);

  const addMutation = trpc.fields.addField.useMutation({
    onSuccess: () => {
      utils.fields.getFormFields.invalidate({ formId });
      utils.forms.getFormById.invalidate({ id: formId });
      onSaved();
    },
    onError: (error) => setError(error.message),
  });

  const updateMutation = trpc.fields.updateField.useMutation({
    onSuccess: () => {
      utils.fields.getFormFields.invalidate({ formId });
      onSaved();
    },
    onError: (error) => setError(error.message),
  });

  function handleSave() {
    setError("");
    if (!label.trim()) { setError("Label is required."); return; }

    if (isNew) {
      addMutation.mutate({
        formId,
        type:        field.type,
        label:       label.trim(),
        description: description.trim() || undefined,
        placeholder: placeholder.trim() || undefined,
        required,
        options:     showOptions ? options : [],
      });
    } else {
      const fieldId = field.id;

      if (!fieldId) {
        setError("Field id is missing.");
        return;
      }

      updateMutation.mutate({
        id:          fieldId,
        label:       label.trim(),
        description: description.trim() || undefined,
        placeholder: placeholder.trim() || undefined,
        required,
        options:     showOptions ? options : undefined,
      });
    }
  }

  function addOption() {
    setOptions([...options, { label: "", value: "" }]);
  }

  function updateOption(i: number, key: keyof Option, val: string) {
    const next = [...options];
    const currentOption = next[i];

    if (!currentOption) {
      return;
    }

    next[i] = { ...currentOption, [key]: val };
    // Auto-sync value from label
    if (key === "label") {
      next[i].value = val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    }
    setOptions(next);
  }

  function removeOption(i: number) {
    setOptions(options.filter((_, idx) => idx !== i));
  }

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="bg-[#0d0d14] border border-[#B8960C]/30 rounded-lg p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#B8960C] uppercase tracking-wider font-semibold">
          {FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
        </span>
        <button onClick={onCancel} className="text-[#6A6478] hover:text-[#E8E0D0] text-xs">
          ✕ Cancel
        </button>
      </div>

      {/* Label */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6A6478]">Label *</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Question text…"
          className="bg-[#111118] border border-[#2a2a2a] rounded px-3 py-2 text-[#E8E0D0] text-sm placeholder-[#6A6478] focus:outline-none focus:border-[#B8960C] transition-colors"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6A6478]">Helper text</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description shown below the label…"
          className="bg-[#111118] border border-[#2a2a2a] rounded px-3 py-2 text-[#E8E0D0] text-sm placeholder-[#6A6478] focus:outline-none focus:border-[#B8960C] transition-colors"
        />
      </div>

      {/* Placeholder — only for text-like fields */}
      {["short_text", "long_text", "email", "number"].includes(field.type) && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#6A6478]">Placeholder</label>
          <input
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            placeholder="Input placeholder text…"
            className="bg-[#111118] border border-[#2a2a2a] rounded px-3 py-2 text-[#E8E0D0] text-sm placeholder-[#6A6478] focus:outline-none focus:border-[#B8960C] transition-colors"
          />
        </div>
      )}

      {/* Options — single_select / multi_select */}
      {showOptions && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#6A6478]">Options</label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={opt.label}
                onChange={(e) => updateOption(i, "label", e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 bg-[#111118] border border-[#2a2a2a] rounded px-3 py-1.5 text-[#E8E0D0] text-sm placeholder-[#6A6478] focus:outline-none focus:border-[#B8960C] transition-colors"
              />
              <button
                onClick={() => removeOption(i)}
                className="text-red-400 hover:text-red-300 text-xs px-2"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addOption}
            className="text-xs text-[#B8960C] hover:underline self-start mt-1"
          >
            + Add option
          </button>
        </div>
      )}

      {/* Required */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
          className="accent-[#B8960C]"
        />
        <span className="text-sm text-[#E8E0D0]">Required</span>
      </label>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-xs bg-red-900/20 border border-red-900 rounded px-3 py-1.5">
          {error}
        </p>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={isPending}
        className="px-4 py-2 bg-[#B8960C] text-[#06060F] rounded font-semibold text-sm hover:bg-[#a07d0a] disabled:opacity-50 transition-colors"
      >
        {isPending ? "Saving…" : isNew ? "Add Field" : "Save Changes"}
      </button>
    </div>
  );
}
