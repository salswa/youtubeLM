import { SiteNav } from "@/components/site-nav";

export default function CoursesPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-heading text-3xl tracking-tight">Browse courses</h1>
        <p className="mt-1 text-muted-foreground">
          Public courses built by the community — coming in Phase 2.
        </p>
      </main>
    </>
  );
}
