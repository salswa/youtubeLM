import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Circle,
} from "lucide-react";
import type { AiStatus } from "@/lib/types";

export function AiStatusIcon({ status }: { status: AiStatus }) {
  switch (status) {
    case "processing":
      return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
    case "ready":
      return <CheckCircle2 className="size-4 text-green-600" />;
    case "error":
      return <AlertCircle className="size-4 text-destructive" />;
    case "stale":
      return <RefreshCw className="size-4 text-amber-600" />;
    default:
      return <Circle className="size-4 text-muted-foreground/40" />;
  }
}

/** Short human label for a status (for titles/tooltips). */
export function aiStatusLabel(status: AiStatus): string {
  return (
    {
      idle: "Not generated",
      processing: "Generating…",
      ready: "Ready",
      error: "Failed",
      stale: "Outdated — video changed",
    } as Record<AiStatus, string>
  )[status];
}
