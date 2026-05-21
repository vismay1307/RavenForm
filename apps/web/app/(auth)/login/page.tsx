import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "~/components/auth/auth-form";
import { getServerApi } from "~/trpc/server";

export default async function LoginPage() {
  const api = await getServerApi();

  try {
    await api.auth.me.query();
    redirect("/dashboard");
  } catch {}

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,_#07070b_0%,_#15111f_45%,_#09070f_100%)] px-6 py-10 text-stone-100">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex flex-col justify-center gap-6">
          <Link href="/" className="text-sm uppercase tracking-[0.35em] text-stone-500 transition hover:text-stone-300">
            RavenForm
          </Link>
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-stone-50">
            Every creator needs a guarded doorway.
          </h1>
          <p className="max-w-lg text-lg leading-8 text-stone-400">
            Sign in to your creator account and continue building the product from the protected
            side of the realm.
          </p>
        </section>
        <section className="flex items-center">
          <AuthForm mode="login" />
        </section>
      </div>
    </main>
  );
}
