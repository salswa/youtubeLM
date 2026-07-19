"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowLeft, Plus, Save, Sparkles, Eye } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UnitCard } from "@/components/builder/unit-card";

import {
  saveCourseTree,
  publishCourse,
  unpublishCourse,
  type SaveCourseTreeInput,
} from "@/lib/actions/course-tree";
import {
  getPendingAiChapters,
  generateChapterSummary,
  generateChapterQuiz,
} from "@/lib/actions/ai";
import { FinalQuizDialog } from "@/components/builder/final-quiz-dialog";
import { AiStatusIcon } from "@/components/builder/ai-status-icon";
import { extractYoutubeId } from "@/lib/schemas/course";
import type {
  CourseTree,
  UnitWithChapters,
  CourseStatus,
  AiStatus,
  AiKind,
} from "@/lib/types";

function findChapter(units: UnitWithChapters[], id: string | number) {
  for (let u = 0; u < units.length; u++) {
    const c = units[u].chapters.findIndex((ch) => ch.id === id);
    if (c !== -1) return { unitIndex: u, chapterIndex: c };
  }
  return null;
}

const FINAL_QUIZ_LABEL: Record<AiStatus, string> = {
  idle: "Not generated",
  processing: "Generating…",
  ready: "Ready",
  error: "Failed",
  stale: "Needs update",
};

interface Meta {
  title: string;
  subject: string;
  description: string;
}
interface Backup {
  meta: Meta;
  units: UnitWithChapters[];
  ts: number;
}

