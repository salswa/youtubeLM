import { Badge } from "@/components/ui/badge";
import type { AiStatus } from "@/lib/types";

const MAP: Record<
  AiStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  idle: { label: "No AI", variant: "outline" },
  processing: { label: "Processing…", variant: "secondary" },
  ready: { label: "AI ready", variant: "default" },
  error: { label: "AI failed", variant: "destructive" },
  stale: { label: "Outdated", variant: "secondary" },
};

export function AiStatusBadge({ status }: { status: AiStatus }) {
  const { label, variant } = MAP[status] ?? MAP.idle;
  return <Badge variant={variant}>{label}</Badge>;
}
