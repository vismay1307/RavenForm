import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "~/components/auth/auth-form";
import { getServerApi } from "~/trpc/server";

export default async function RegisterPage() {
  const api = await getServerApi();

  try {
    await api.auth.me.query();
    redirect("/dashboard");
  } catch {}

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(184,150,12,0.16),transparent_34%),linear-gradient(180deg,#0a0910_0%,#18111d_50%,#09070f_100%)] px-6 py-10 text-stone-100">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex flex-col justify-center gap-6">
          <Link href="/" className="text-sm uppercase tracking-[0.35em] text-stone-500 transition hover:text-stone-300">
            RavenForm
          </Link>
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-stone-50">
            Create the first authenticated entry in your realm.
          </h1>
          <p className="max-w-lg text-lg leading-8 text-stone-400">
            Register with name, email, and password. The account is created only after the email OTP
            is verified.
          </p>
        </section>
        <section className="flex items-center">
          <AuthForm mode="register" />
        </section>
      </div>
    </main>
  );
}
