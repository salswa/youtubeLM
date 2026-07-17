"use client";

import { useRef, useState } from "react";
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
import { ArrowLeft, Plus } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UnitCard } from "@/components/builder/unit-card";

import { updateCourseMeta, setPublishStatus } from "@/lib/actions/courses";
import { addUnit, updateUnit, deleteUnit, reorderUnits } from "@/lib/actions/units";
import {
  addChapter,
  updateChapter,
  setChapterVideo,
  deleteChapter,
  reorderChapters,
} from "@/lib/actions/chapters";
import { extractYoutubeId } from "@/lib/schemas/course";
import type { CourseTree, UnitWithChapters, CourseStatus } from "@/lib/types";

function findChapter(units: UnitWithChapters[], id: string | number) {
  for (let u = 0; u < units.length; u++) {
    const c = units[u].chapters.findIndex((ch) => ch.id === id);
    if (c !== -1) return { unitIndex: u, chapterIndex: c };
  }
  return null;
}

export function CourseBuilder({ course }: { course: CourseTree }) {
  const router = useRouter();

  const [units, setUnitsState] = useState<UnitWithChapters[]>(course.units);
  const unitsRef = useRef(units);
  const commit = (next: UnitWithChapters[]) => {
    unitsRef.current = next;
    setUnitsState(next);
  };

  const [meta, setMeta] = useState({
    title: course.title,
    subject: course.subject,
    description: course.description,
  });
  const [status, setStatus] = useState<CourseStatus>(course.status);
  const [publishing, setPublishing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const totalChapters = units.reduce((n, u) => n + u.chapters.length, 0);
  const chaptersWithVideo = units.reduce(
    (n, u) => n + u.chapters.filter((c) => c.youtube_video_id).length,
    0,
  );

  // ---------- persistence helpers ----------
  function persistUnitOrder(next: UnitWithChapters[]) {
    reorderUnits(next.map((u) => u.id)).then((r) => {
      if (!r.ok) toast.error("Could not save unit order.");
    });
  }
  function persistChapterOrder(next: UnitWithChapters[]) {
    const updates = next.flatMap((u) =>
      u.chapters.map((c, idx) => ({ id: c.id, unitId: u.id, position: idx })),
    );
    reorderChapters(updates).then((r) => {
      if (!r.ok) toast.error("Could not save chapter order.");
    });
  }

  // ---------- drag handlers ----------
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
      toUnitIndex = cur.findIndex(
        (u) => u.id === over.data.current?.unitId,
      );
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
    const [chapter] = next[from.unitIndex].chapters.splice(from.chapterIndex, 1);
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
          const next = arrayMove(cur, oldIndex, newIndex);
          commit(next);
          persistUnitOrder(next);
        }
      }
      return;
    }

    // chapter
    const from = findChapter(cur, active.id);
    if (!from) return;
    let next = cur;
    if (over.data.current?.type === "chapter") {
      const ol = findChapter(cur, over.id);
      if (ol && ol.unitIndex === from.unitIndex && active.id !== over.id) {
        const unit = cur[from.unitIndex];
        const reordered = arrayMove(
          unit.chapters,
          from.chapterIndex,
          ol.chapterIndex,
        );
        next = cur.map((u, i) =>
          i === from.unitIndex ? { ...u, chapters: reordered } : u,
        );
        commit(next);
      }
    }
    persistChapterOrder(next);
  }

  // ---------- CRUD handlers ----------
  async function handleAddUnit() {
    const res = await addUnit(course.id);
    if (!res.ok) return toast.error(res.error);
    commit([...unitsRef.current, { ...res.unit, chapters: [] }]);
  }

  function handleUnitTitle(id: string, title: string) {
    commit(
      unitsRef.current.map((u) => (u.id === id ? { ...u, title } : u)),
    );
    updateUnit(id, { title });
  }

  async function handleDeleteUnit(id: string) {
    commit(unitsRef.current.filter((u) => u.id !== id));
    const res = await deleteUnit(id);
    if (!res.ok) toast.error(res.error);
  }

  async function handleAddChapter(unitId: string) {
    const res = await addChapter(unitId);
    if (!res.ok) return toast.error(res.error);
    commit(
      unitsRef.current.map((u) =>
        u.id === unitId ? { ...u, chapters: [...u.chapters, res.chapter] } : u,
      ),
    );
  }

  function handleChapterTitle(id: string, title: string) {
    commit(
      unitsRef.current.map((u) => ({
        ...u,
        chapters: u.chapters.map((c) => (c.id === id ? { ...c, title } : c)),
      })),
    );
    updateChapter(id, { title });
  }

  async function handleChapterVideo(id: string, url: string) {
    const optimisticId = url.trim() ? extractYoutubeId(url.trim()) : null;
    commit(
      unitsRef.current.map((u) => ({
        ...u,
        chapters: u.chapters.map((c) =>
          c.id === id
            ? { ...c, youtube_url: url.trim() || null, youtube_video_id: optimisticId }
            : c,
        ),
      })),
    );
    const res = await setChapterVideo(id, url);
    if (!res.ok) toast.error(res.error);
  }

  async function handleDeleteChapter(id: string) {
    commit(
      unitsRef.current.map((u) => ({
        ...u,
        chapters: u.chapters.filter((c) => c.id !== id),
      })),
    );
    const res = await deleteChapter(id);
    if (!res.ok) toast.error(res.error);
  }

  function saveMeta() {
    updateCourseMeta(course.id, meta).then((r) => {
      if (!r.ok) toast.error(r.error);
    });
  }

  async function handlePublishToggle() {
    setPublishing(true);
    const next: CourseStatus = status === "published" ? "draft" : "published";
    const res = await setPublishStatus(course.id, next);
    setPublishing(false);
    if (!res.ok) return toast.error(res.error);
    setStatus(next);
    toast.success(next === "published" ? "Course published!" : "Moved to draft.");
    router.refresh();
  }

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
        <div className="flex items-center gap-3">
          <Badge variant={status === "published" ? "default" : "secondary"}>
            {status}
          </Badge>
          {status === "published" && (
            <Link
              href={`/courses/${course.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Preview
            </Link>
          )}
          <Button size="sm" onClick={handlePublishToggle} disabled={publishing}>
            {publishing
              ? "Saving…"
              : status === "published"
                ? "Unpublish"
                : "Publish"}
          </Button>
        </div>
      </div>

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
                onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                onBlur={saveMeta}
              />
            </div>
            <div>
              <Label htmlFor="subject" className="mb-1.5">
                Subject
              </Label>
              <Input
                id="subject"
                value={meta.subject}
                onChange={(e) => setMeta({ ...meta, subject: e.target.value })}
                onBlur={saveMeta}
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
              onChange={(e) =>
                setMeta({ ...meta, description: e.target.value })
              }
              onBlur={saveMeta}
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
            Drag to reorder units and chapters. Paste one YouTube URL per
            chapter.
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
                  />
                ))}
              </SortableContext>
            </div>
          </DndContext>

          {units.length === 0 && (
            <div className="mt-4 rounded-none border border-dashed p-10 text-center text-sm text-muted-foreground">
              No units yet. Add your first unit to get started.
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
              <CheckLine ok={chaptersWithVideo === totalChapters && totalChapters > 0}>
                {chaptersWithVideo}/{totalChapters} chapters have a video
              </CheckLine>
              <Separator className="my-3" />
              <p className="text-xs text-muted-foreground">
                In Phase 3, publishing will also generate summaries, quizzes,
                and a chat tutor from each video.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function CheckLine({ ok, children }: { ok: boolean; children: React.ReactNode }) {
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
