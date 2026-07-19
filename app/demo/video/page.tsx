import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Presentation } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { YouTubeEmbed } from "@/components/player/youtube-embed";
import { extractYoutubeId } from "@/lib/schemas/course";
import { DEMO_VIDEO_URL, PRODUCT } from "../content";

export const metadata: Metadata = {
  title: "YouTubeLM — Demo Video",
  description: "A three-minute walkthrough of YouTubeLM.",
};

export default function DemoVideoPage() {
  const videoId = extractYoutubeId(DEMO_VIDEO_URL);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/demo"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to demo
      </Link>

      <h1 className="mt-6 font-heading text-4xl tracking-tight">Demo video</h1>
      <p className="mt-2 text-muted-foreground">
        Three minutes: the problem with learning on YouTube, {PRODUCT.name}{" "}
        turning videos into a course, and the payoff.
      </p>

      <div className="mt-8">
        {videoId ? (
          <YouTubeEmbed videoId={videoId} title={`${PRODUCT.name} demo`} />
        ) : (
          <div className="grid aspect-video w-full place-items-center border bg-muted text-center text-sm text-muted-foreground">
            <span>Demo video coming soon.</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/demo/pitch" className={buttonVariants({ size: "lg" })}>
          <Presentation className="size-4" /> View the pitch deck
        </Link>
        <Link
          href="/"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          Try it live
        </Link>
      </div>
    </main>
  );
}
