/** YouTube thumbnail URL for a video id. */
export function youtubeThumb(
  videoId: string,
  quality: "hqdefault" | "mqdefault" | "maxresdefault" = "hqdefault",
): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

/** Privacy-friendly embed URL. */
export function youtubeEmbed(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
