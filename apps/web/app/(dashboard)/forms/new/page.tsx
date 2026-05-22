"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc, type RouterInputs } from "~/lib/trpc";

type FormVisibility = RouterInputs["forms"]["createForm"]["visibility"];

export default function NewFormPage() {
  const router = useRouter();

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [slug,        setSlug]        = useState("");
  const [visibility,  setVisibility]  = useState<FormVisibility>("public");
  const [error,       setError]       = useState("");

  const createMutation = trpc.forms.createForm.useMutation({
    onSuccess: (form) => {
      router.push(`/forms/${form.id}/edit`);
    },
    onError: (error) => setError(error.message),
  });

  function handleTitleChange(val: string) {
    setTitle(val);
    // Auto-generate slug from title if user hasn't typed one
    if (!slug) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 60)
      );
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    createMutation.mutate({
      title:      title.trim(),
      description: description.trim() || undefined,
      slug:       slug.trim() || undefined,
      visibility,
    });
  }

  return (
    <div className="min-h-screen bg-[#06060F] text-[#E8E0D0]">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-[#6A6478] hover:text-[#B8960C] text-sm transition-colors">
          ← Dashboard
        </Link>
        <h1 className="text-base font-semibold text-[#E8E0D0]">New Form</h1>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-6 py-12">
        <h2 className="text-2xl font-[Cinzel,serif] text-[#B8960C] mb-1">Create a Form</h2>
        <p className="text-[#6A6478] text-sm mb-8">A raven awaits its first message.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E8E0D0]">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="e.g. Night's Watch Oath Form"
              className="bg-[#111118] border border-[#2a2a2a] rounded px-3 py-2.5 text-[#E8E0D0] text-sm placeholder-[#6A6478] focus:outline-none focus:border-[#B8960C] transition-colors"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E8E0D0]">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description…"
              rows={3}
              className="bg-[#111118] border border-[#2a2a2a] rounded px-3 py-2.5 text-[#E8E0D0] text-sm placeholder-[#6A6478] focus:outline-none focus:border-[#B8960C] transition-colors resize-none"
            />
          </div>

          {/* Slug */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E8E0D0]">Slug</label>
            <div className="flex items-center bg-[#111118] border border-[#2a2a2a] rounded overflow-hidden focus-within:border-[#B8960C] transition-colors">
              <span className="px-3 py-2.5 text-[#6A6478] text-sm border-r border-[#2a2a2a] select-none">
                /f/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(event) =>
                  setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                placeholder="my-form-slug"
                className="flex-1 bg-transparent px-3 py-2.5 text-[#E8E0D0] text-sm placeholder-[#6A6478] focus:outline-none"
              />
            </div>
            <p className="text-[#6A6478] text-xs">Leave blank to auto-generate from title.</p>
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E8E0D0]">Visibility</label>
            <select
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value === "unlisted" ? "unlisted" : "public")
              }
              className="bg-[#111118] border border-[#2a2a2a] rounded px-3 py-2.5 text-[#E8E0D0] text-sm focus:outline-none focus:border-[#B8960C] transition-colors"
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-900 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-2 px-5 py-2.5 bg-[#B8960C] text-[#06060F] rounded font-semibold text-sm hover:bg-[#a07d0a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createMutation.isPending ? "Creating…" : "Create Form →"}
          </button>
        </form>
      </div>
    </div>
  );
}
