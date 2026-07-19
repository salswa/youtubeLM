import type { Metadata } from "next";
import Link from "next/link";
import { Presentation, PlayCircle, ArrowRight, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRODUCT, CRITERIA } from "./content";

export const metadata: Metadata = {
  title: "YouTubeLM — Hackathon Demo",
  description: PRODUCT.blurb,
};

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <section className="text-center">
        <Badge variant="secondary" className="mb-6 uppercase tracking-wide">
          Hackathon Demo
        </Badge>
        <h1 className="mx-auto max-w-3xl font-heading text-5xl leading-tight tracking-tight">
          {PRODUCT.name}
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">{PRODUCT.tagline}</p>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {PRODUCT.blurb}
        </p>
      </section>

      {/* Primary actions — pitch + video routes */}
      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        <Link
          href="/demo/pitch"
          className="group flex flex-col justify-between border bg-card p-6 transition-colors hover:bg-muted"
        >
          <div>
            <Presentation className="size-7 text-primary" />
            <h2 className="mt-4 font-heading text-2xl tracking-tight">
              Pitch deck
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Six slides on the idea, the market, and what&apos;s next. Use your
              arrow keys or click to advance.
            </p>
          </div>
          <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium">
            Open deck
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/demo/video"
          className="group flex flex-col justify-between border bg-card p-6 transition-colors hover:bg-muted"
        >
          <div>
            <PlayCircle className="size-7 text-primary" />
            <h2 className="mt-4 font-heading text-2xl tracking-tight">
              Demo video
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A three-minute walkthrough — problem, product, payoff — from build
              to AI study tools.
            </p>
          </div>
          <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium">
            Watch demo
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>

      {/* Judging criteria */}
      <section className="mt-16">
        <h2 className="font-heading text-2xl tracking-tight">
          How we stack up
        </h2>
        <div className="mt-6 grid gap-px overflow-hidden border bg-border sm:grid-cols-2">
          {CRITERIA.map((c) => (
            <div key={c.n} className="bg-card p-6">
              <div className="flex items-baseline gap-3">
                <span className="font-heading text-sm text-muted-foreground">
                  {c.n}
                </span>
                <h3 className="font-heading text-lg tracking-tight">
                  {c.title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={PRODUCT.liveUrl}
          className={buttonVariants({ size: "lg" })}
        >
          <ExternalLink className="size-4" /> Try it live
        </Link>
        <Link
          href="/courses"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          Browse courses
        </Link>
      </section>
    </main>
  );
}
