import Link from "next/link";
import { getUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";

export async function SiteNav() {
  const user = await getUser();

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded bg-primary font-bold text-primary-foreground">
            Y
          </span>
          YouTubeLM
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/courses"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Browse
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <span className="hidden text-muted-foreground sm:inline">
                {user.email}
              </span>
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
