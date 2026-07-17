"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { youtubeThumb } from "@/lib/youtube";
import type { Chapter } from "@/lib/types";

export function ChapterItem({
  chapter,
  onTitleChange,
  onVideoChange,
  onDelete,
}: {
  chapter: Chapter;
  onTitleChange: (id: string, title: string) => void;
  onVideoChange: (id: string, url: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: chapter.id,
      data: { type: "chapter", unitId: chapter.unit_id },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 border-t bg-background p-3"
    >
      <button
        type="button"
        className="mt-1 cursor-grab text-muted-foreground/60 hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag chapter"
      >
        <GripVertical className="size-4" />
      </button>

      {/* thumbnail */}
      <div className="grid aspect-video w-24 shrink-0 place-items-center overflow-hidden rounded-none border bg-muted">
        {chapter.youtube_video_id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={youtubeThumb(chapter.youtube_video_id)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Play className="size-5 text-muted-foreground/50" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <Input
          defaultValue={chapter.title}
          onBlur={(e) => onTitleChange(chapter.id, e.target.value)}
          className="h-8 font-medium"
          placeholder="Chapter title"
        />
        <div className="flex items-center gap-2">
          <Input
            defaultValue={chapter.youtube_url ?? ""}
            onBlur={(e) => onVideoChange(chapter.id, e.target.value)}
            className="h-8 text-xs"
            placeholder="Paste YouTube URL…"
          />
          {chapter.youtube_video_id ? (
            <Badge variant="secondary" className="shrink-0">
              Video
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0">
              No video
            </Badge>
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onDelete(chapter.id)}
        aria-label="Delete chapter"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
