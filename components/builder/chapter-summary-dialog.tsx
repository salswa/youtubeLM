"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AiStatusIcon,
  aiStatusLabel,
} from "@/components/builder/ai-status-icon";
import {
  getChapterAiContent,
  updateSummary,
  regenerateSummary,
} from "@/lib/actions/ai";
import type { AiStatus } from "@/lib/types";

export function ChapterSummaryDialog({
  chapterId,
  status,
  onStatusChange,
}: {
  chapterId: string;
  status: AiStatus;
  onStatusChange: (id: string, status: AiStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [savedSummary, setSavedSummary] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [busy, setBusy] = useState(false);

  const dirty = summary !== savedSummary;

  async function load() {
    setLoading(true);
    const data = await getChapterAiContent(chapterId);
    const content = data?.summary?.content ?? "";
    setSummary(content);
    setSavedSummary(content);
    setReviewed(data?.summary?.reviewed_by_author ?? false);
    setHasContent(!!data?.summary);
    setLoading(false);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) load();
  }

  async function save() {
    setBusy(true);
    const res = await updateSummary(chapterId, summary);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setSavedSummary(summary);
    setReviewed(true);
    onStatusChange(chapterId, "ready");
    toast.success("Summary saved & marked reviewed");
  }

  async function regenerate() {
    if (hasContent && !confirm("Regenerate the summary? This overwrites edits.")) {
      return;
    }
    setBusy(true);
    onStatusChange(chapterId, "processing");
    const res = await regenerateSummary(chapterId);
    setBusy(false);
    if (!res.ok) {
      onStatusChange(chapterId, "error");
      return toast.error(res.error);
    }
    onStatusChange(chapterId, res.status);
    toast.success("Summary generated");
    load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" title={aiStatusLabel(status)}>
            <AiStatusIcon status={status} /> Summary
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Chapter summary</DialogTitle>
          <DialogDescription>
            Edit the AI summary (saving marks it reviewed) or regenerate it from
            the video.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          {reviewed ? (
            <Badge>Reviewed by author</Badge>
          ) : hasContent ? (
            <Badge variant="secondary">AI-generated</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">
              Not generated yet
            </span>
          )}
          <Button variant="outline" size="sm" onClick={regenerate} disabled={busy}>
            <RefreshCw className="size-4" />
            {hasContent ? "Regenerate" : "Generate"}
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : (
          <>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="No summary yet — click Generate."
              className="min-h-56"
            />
            <Button onClick={save} disabled={busy || !dirty || !summary.trim()}>
              Save summary
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
