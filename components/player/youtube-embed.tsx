import { youtubeEmbed } from "@/lib/youtube";

export function YouTubeEmbed({
  videoId,
  title,
}: {
  videoId: string;
  title?: string;
}) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-none border bg-black">
      <iframe
        className="h-full w-full"
        src={youtubeEmbed(videoId)}
        title={title ?? "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
