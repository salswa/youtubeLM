import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getUser();
  if (user) redirect(next ?? "/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — form */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm border-none shadow-none">
          <CardHeader className="items-center text-center">
            <Link
              href="/"
              className="mb-2 flex items-center gap-2 font-heading text-lg font-bold tracking-tight"
            >
              <span className="grid size-8 place-items-center rounded bg-primary font-bold text-primary-foreground">
                Y
              </span>
              YouTubeLM
            </Link>
            <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to build courses and track your learning.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleSignInButton next={next} />
            {error && (
              <p className="text-center text-sm text-destructive">
                Sign-in failed. Please try again.
              </p>
            )}
            <p className="text-center text-xs text-muted-foreground">
              By continuing you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right — editorial panel */}
      <div className="hidden flex-col justify-center bg-primary p-12 text-primary-foreground lg:flex">
        <p className="font-heading text-3xl leading-snug">
          &ldquo;The clearest videos on the internet, organized into real
          courses — with an AI tutor for every one.&rdquo;
        </p>
        <ul className="mt-8 space-y-3 text-sm opacity-90">
          <li>✓ Curate the best YouTube videos</li>
          <li>✓ Auto summaries, quizzes &amp; chat</li>
          <li>✓ Track progress across courses</li>
        </ul>
      </div>
    </div>
  );
}
