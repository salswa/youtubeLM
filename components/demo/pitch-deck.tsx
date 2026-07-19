"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Slide } from "@/app/demo/content";

export function PitchDeck({ slides }: { slides: Slide[] }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const last = slides.length - 1;

  const next = useCallback(() => setI((n) => Math.min(n + 1, last)), [last]);
  const prev = useCallback(() => setI((n) => Math.max(n - 1, 0)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          setI(0);
          break;
        case "End":
          setI(last);
          break;
        case "Escape":
          router.push("/demo");
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, last, router]);

  const slide = slides[i];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 text-sm text-muted-foreground">
        <span className="font-heading tracking-tight">YouTubeLM</span>
        <div className="flex items-center gap-4">
          <span className="tabular-nums">
            {i + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={() => router.push("/demo")}
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            aria-label="Exit deck"
          >
            <X className="size-4" /> Exit
          </button>
        </div>
      </div>

      {/* Slide surface — click anywhere to advance */}
      <button
        type="button"
        onClick={next}
        className="flex flex-1 cursor-pointer flex-col justify-center px-8 text-left sm:px-20"
        aria-label="Next slide"
      >
        <div className="mx-auto w-full max-w-4xl">
          <p className="font-heading text-sm uppercase tracking-[0.2em] text-muted-foreground">
            {slide.kicker}
          </p>
          <h2 className="mt-6 font-heading text-4xl leading-tight tracking-tight sm:text-6xl">
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p className="mt-6 max-w-2xl text-xl text-muted-foreground sm:text-2xl">
              {slide.subtitle}
            </p>
          )}
          {slide.points && (
            <ul className="mt-8 space-y-4">
              {slide.points.map((p, k) => (
                <li key={k} className="flex gap-3 text-lg sm:text-xl">
                  <span className="mt-2 size-2 shrink-0 bg-primary" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
          {slide.footer && (
            <p className="mt-10 border-l-2 border-primary pl-4 text-base italic text-muted-foreground">
              {slide.footer}
            </p>
          )}
        </div>
      </button>

      {/* Bottom controls */}
      <div className="flex items-center justify-between px-6 py-4">
        <button
          type="button"
          onClick={prev}
          disabled={i === 0}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-4" /> Prev
        </button>

        <div className="flex items-center gap-2">
          {slides.map((_, k) => (
            <button
              key={k}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Go to slide ${k + 1}`}
              className={`size-2 transition-colors ${
                k === i ? "bg-primary" : "bg-border hover:bg-muted-foreground"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          disabled={i === last}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          Next <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
