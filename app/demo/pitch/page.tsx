import type { Metadata } from "next";
import { PitchDeck } from "@/components/demo/pitch-deck";
import { SLIDES } from "../content";

export const metadata: Metadata = {
  title: "YouTubeLM — Pitch Deck",
  description: "The YouTubeLM pitch: idea, market, and what's next.",
};

export default function PitchPage() {
  return <PitchDeck slides={SLIDES} />;
}
