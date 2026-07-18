"use client";

import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChapterItem } from "@/components/builder/chapter-item";
import type { UnitWithChapters, AiStatus } from "@/lib/types";

export function UnitCard({
  unit,
  index,
  onUnitTitleChange,
  onDeleteUnit,
  onAddChapter,
  onChapterTitleChange,
  onChapterVideoChange,
  onDeleteChapter,
  onAiStatusChange,
}: {
  unit: UnitWithChapters;
  index: number;
  onUnitTitleChange: (id: string, title: string) => void;
  onDeleteUnit: (id: string) => void;
  onAddChapter: (unitId: string) => void;
  onChapterTitleChange: (id: string, title: string) => void;
  onChapterVideoChange: (id: string, url: string) => void;
  onDeleteChapter: (id: string) => void;
  onAiStatusChange: (id: string, status: AiStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: unit.id, data: { type: "unit" } });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `container:${unit.id}`,
    data: { type: "container", unitId: unit.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-none border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted/40 p-3">
        <button
          type="button"
          className="cursor-grab text-muted-foreground/60 hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag unit"
        >
          <GripVertical className="size-4" />
        </button>
        <Badge variant="secondary" className="shrink-0">
          Unit {index + 1}
        </Badge>
        <Input
          defaultValue={unit.title}
          onBlur={(e) => onUnitTitleChange(unit.id, e.target.value)}
          className="h-8 border-none bg-transparent font-heading text-base font-semibold shadow-none focus-visible:bg-background"
          placeholder="Unit title"
        />
        <span className="shrink-0 text-xs text-muted-foreground">
          {unit.chapters.length} ch
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onDeleteUnit(unit.id)}
          aria-label="Delete unit"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div ref={setDropRef} className={isOver ? "bg-primary/5" : undefined}>
        <SortableContext
          items={unit.chapters.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {unit.chapters.length === 0 ? (
            <p className="border-t p-4 text-center text-xs text-muted-foreground">
              Drop a chapter here, or add one below.
            </p>
          ) : (
            unit.chapters.map((chapter) => (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                onTitleChange={onChapterTitleChange}
                onVideoChange={onChapterVideoChange}
                onDelete={onDeleteChapter}
                onAiStatusChange={onAiStatusChange}
              />
            ))
          )}
        </SortableContext>
      </div>

      <button
        type="button"
        onClick={() => onAddChapter(unit.id)}
        className="flex w-full items-center gap-2 border-t p-3 text-sm font-medium text-primary hover:bg-primary/5"
      >
        <Plus className="size-4" /> Add chapter
      </button>
    </div>
  );
}
