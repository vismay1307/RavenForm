"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc, type RouterInputs, type RouterOutputs } from "~/lib/trpc";
import { FieldList } from "./_components/FieldList";
import { FieldEditor } from "./_components/FieldEditor";

type FieldType = RouterInputs["fields"]["addField"]["type"];
type FormVisibility = RouterInputs["forms"]["updateForm"]["visibility"];
type EditableForm = RouterOutputs["forms"]["getFormById"];

const FIELD_TYPES = [
  { value: "short_text",    label: "Short Text",    icon: "T" },
  { value: "long_text",     label: "Long Text",     icon: "¶" },
  { value: "email",         label: "Email",         icon: "@" },
  { value: "number",        label: "Number",        icon: "#" },
  { value: "single_select", label: "Single Select", icon: "◉" },
  { value: "multi_select",  label: "Multi Select",  icon: "☑" },
  { value: "rating",        label: "Rating",        icon: "⚔" },
  { value: "date",          label: "Date",          icon: "📅" },
  { value: "yes_no",        label: "Yes / No",      icon: "?" },
] as const;

// ─── Metadata panel ────────────────────────────────────────────────────────────

function MetadataPanel({ form, formId }: { form: EditableForm; formId: string }) {
  const utils = trpc.useUtils();
  const [title,       setTitle]       = useState(form.title);
  const [description, setDescription] = useState(form.description ?? "");
  const [slug,        setSlug]        = useState(form.slug);
  const [visibility,  setVisibility]  = useState<FormVisibility>(form.visibility);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState("");

  const updateMutation = trpc.forms.updateForm.useMutation({
    onSuccess: () => {
      utils.forms.getFormById.invalidate({ id: formId });
      utils.forms.getMyForms.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (error) => setError(error.message),
  });

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    updateMutation.mutate({
      id:          formId,
      title:       title.trim(),
      description: description.trim() || undefined,
      slug:        slug.trim() || undefined,
      visibility,
    });
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6A6478]">Title *</label>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="bg-[#111118] border border-[#2a2a2a] rounded px-3 py-2 text-[#E8E0D0] text-sm placeholder-[#6A6478] focus:outline-none focus:border-[#B8960C] transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6A6478]">Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className="bg-[#111118] border border-[#2a2a2a] rounded px-3 py-2 text-[#E8E0D0] text-sm placeholder-[#6A6478] focus:outline-none focus:border-[#B8960C] transition-colors resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6A6478]">Slug</label>
        <div className="flex items-center bg-[#111118] border border-[#2a2a2a] rounded overflow-hidden focus-within:border-[#B8960C] transition-colors">
          <span className="px-3 py-2 text-[#6A6478] text-xs border-r border-[#2a2a2a] select-none">
            /f/
          </span>
          <input
            value={slug}
            onChange={(event) =>
              setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            className="flex-1 bg-transparent px-3 py-2 text-[#E8E0D0] text-sm focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#6A6478]">Visibility</label>
        <select
          value={visibility}
          onChange={(event) =>
            setVisibility(event.target.value === "unlisted" ? "unlisted" : "public")
          }
          className="bg-[#111118] border border-[#2a2a2a] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:outline-none focus:border-[#B8960C] transition-colors"
        >
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
        </select>
      </div>

      {error && (
        <p className="text-red-400 text-xs bg-red-900/20 border border-red-900 rounded px-3 py-1.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={updateMutation.isPending}
        className="px-4 py-2 bg-[#B8960C] text-[#06060F] rounded font-semibold text-sm hover:bg-[#a07d0a] disabled:opacity-50 transition-colors"
      >
        {saved ? "✓ Saved" : updateMutation.isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function EditFormPage() {
  const params = useParams<{ id: string }>();
  const formId = params.id;
  const utils  = trpc.useUtils();

  const [addingType, setAddingType] = useState<FieldType | null>(null);

  const { data: form, isLoading, error } = trpc.forms.getFormById.useQuery(
    { id: formId },
    { enabled: !!formId }
  );

  const publishMutation = trpc.forms.publishForm.useMutation({
    onSuccess: () => utils.forms.getFormById.invalidate({ id: formId }),
    onError:   (error) => alert(error.message),
  });

  const unpublishMutation = trpc.forms.unpublishForm.useMutation({
    onSuccess: () => utils.forms.getFormById.invalidate({ id: formId }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06060F] flex items-center justify-center">
        <p className="text-[#6A6478]">Loading form…</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-[#06060F] flex items-center justify-center">
        <p className="text-red-400">Form not found.</p>
      </div>
    );
  }

  const isPublished = form.status === "published";

  return (
    <div className="min-h-screen bg-[#06060F] text-[#E8E0D0]">
      {/* Top bar */}
      <div className="border-b border-[#1a1a1a] px-6 py-3 flex items-center justify-between sticky top-0 bg-[#06060F] z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-[#6A6478] hover:text-[#B8960C] text-sm transition-colors">
            ← Dashboard
          </Link>
          <span className="text-[#E8E0D0] text-sm font-medium truncate max-w-50">
            {form.title}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isPublished
                ? "bg-emerald-900 text-emerald-300"
                : "bg-zinc-700 text-zinc-300"
            }`}
          >
            {form.status}
          </span>
        </div>

        <div className="flex gap-2">
          {isPublished ? (
            <button
              onClick={() => unpublishMutation.mutate({ id: formId })}
              disabled={unpublishMutation.isPending}
              className="text-sm px-3 py-1.5 border border-zinc-600 text-zinc-400 rounded hover:bg-zinc-700/30 transition-colors"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => publishMutation.mutate({ id: formId })}
              disabled={publishMutation.isPending}
              className="text-sm px-3 py-1.5 border border-emerald-700 text-emerald-400 rounded hover:bg-emerald-900/20 transition-colors"
            >
              {publishMutation.isPending ? "Publishing…" : "Publish →"}
            </button>
          )}
        </div>
      </div>

      {/* Main layout — 2 columns */}
      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">

        {/* Left — Form metadata */}
        <aside>
          <h2 className="text-xs text-[#6A6478] uppercase tracking-wider font-semibold mb-4">
            Form Settings
          </h2>
          <MetadataPanel form={form} formId={formId} />
        </aside>

        {/* Right — Fields */}
        <main className="flex flex-col gap-6">
          <div>
            <h2 className="text-xs text-[#6A6478] uppercase tracking-wider font-semibold mb-4">
              Fields ({form.fields?.length ?? 0})
            </h2>
            <FieldList fields={form.fields ?? []} formId={formId} />
          </div>

          {/* Add field */}
          <div>
            <h3 className="text-xs text-[#6A6478] uppercase tracking-wider font-semibold mb-3">
              Add Field
            </h3>

            {addingType ? (
              <FieldEditor
                field={{ type: addingType }}
                formId={formId}
                onSaved={() => setAddingType(null)}
                onCancel={() => setAddingType(null)}
              />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {FIELD_TYPES.map((ft) => (
                  <button
                    key={ft.value}
                    onClick={() => setAddingType(ft.value)}
                    className="flex flex-col items-center gap-1 px-3 py-3 bg-[#111118] border border-[#2a2a2a] rounded hover:border-[#B8960C]/60 hover:bg-[#B8960C]/5 transition-colors"
                  >
                    <span className="text-lg text-[#B8960C]">{ft.icon}</span>
                    <span className="text-[10px] text-[#6A6478] text-center leading-tight">
                      {ft.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
