import Link from "next/link";

export default function FormSuccessPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#06060F",
        color: "#E8E0D0",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Raven icon */}
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>🐦‍⬛</div>

        {/* Gold divider */}
        <div
          style={{
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, #B8960C, #8B1A1A, transparent)",
            marginBottom: "32px",
          }}
        />

        {/* Heading */}
        <h1
          style={{
            fontFamily: "Cinzel, serif",
            fontSize: "clamp(20px, 4vw, 28px)",
            color: "#E8E0D0",
            lineHeight: 1.4,
            marginBottom: "16px",
          }}
        >
          Your message has been sent across the realm.
        </h1>

        {/* Sub-text */}
        <p
          style={{
            color: "#6A6478",
            fontSize: "15px",
            lineHeight: 1.7,
            marginBottom: "40px",
            fontStyle: "italic",
          }}
        >
          Valar Morghulis — All forms must be filled
        </p>

        {/* Card */}
        <div
          style={{
            background: "#111118",
            border: "1px solid #2A2438",
            borderRadius: "10px",
            padding: "24px",
            marginBottom: "32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Gold top border accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "2px",
              background:
                "linear-gradient(90deg, transparent, #B8960C, transparent)",
            }}
          />
          <p style={{ color: "#E8E0D0", fontSize: "14px", lineHeight: 1.6 }}>
            The maester has received your scroll. Your raven completed its journey
            without incident — a rare thing in these troubled times.
          </p>
        </div>

        {/* CTA button */}
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #B8960C, #8B4A0C)",
            borderRadius: "8px",
            color: "#06060F",
            textDecoration: "none",
            fontSize: "15px",
            fontWeight: 700,
            fontFamily: "Cinzel, serif",
            padding: "13px 32px",
            letterSpacing: "0.04em",
            transition: "opacity 0.15s",
          }}
        >
          Return to the Realm →
        </Link>

        {/* Footer */}
        <p
          style={{
            color: "#3A3448",
            fontSize: "12px",
            marginTop: "40px",
          }}
        >
          🐦‍⬛ RavenForm — Messages carried across the realm
        </p>
      </div>
    </div>
  );
}