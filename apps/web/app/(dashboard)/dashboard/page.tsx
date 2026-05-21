import { redirect } from "next/navigation";
import { LogoutButton } from "~/components/auth/logout-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getServerApi } from "~/trpc/server";

export default async function DashboardPage() {
  const api = await getServerApi();

  try {
    const user = await api.auth.me.query();

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,_#09070f_0%,_#14111d_46%,_#09070f_100%)] px-6 py-10 text-stone-100">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <header className="flex flex-col gap-4 rounded-3xl border border-stone-800 bg-black/35 p-8 shadow-2xl shadow-black/40 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">Protected dashboard</p>
              <h1 className="text-4xl font-semibold tracking-tight text-stone-50">
                Welcome back, {user.fullName}
              </h1>
              <p className="text-stone-400">
                Your session is active and the protected tRPC procedure returned your creator profile.
              </p>
            </div>
            <LogoutButton />
          </header>

          <section className="grid gap-6 md:grid-cols-3">
            <Card className="border-stone-800 bg-stone-950/50 py-0">
              <CardHeader>
                <CardDescription>Identity</CardDescription>
                <CardTitle className="text-xl text-stone-50">{user.fullName}</CardTitle>
              </CardHeader>
              <CardContent className="text-stone-400">{user.email}</CardContent>
            </Card>
            <Card className="border-stone-800 bg-stone-950/50 py-0">
              <CardHeader>
                <CardDescription>Account created</CardDescription>
                <CardTitle className="text-xl text-stone-50">
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(user.createdAt))}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-stone-400">Stored in PostgreSQL through Drizzle.</CardContent>
            </Card>
            <Card className="border-stone-800 bg-stone-950/50 py-0">
              <CardHeader>
                <CardDescription>Auth status</CardDescription>
                <CardTitle className="text-xl text-emerald-300">Session valid</CardTitle>
              </CardHeader>
              <CardContent className="text-stone-400">Cookie-backed protected route is working.</CardContent>
            </Card>
          </section>
        </div>
      </main>
    );
  } catch {
    redirect("/login");
  }
}
