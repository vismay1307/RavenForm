import Link from "next/link";
import { Button } from "~/components/ui/button";
import { getServerApi } from "~/trpc/server";

export default async function Home() {
  const api = await getServerApi();
  const health = await api.health.getHealth.query();
  let user = null;

  try {
    user = await api.auth.me.query();
  } catch {}

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(184,150,12,0.18),_transparent_38%),linear-gradient(180deg,_#09070f_0%,_#121019_45%,_#05050a_100%)] text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-12">
        <div className="inline-flex w-fit items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-xs uppercase tracking-[0.35em] text-amber-200">
          RavenForm authentication
        </div>
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.5em] text-stone-400">Messages carried across the realm</p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-stone-50 sm:text-6xl">
              Email and session auth is now wired into the monorepo.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-300">
              Register a creator account, sign in, and access the protected dashboard through
              tRPC-backed cookies.
            </p>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <Button asChild size="lg" className="bg-amber-500 text-black hover:bg-amber-400">
                  <Link href="/dashboard">Open dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="bg-amber-500 text-black hover:bg-amber-400">
                    <Link href="/register">Create account</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-stone-700 bg-stone-950/40">
                    <Link href="/login">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-stone-800 bg-black/30 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
            <p className="text-sm uppercase tracking-[0.35em] text-stone-500">System status</p>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-stone-800 bg-stone-950/70 px-4 py-3">
                <span className="text-stone-400">API health</span>
                <span className="font-medium text-emerald-300">{health.status}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-stone-800 bg-stone-950/70 px-4 py-3">
                <span className="text-stone-400">Session state</span>
                <span className="font-medium text-amber-200">
                  {user ? `Signed in as ${user.fullName}` : "Guest visitor"}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
