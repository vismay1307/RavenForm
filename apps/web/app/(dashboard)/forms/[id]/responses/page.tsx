"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc, type RouterOutputs } from "~/lib/trpc";

type ResponseListOutput = RouterOutputs["responses"]["list"];
type ResponseItem = ResponseListOutput["items"][number];
type AnalyticsOutput = RouterOutputs["responses"]["getAnalytics"];

function formatAnswer(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#111118] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[#6A6478]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#E8E0D0]">{value}</p>
      <p className="mt-1 text-xs text-[#6A6478]">{hint}</p>
    </div>
  );
}

function FieldSummaryCard({
  summary,
}: {
  summary: AnalyticsOutput["fieldSummaries"][number];
}) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#111118] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#E8E0D0]">{summary.label}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#6A6478]">
            {summary.type.replace(/_/g, " ")}
          </p>
        </div>
        {summary.avgRating !== null && (
          <span className="rounded-full border border-[#B8960C]/40 bg-[#B8960C]/10 px-3 py-1 text-xs font-medium text-[#B8960C]">
            Avg {summary.avgRating}/5
          </span>
        )}
      </div>

      {summary.breakdown.length > 0 ? (
        <div className="mt-4 space-y-3">
          {summary.breakdown.slice(0, 6).map((item) => (
            <div key={`${summary.fieldId}-${item.value}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs text-[#E8E0D0]">
                <span className="truncate">{item.value}</span>
                <span className="text-[#6A6478]">{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#1a1a24]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#B8960C] to-[#8B4A0C]"
                  style={{
                    width: `${Math.max(8, Math.min(100, item.count * 12))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#6A6478]">
          Breakdown is available for select and rating fields after submissions arrive.
        </p>
      )}
    </div>
  );
}

function ResponseRow({
  response,
  labels,
  onDelete,
  isDeleting,
}: {
  response: ResponseItem;
  labels: Record<string, string>;
  onDelete: (responseId: string) => void;
  isDeleting: boolean;
}) {
  const answerEntries = Object.entries(response.answers);

  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#111118] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#E8E0D0]">
            {response.respondentEmail || "Anonymous respondent"}
          </p>
          <p className="mt-1 text-xs text-[#6A6478]">
            Submitted {new Date(response.createdAt).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(response.id)}
          disabled={isDeleting}
          className="rounded border border-red-900 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-900/20 disabled:opacity-50"
        >
          {isDeleting ? "Removing..." : "Delete"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {answerEntries.map(([fieldId, value]) => (
          <div key={fieldId} className="rounded-lg border border-[#1f1f27] bg-[#0c0c14] p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[#6A6478]">
              {labels[fieldId] ?? "Field"}
            </p>
            <p className="mt-1 text-sm text-[#E8E0D0]">{formatAnswer(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FormResponsesPage() {
  const params = useParams<{ id: string }>();
  const formId = params.id;
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const formQuery = trpc.forms.getFormById.useQuery(
    { id: formId },
    { enabled: !!formId }
  );
  const responsesQuery = trpc.responses.list.useQuery(
    { formId, page, limit: 10 },
    { enabled: !!formId }
  );
  const analyticsQuery = trpc.responses.getAnalytics.useQuery(
    { formId },
    { enabled: !!formId }
  );

  const deleteMutation = trpc.responses.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.responses.list.invalidate({ formId }),
        utils.responses.getAnalytics.invalidate({ formId }),
      ]);
    },
  });

  const fieldLabels = useMemo(() => {
    const form = formQuery.data;
    if (!form) return {};

    return Object.fromEntries(form.fields.map((field) => [field.id, field.label]));
  }, [formQuery.data]);

  if (formQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06060F]">
        <p className="text-[#6A6478]">Loading raven traffic...</p>
      </div>
    );
  }

  if (formQuery.error || !formQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06060F]">
        <p className="text-red-400">Form not found.</p>
      </div>
    );
  }

  const form = formQuery.data;
  const analytics = analyticsQuery.data;
  const responses = responsesQuery.data;
  const latestSubmission = responses?.items[0]?.createdAt;

  async function handleExport() {
    try {
      setIsExporting(true);
      const payload = await utils.responses.export.fetch({ formId });
      downloadCsv(payload.csv, payload.filename);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#06060F] text-[#E8E0D0]">
      <div className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#06060F]/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/dashboard" className="text-[#6A6478] transition-colors hover:text-[#B8960C]">
                ← Dashboard
              </Link>
              <Link
                href={`/forms/${formId}/edit`}
                className="text-[#6A6478] transition-colors hover:text-[#B8960C]"
              >
                Edit form
              </Link>
            </div>
            <h1 className="mt-2 font-[Cinzel,serif] text-2xl text-[#B8960C]">
              {form.title}
            </h1>
            <p className="mt-1 text-sm text-[#6A6478]">Responses and delivery analytics</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {form.status === "published" && (
              <Link
                href={`/f/${form.slug}`}
                target="_blank"
                className="rounded border border-[#B8960C]/50 px-4 py-2 text-sm text-[#B8960C] transition-colors hover:bg-[#B8960C]/10"
              >
                Open public form
              </Link>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="rounded bg-[#B8960C] px-4 py-2 text-sm font-semibold text-[#06060F] transition-colors hover:bg-[#a07d0a] disabled:opacity-50"
            >
              {isExporting ? "Preparing CSV..." : "Export CSV"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8">
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total Responses"
            value={String(analytics?.totalResponses ?? 0)}
            hint="All submissions stored for this form."
          />
          <MetricCard
            label="Last Submission"
            value={latestSubmission ? new Date(latestSubmission).toLocaleDateString() : "—"}
            hint="Most recent response in the current feed."
          />
          <MetricCard
            label="30-Day Activity"
            value={String(analytics?.dailyData.reduce((sum, item) => sum + item.count, 0) ?? 0)}
            hint="Submissions counted over the last 30 days."
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111118] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#E8E0D0]">Recent Responses</h2>
                <p className="mt-1 text-sm text-[#6A6478]">
                  Review raw submissions and remove bad entries if needed.
                </p>
              </div>
              {responses && responses.total > 0 && (
                <span className="rounded-full border border-[#2a2a2a] px-3 py-1 text-xs text-[#6A6478]">
                  Page {responses.page} of {responses.totalPages}
                </span>
              )}
            </div>

            <div className="mt-5 space-y-4">
              {responsesQuery.isLoading && (
                <p className="text-sm text-[#6A6478]">Loading responses...</p>
              )}

              {!responsesQuery.isLoading && responses && responses.items.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#2a2a2a] bg-[#0c0c14] px-6 py-10 text-center">
                  <p className="text-[#E8E0D0]">No responses yet.</p>
                  <p className="mt-2 text-sm text-[#6A6478]">
                    Publish the form and share its public link to start collecting ravens.
                  </p>
                </div>
              )}

              {responses?.items.map((response) => (
                <ResponseRow
                  key={response.id}
                  response={response}
                  labels={fieldLabels}
                  onDelete={(responseId) => deleteMutation.mutate({ id: responseId })}
                  isDeleting={
                    deleteMutation.isPending && deleteMutation.variables?.id === response.id
                  }
                />
              ))}
            </div>

            {responses && responses.totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#1f1f27] pt-4">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded border border-[#2a2a2a] px-3 py-2 text-sm text-[#E8E0D0] transition-colors hover:border-[#B8960C]/40 hover:text-[#B8960C] disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      responses ? Math.min(responses.totalPages, current + 1) : current
                    )
                  }
                  disabled={page >= responses.totalPages}
                  className="rounded border border-[#2a2a2a] px-3 py-2 text-sm text-[#E8E0D0] transition-colors hover:border-[#B8960C]/40 hover:text-[#B8960C] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111118] p-5">
              <h2 className="text-lg font-semibold text-[#E8E0D0]">Daily Activity</h2>
              <p className="mt-1 text-sm text-[#6A6478]">
                30-day submission trail for this form.
              </p>

              <div className="mt-5 space-y-3">
                {analyticsQuery.isLoading && (
                  <p className="text-sm text-[#6A6478]">Loading activity...</p>
                )}

                {!analyticsQuery.isLoading && analytics && analytics.dailyData.length === 0 && (
                  <p className="text-sm text-[#6A6478]">No recent activity yet.</p>
                )}

                {analytics?.dailyData.map((entry) => (
                  <div key={entry.date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#E8E0D0]">
                      <span>{entry.date}</span>
                      <span className="text-[#6A6478]">{entry.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#1a1a24]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#B8960C] to-[#8B1A1A]"
                        style={{ width: `${Math.max(10, Math.min(100, entry.count * 10))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {analytics?.fieldSummaries.map((summary) => (
                <FieldSummaryCard key={summary.fieldId} summary={summary} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