export function CourseBuilder({ course }: { course: CourseTree }) {
  const router = useRouter();
  const storageKey = `builder:${course.id}`;

  const [units, setUnitsState] = useState<UnitWithChapters[]>(course.units);
  const unitsRef = useRef(units);
  const commit = (next: UnitWithChapters[]) => {
    unitsRef.current = next;
    setUnitsState(next);
  };

  const [meta, setMeta] = useState<Meta>({
    title: course.title,
    subject: course.subject,
    description: course.description,
  });
  const [status, setStatus] = useState<CourseStatus>(course.status);
  const [hasUnpublished, setHasUnpublished] = useState(
    course.has_unpublished_changes ?? false,
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [finalQuizStatus, setFinalQuizStatus] = useState<AiStatus>(
    course.final_quiz_status ?? "idle",
  );

  const [restore, setRestore] = useState<Backup | null>(null);

  const markDirty = () => setDirty(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const totalChapters = units.reduce((n, u) => n + u.chapters.length, 0);
  const withVideo = units.flatMap((u) => u.chapters).filter(
    (c) => c.youtube_video_id,
  );
  const chaptersWithVideo = withVideo.length;
  const summariesReady = withVideo.filter(
    (c) => c.summary_status === "ready",
  ).length;
  const quizzesReady = withVideo.filter(
    (c) => c.quiz_status === "ready",
  ).length;
  const isPending = (s: AiStatus) =>
    s === "idle" || s === "stale" || s === "error";
  const aiProcessing = withVideo.filter(
    (c) => c.summary_status === "processing" || c.quiz_status === "processing",
  ).length;
  const aiPending = withVideo.filter(
    (c) => isPending(c.summary_status) || isPending(c.quiz_status),
  ).length;

  // ── localStorage: backup while dirty, restore prompt on mount ──────────────
  useEffect(() => {
    if (!dirty) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ meta, units, ts: Date.now() } satisfies Backup),
      );
    } catch {}
  }, [dirty, meta, units, storageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const backup = JSON.parse(raw) as Backup;
      if (backup.ts && backup.ts > Date.parse(course.updated_at)) {
        setRestore(backup);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function clearBackup() {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }

  function applyRestore() {
    if (!restore) return;
    setMeta(restore.meta);
    commit(restore.units);
    setDirty(true);
    setRestore(null);
  }
  function discardRestore() {
    clearBackup();
    setRestore(null);
  }

  // ── drag handlers (local only; persisted on Save) ─────────────────────────
  const [, setActiveId] = useState<string | number | null>(null);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id);
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    if (active.data.current?.type !== "chapter") return;

    const cur = unitsRef.current;
    const from = findChapter(cur, active.id);
    if (!from) return;

    const overType = over.data.current?.type;
    let toUnitIndex: number;
    let insertIndex: number;

    if (overType === "container") {
      toUnitIndex = cur.findIndex((u) => u.id === over.data.current?.unitId);
      insertIndex = cur[toUnitIndex]?.chapters.length ?? 0;
    } else if (overType === "chapter") {
      const ol = findChapter(cur, over.id);
      if (!ol) return;
      toUnitIndex = ol.unitIndex;
      insertIndex = ol.chapterIndex;
    } else {
      return;
    }

    if (toUnitIndex < 0 || from.unitIndex === toUnitIndex) return;

    const next = cur.map((u) => ({ ...u, chapters: [...u.chapters] }));
    const [chapter] = next[from.unitIndex].chapters.splice(
      from.chapterIndex,
      1,
    );
    next[toUnitIndex].chapters.splice(insertIndex, 0, {
      ...chapter,
      unit_id: next[toUnitIndex].id,
    });
    commit(next);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const cur = unitsRef.current;

    if (active.data.current?.type === "unit") {
      if (active.id !== over.id) {
        const oldIndex = cur.findIndex((u) => u.id === active.id);
        const newIndex = cur.findIndex((u) => u.id === over.id);
        if (oldIndex >= 0 && newIndex >= 0) {
          commit(arrayMove(cur, oldIndex, newIndex));
          markDirty();
        }
      }
      return;
    }

    const from = findChapter(cur, active.id);
    if (!from) return;
    if (over.data.current?.type === "chapter") {
      const ol = findChapter(cur, over.id);
      if (ol && ol.unitIndex === from.unitIndex && active.id !== over.id) {
        const reordered = arrayMove(
          cur[from.unitIndex].chapters,
          from.chapterIndex,
          ol.chapterIndex,
        );
        commit(
          cur.map((u, i) =>
            i === from.unitIndex ? { ...u, chapters: reordered } : u,
          ),
        );
      }
    }
    markDirty();
  }

  // ── local CRUD (persisted on Save) ────────────────────────────────────────
  function handleAddUnit() {
    const id = crypto.randomUUID();
    commit([
      ...unitsRef.current,
      {
        id,
        course_id: course.id,
        title: "New unit",
        description: "",
        position: unitsRef.current.length,
        chapters: [],
      },
    ]);
    markDirty();
  }

  function handleUnitTitle(id: string, title: string) {
    commit(unitsRef.current.map((u) => (u.id === id ? { ...u, title } : u)));
    markDirty();
  }

  function handleDeleteUnit(id: string) {
    commit(unitsRef.current.filter((u) => u.id !== id));
    markDirty();
  }

  function handleAddChapter(unitId: string) {
    const id = crypto.randomUUID();
    commit(
      unitsRef.current.map((u) =>
        u.id === unitId
          ? {
              ...u,
              chapters: [
                ...u.chapters,
                {
                  id,
                  unit_id: unitId,
                  title: "New chapter",
                  description: "",
                  youtube_url: null,
                  youtube_video_id: null,
                  position: u.chapters.length,
                  summary_status: "idle",
                  quiz_status: "idle",
                  ai_error: null,
                },
              ],
            }
          : u,
      ),
    );
    markDirty();
  }

  function handleChapterTitle(id: string, title: string) {
    commit(
      unitsRef.current.map((u) => ({
        ...u,
        chapters: u.chapters.map((c) => (c.id === id ? { ...c, title } : c)),
      })),
    );
    markDirty();
  }

  function handleChapterVideo(id: string, url: string) {
    const videoId = url.trim() ? extractYoutubeId(url.trim()) : null;
    if (url.trim() && !videoId) {
      toast.error("That doesn't look like a valid YouTube URL.");
    }
    commit(
      unitsRef.current.map((u) => ({
        ...u,
        chapters: u.chapters.map((c) =>
          c.id === id
            ? {
                ...c,
                youtube_url: url.trim() || null,
                youtube_video_id: videoId,
              }
            : c,
        ),
      })),
    );
    markDirty();
  }

  function handleDeleteChapter(id: string) {
    commit(
      unitsRef.current.map((u) => ({
        ...u,
        chapters: u.chapters.filter((c) => c.id !== id),
      })),
    );
    markDirty();
  }

  function updateMeta(patch: Partial<Meta>) {
    setMeta((m) => ({ ...m, ...patch }));
    markDirty();
  }

  // ── save / publish ────────────────────────────────────────────────────────
  function buildPayload(): SaveCourseTreeInput {
    return {
      meta: {
        title: meta.title,
        description: meta.description,
        subject: meta.subject,
      },
      units: unitsRef.current.map((u) => ({
        id: u.id,
        title: u.title,
        description: u.description,
        chapters: u.chapters.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          youtube_url: c.youtube_url ?? null,
        })),
      })),
    };
  }

  async function doSave(): Promise<boolean> {
    const res = await saveCourseTree(course.id, buildPayload());
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    setDirty(false);
    clearBackup();
    if (status === "published") setHasUnpublished(true);
    return true;
  }

  async function handleSave() {
    setSaving(true);
    const ok = await doSave();
    setSaving(false);
    if (ok) toast.success("Saved");
  }

  async function handlePublish() {
    setPublishing(true);
    if (dirty) {
      const saved = await doSave();
      if (!saved) {
        setPublishing(false);
        return;
      }
    }
    const wasPublished = status === "published";
    const res = await publishCourse(course.id);
    setPublishing(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setStatus("published");
    setHasUnpublished(false);
    toast.success(wasPublished ? "Changes published" : "Course published!");
    router.refresh();
  }

  async function handleUnpublish() {
    const res = await unpublishCourse(course.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setStatus("draft");
    toast.success("Moved to draft");
    router.refresh();
  }

  function setChapterAiStatus(id: string, kind: AiKind, aiStatus: AiStatus) {
    const field = kind === "summary" ? "summary_status" : "quiz_status";
    commit(
      unitsRef.current.map((u) => ({
        ...u,
        chapters: u.chapters.map((c) =>
          c.id === id ? { ...c, [field]: aiStatus } : c,
        ),
      })),
    );
  }

  async function handleGenerateAI() {
    if (dirty) {
      const ok = await doSave();
      if (!ok) return;
    }
    setGenerating(true);
    try {
      const pending = await getPendingAiChapters(course.id);
      if (pending.length === 0) {
        toast.info("All chapters are already up to date.");
      }
      for (const item of pending) {
        if (item.needSummary) {
          setChapterAiStatus(item.id, "summary", "processing");
          const res = await generateChapterSummary(item.id);
          setChapterAiStatus(item.id, "summary", res.ok ? res.status : "error");
        }
        if (item.needQuiz) {
          setChapterAiStatus(item.id, "quiz", "processing");
          const res = await generateChapterQuiz(item.id);
          setChapterAiStatus(item.id, "quiz", res.ok ? res.status : "error");
        }
      }
      if (status === "published") setHasUnpublished(true);
      toast.success("AI content generated");
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  const publishLabel =
    status === "draft"
      ? "Publish"
      : dirty || hasUnpublished
        ? "Publish changes"
        : "Published";
  const publishDisabled =
    publishing ||
    (status === "published" && !dirty && !hasUnpublished) ||
    totalChapters === 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-muted-foreground">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <Badge variant={status === "published" ? "default" : "secondary"}>
            {status}
          </Badge>
          <Link
            href={`/dashboard/courses/${course.id}/preview`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Eye className="size-4" /> Preview
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            <Save className="size-4" /> {saving ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={publishDisabled}>
            {publishing ? "Working…" : publishLabel}
          </Button>
          {status === "published" && (
            <Button variant="ghost" size="sm" onClick={handleUnpublish}>
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {/* restore banner */}
      {restore && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
          <span>You have unsaved changes from a previous session.</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={applyRestore}>
              Restore
            </Button>
            <Button size="sm" variant="ghost" onClick={discardRestore}>
              Discard
            </Button>
          </div>
        </div>
      )}

      {/* meta */}
      <Card className="mt-6">
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="title" className="mb-1.5">
                Course title
              </Label>
              <Input
                id="title"
                value={meta.title}
                onChange={(e) => updateMeta({ title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="subject" className="mb-1.5">
                Subject
              </Label>
              <Input
                id="subject"
                value={meta.subject}
                onChange={(e) => updateMeta({ subject: e.target.value })}
                placeholder="e.g. Mathematics"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description" className="mb-1.5">
              Description
            </Label>
            <Textarea
              id="description"
              value={meta.description}
              onChange={(e) => updateMeta({ description: e.target.value })}
              placeholder="What will learners get from this course?"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* tree */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl">Course structure</h2>
            <Button variant="outline" size="sm" onClick={handleAddUnit}>
              <Plus className="size-4" /> Add unit
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag to reorder units and chapters. Changes are kept locally until
            you click <strong>Save</strong>.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="mt-4 space-y-4">
              <SortableContext
                items={units.map((u) => u.id)}
                strategy={verticalListSortingStrategy}
              >
                {units.map((unit, i) => (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    index={i}
                    onUnitTitleChange={handleUnitTitle}
                    onDeleteUnit={handleDeleteUnit}
                    onAddChapter={handleAddChapter}
                    onChapterTitleChange={handleChapterTitle}
                    onChapterVideoChange={handleChapterVideo}
                    onDeleteChapter={handleDeleteChapter}
                    onAiStatusChange={setChapterAiStatus}
                  />
                ))}
              </SortableContext>
            </div>
          </DndContext>

          {units.length === 0 && (
            <div className="mt-4 border border-dashed p-10 text-center text-sm text-muted-foreground">
              No units yet. Add your first unit to get started.
            </div>
          )}

          {totalChapters > 0 && (
            <div className="mt-4">
              <FinalQuizDialog
                courseId={course.id}
                status={finalQuizStatus}
                onStatusChange={setFinalQuizStatus}
              />
            </div>
          )}
        </div>

        {/* sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">
                Publish checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <CheckLine ok={!!meta.title.trim()}>Course title</CheckLine>
              <CheckLine ok={units.length > 0}>At least one unit</CheckLine>
              <CheckLine ok={totalChapters > 0}>At least one chapter</CheckLine>
              <CheckLine
                ok={chaptersWithVideo === totalChapters && totalChapters > 0}
              >
                {chaptersWithVideo}/{totalChapters} chapters have a video
              </CheckLine>
              <Separator className="my-3" />
              <p className="text-xs text-muted-foreground">
                <strong>Save</strong> stores your draft. <strong>Publish</strong>{" "}
                makes the course public — edits stay private until you publish
                changes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">
                AI content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1.5">
                <StatRow
                  label="Summaries"
                  done={summariesReady}
                  total={chaptersWithVideo}
                />
                <StatRow
                  label="Quizzes"
                  done={quizzesReady}
                  total={chaptersWithVideo}
                />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Final quiz</span>
                  <span className="flex items-center gap-1 font-medium">
                    <AiStatusIcon status={finalQuizStatus} />
                    {FINAL_QUIZ_LABEL[finalQuizStatus]}
                  </span>
                </div>
              </div>

              {(aiProcessing > 0 || aiPending > 0) && (
                <p className="text-xs text-muted-foreground">
                  {aiProcessing > 0 && <>{aiProcessing} generating… </>}
                  {aiPending > 0 && <>{aiPending} pending generation</>}
                </p>
              )}

              <Button
                className="w-full"
                size="sm"
                onClick={handleGenerateAI}
                disabled={generating || saving || chaptersWithVideo === 0}
              >
                <Sparkles className="size-4" />
                {generating ? "Generating…" : "Generate AI"}
              </Button>

              <p className="text-xs text-muted-foreground">
                Generates a summary &amp; quiz for new or changed chapters.
                Author-reviewed content is skipped. Save first to include the
                latest edits.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StatRow({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  const complete = total > 0 && done === total;
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={complete ? "font-medium text-primary" : "font-medium"}>
        {done}/{total}
      </span>
    </div>
  );
}

function CheckLine({
  ok,
  children,
}: {
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid size-4 shrink-0 place-items-center rounded-full text-[10px] ${
          ok
            ? "bg-primary text-primary-foreground"
            : "border border-muted-foreground/40 text-transparent"
        }`}
      >
        ✓
      </span>
      <span className={ok ? "" : "text-muted-foreground"}>{children}</span>
    </div>
  );
}
