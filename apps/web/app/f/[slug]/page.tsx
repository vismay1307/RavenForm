"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";

type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "number"
  | "single_select"
  | "multi_select"
  | "rating"
  | "date"
  | "yes_no";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string | null;
  required: boolean;
  options?: { label: string; value: string }[] | null;
  sortOrder: number;
}

// ─── Rating field (⚔ icons) ───────────────────────────────────────────────────

function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "28px",
            color: n <= (hovered || value) ? "#B8960C" : "#3A3448",
            transition: "color 0.15s",
            padding: "4px",
          }}
          aria-label={`Rating ${n}`}
        >
          ⚔
        </button>
      ))}
    </div>
  );
}

// ─── Single field renderer ────────────────────────────────────────────────────

function FieldRenderer({
  field,
  value,
  onChange,
  error,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#111118",
    border: `1.5px solid ${error ? "#8B1A1A" : "#2A2438"}`,
    borderRadius: "6px",
    color: "#E8E0D0",
    padding: "10px 14px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const options = (field.options as { label: string; value: string }[] | null) ?? [];

  switch (field.type) {
    case "short_text":
    case "email":
      return (
        <input
          type={field.type === "email" ? "email" : "text"}
          placeholder={field.placeholder ?? ""}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
      );

    case "long_text":
      return (
        <textarea
          placeholder={field.placeholder ?? ""}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      );

    case "number":
      return (
        <input
          type="number"
          placeholder={field.placeholder ?? ""}
          value={(value as string) ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
          style={inputStyle}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
      );

    case "single_select":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {options.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                color: "#E8E0D0",
              }}
            >
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                style={{ accentColor: "#B8960C", width: "16px", height: "16px" }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      );

    case "multi_select": {
      const selected = (value as string[]) ?? [];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {options.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                color: "#E8E0D0",
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selected, opt.value]);
                  } else {
                    onChange(selected.filter((v) => v !== opt.value));
                  }
                }}
                style={{ accentColor: "#B8960C", width: "16px", height: "16px" }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      );
    }

    case "rating":
      return (
        <RatingInput
          value={(value as number) ?? 0}
          onChange={onChange}
        />
      );

    case "yes_no":
      return (
        <div style={{ display: "flex", gap: "12px" }}>
          {(["Yes", "No"] as const).map((opt) => {
            const boolVal = opt === "Yes";
            const active = value === boolVal;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(boolVal)}
                style={{
                  padding: "10px 32px",
                  borderRadius: "6px",
                  border: `1.5px solid ${active ? "#B8960C" : "#2A2438"}`,
                  background: active ? "rgba(184,150,12,0.15)" : "#111118",
                  color: active ? "#B8960C" : "#6A6478",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: active ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );

    default:
      return null;
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { data, isLoading, error } = trpc.public.getForm.useQuery({ slug });
  const submitMutation = trpc.public.submitResponse.useMutation();

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [respondentEmail, setRespondentEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");

  function setAnswer(fieldId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }

  function validate(fields: FormField[]): boolean {
    const errors: Record<string, string> = {};

    for (const field of fields) {
      if (!field.required) continue;
      const val = answers[field.id];

      if (val === undefined || val === null || val === "") {
        errors[field.id] = "This field is required.";
      } else if (field.type === "multi_select" && Array.isArray(val) && val.length === 0) {
        errors[field.id] = "Select at least one option.";
      } else if (field.type === "rating" && (!val || (val as number) < 1)) {
        errors[field.id] = "Please give a rating.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;

    if (!validate(data.fields as FormField[])) return;

    try {
      await submitMutation.mutateAsync({
        slug,
        answers,
        respondentEmail: respondentEmail || undefined,
      });
      router.push(`/f/${slug}/success`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "The raven could not complete its journey.";
      setSubmitError(msg);
    }
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <PageShell>
        <div style={{ textAlign: "center", paddingTop: "80px" }}>
          <p style={{ color: "#6A6478", fontSize: "18px", fontFamily: "Cinzel, serif" }}>
            The raven is finding its way...
          </p>
        </div>
      </PageShell>
    );
  }

  // ── Error / Not found ──
  if (error || !data) {
    return (
      <PageShell>
        <div style={{ textAlign: "center", paddingTop: "80px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🐦‍⬛</div>
          <h2
            style={{
              color: "#E8E0D0",
              fontFamily: "Cinzel, serif",
              fontSize: "22px",
              marginBottom: "8px",
            }}
          >
            This raven never reached its destination.
          </h2>
          <p style={{ color: "#6A6478", fontSize: "14px" }}>
            The form you are looking for does not exist or is no longer published.
          </p>
        </div>
      </PageShell>
    );
  }

  const { form, fields } = data as {
    form: { title: string; description?: string | null };
    fields: FormField[];
  };

  // ── Form ──
  return (
    <PageShell>
      <div
        style={{
          maxWidth: "640px",
          margin: "0 auto",
          padding: "48px 24px 80px",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontSize: "28px", marginBottom: "12px" }}>🐦‍⬛</div>
          <h1
            style={{
              fontFamily: "Cinzel, serif",
              fontSize: "clamp(22px, 4vw, 32px)",
              color: "#E8E0D0",
              marginBottom: "12px",
              lineHeight: 1.3,
            }}
          >
            {form.title}
          </h1>
          {form.description && (
            <p style={{ color: "#6A6478", fontSize: "15px", lineHeight: 1.6 }}>
              {form.description}
            </p>
          )}
          <div
            style={{
              height: "2px",
              background:
                "linear-gradient(90deg, transparent, #B8960C, #8B1A1A, transparent)",
              marginTop: "24px",
            }}
          />
        </div>

        {/* Fields */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {fields.map((field) => (
              <div key={field.id}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "10px",
                    color: "#E8E0D0",
                    fontSize: "15px",
                    fontWeight: 500,
                  }}
                >
                  {field.label}
                  {field.required && (
                    <span style={{ color: "#8B1A1A", marginLeft: "4px" }}>*</span>
                  )}
                </label>
                <FieldRenderer
                  field={field}
                  value={answers[field.id]}
                  onChange={(v) => setAnswer(field.id, v)}
                  error={fieldErrors[field.id]}
                />
                {fieldErrors[field.id] && (
                  <p
                    style={{
                      color: "#8B1A1A",
                      fontSize: "13px",
                      marginTop: "6px",
                    }}
                  >
                    {fieldErrors[field.id]}
                  </p>
                )}
              </div>
            ))}

            {/* Optional respondent email */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  color: "#6A6478",
                  fontSize: "14px",
                }}
              >
                Your email (optional — for a receipt)
              </label>
              <input
                type="email"
                placeholder="maester@citadel.gov"
                value={respondentEmail}
                onChange={(e) => setRespondentEmail(e.target.value)}
                style={{
                  width: "100%",
                  background: "#111118",
                  border: "1.5px solid #2A2438",
                  borderRadius: "6px",
                  color: "#E8E0D0",
                  padding: "10px 14px",
                  fontSize: "15px",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Submit error */}
            {submitError && (
              <div
                style={{
                  background: "rgba(139,26,26,0.15)",
                  border: "1px solid #8B1A1A",
                  borderRadius: "6px",
                  padding: "12px 16px",
                  color: "#E8E0D0",
                  fontSize: "14px",
                }}
              >
                {submitError}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitMutation.isPending}
              style={{
                background: submitMutation.isPending
                  ? "#2A2438"
                  : "linear-gradient(135deg, #B8960C, #8B4A0C)",
                border: "none",
                borderRadius: "8px",
                color: submitMutation.isPending ? "#6A6478" : "#06060F",
                cursor: submitMutation.isPending ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: 700,
                fontFamily: "Cinzel, serif",
                padding: "14px 32px",
                width: "100%",
                transition: "opacity 0.15s",
                letterSpacing: "0.04em",
              }}
            >
              {submitMutation.isPending ? "Sending raven..." : "Send your Raven →"}
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}

// ─── Shared shell ─────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#06060F",
        color: "#E8E0D0",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;500;600&display=swap"
      />
      {children}
    </div>
  );
}