import { SiteNav } from "@/components/site-nav";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-heading text-3xl tracking-tight">
          Welcome back 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Signed in as {user.email}
        </p>

        <Card className="mt-8 max-w-md">
          <CardHeader>
            <CardTitle className="font-heading">Phase 1 complete</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Auth and the app shell are working. Course building, enrollment, and
            progress land in Phase 2.
          </CardContent>
        </Card>
      </main>
    </>
  );
}
