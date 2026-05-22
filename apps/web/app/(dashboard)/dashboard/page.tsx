"use client";

import Link from "next/link";
import { trpc, type RouterOutputs } from "~/lib/trpc";

type DashboardForm = RouterOutputs["forms"]["getMyForms"][number];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft:     "bg-zinc-700 text-zinc-300",
    published: "bg-emerald-900 text-emerald-300",
    archived:  "bg-red-900 text-red-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? map.draft}`}>
      {status}
    </span>
  );
}

// ─── Form Card ────────────────────────────────────────────────────────────────

function FormCard({
  form,
  onDelete,
  onPublish,
  onUnpublish,
}: {
  form: DashboardForm;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
}) {
  return (
    <div className="border border-[#2a2a2a] bg-[#111118] rounded-lg p-5 flex flex-col gap-3 hover:border-[#B8960C]/40 transition-colors">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[#E8E0D0] font-semibold text-base leading-tight">
            {form.title}
          </h3>
          <p className="text-[#6A6478] text-xs mt-0.5">/{form.slug}</p>
        </div>
        <StatusBadge status={form.status} />
      </div>

      {/* Meta */}
      <div className="text-[#6A6478] text-xs flex gap-4">
        <span>{form.fieldCount} field{form.fieldCount !== 1 ? "s" : ""}</span>
        <span>{form.visibility}</span>
        <span>{new Date(form.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-1 flex-wrap">
        <Link
          href={`/forms/${form.id}/edit`}
          className="text-xs px-3 py-1.5 rounded border border-[#B8960C]/50 text-[#B8960C] hover:bg-[#B8960C]/10 transition-colors"
        >
          Edit
        </Link>

        {form.status === "published" ? (
          <button
            onClick={() => onUnpublish(form.id)}
            className="text-xs px-3 py-1.5 rounded border border-zinc-600 text-zinc-400 hover:bg-zinc-700/30 transition-colors"
          >
            Unpublish
          </button>
        ) : (
          <button
            onClick={() => onPublish(form.id)}
            className="text-xs px-3 py-1.5 rounded border border-emerald-700 text-emerald-400 hover:bg-emerald-900/20 transition-colors"
          >
            Publish
          </button>
        )}

        <button
          onClick={() => {
            if (confirm("Delete this form? This cannot be undone.")) {
              onDelete(form.id);
            }
          }}
          className="text-xs px-3 py-1.5 rounded border border-red-900 text-red-400 hover:bg-red-900/20 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const utils = trpc.useUtils();

  const { data: forms, isLoading, error } = trpc.forms.getMyForms.useQuery();

  const deleteMutation   = trpc.forms.deleteForm.useMutation({
    onSuccess: () => utils.forms.getMyForms.invalidate(),
  });
  const publishMutation  = trpc.forms.publishForm.useMutation({
    onSuccess: () => utils.forms.getMyForms.invalidate(),
    onError:   (error) => alert(error.message),
  });
  const unpublishMutation = trpc.forms.unpublishForm.useMutation({
    onSuccess: () => utils.forms.getMyForms.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06060F] flex items-center justify-center">
        <p className="text-[#6A6478]">Loading your forms…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#06060F] flex items-center justify-center">
        <p className="text-red-400">Failed to load forms.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06060F] text-[#E8E0D0]">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-[Cinzel,serif] text-[#B8960C]">
            🐦‍⬛ RavenForm
          </h1>
          <p className="text-[#6A6478] text-xs mt-0.5">Your forms</p>
        </div>
        <Link
          href="/forms/new"
          className="px-4 py-2 bg-[#B8960C] text-[#06060F] rounded font-semibold text-sm hover:bg-[#a07d0a] transition-colors"
        >
          + New Form
        </Link>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-4xl mx-auto">
        {forms && forms.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#6A6478] text-lg">No ravens have taken flight yet.</p>
            <Link
              href="/forms/new"
              className="inline-block mt-4 px-5 py-2.5 bg-[#B8960C] text-[#06060F] rounded font-semibold text-sm hover:bg-[#a07d0a] transition-colors"
            >
              Create your first form
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {forms?.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onDelete={(id) => deleteMutation.mutate({ id })}
                onPublish={(id) => publishMutation.mutate({ id })}
                onUnpublish={(id) => unpublishMutation.mutate({ id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
