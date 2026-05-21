import Link from "next/link";
import { ForgotPasswordForm } from "~/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,_#09070f_0%,_#15111f_45%,_#09070f_100%)] px-6 py-10 text-stone-100">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex flex-col justify-center gap-6">
          <Link
            href="/"
            className="text-sm uppercase tracking-[0.35em] text-stone-500 transition hover:text-stone-300"
          >
            RavenForm
          </Link>
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-stone-50">
            Recover the account without keeping the old password alive.
          </h1>
          <p className="max-w-lg text-lg leading-8 text-stone-400">
            Password reset now uses email OTP verification. Once the password changes, older sessions
            are invalidated from the database.
          </p>
        </section>
        <section className="flex items-center">
          <ForgotPasswordForm />
        </section>
      </div>
    </main>
  );
}
