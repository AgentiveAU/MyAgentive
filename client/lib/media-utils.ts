// Media detection types
export type MediaType = "audio" | "video" | "image" | "document";

export interface DetectedMedia {
  type: MediaType;
  filename: string;
  webUrl: string;
}

// Map file extensions to media types
const EXTENSION_TO_TYPE: Record<string, MediaType> = {
  // Audio
  ".mp3": "audio",
  ".wav": "audio",
  ".m4a": "audio",
  ".aac": "audio",
  ".ogg": "audio",
  ".oga": "audio",
  ".flac": "audio",
  // Video
  ".mp4": "video",
  ".mov": "video",
  ".webm": "video",
  ".avi": "video",
  ".mkv": "video",
  // Images
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".gif": "image",
  ".webp": "image",
  // Documents
  ".pdf": "document",
  ".doc": "document",
  ".docx": "document",
  ".txt": "document",
  ".csv": "document",
  ".xlsx": "document",
};

/**
 * Detect media file paths in message content.
 * Supports both absolute paths (containing /media/) and relative paths (starting with media/).
 */
export function detectMediaPaths(content: string): DetectedMedia[] {
  const detected: DetectedMedia[] = [];
  const seenUrls = new Set<string>();

  // Pattern 1: Absolute paths containing /media/
  // Matches: /home/user/.myagentive/media/audio/file.mp3
  const absolutePathRegex = /\/[^\s]+\/media\/([^\s]+\.[a-zA-Z0-9]+)/g;

  // Pattern 2: Relative paths starting with "media/"
  // Matches: media/audio/file.mp3 or ./media/audio/file.mp3
  // Also handles markdown formatting like `media/...` or **`media/...`**
  const relativePathRegex = /(?:^|[\s:`*])\.?\/?(media\/[\w./-]+\.[a-zA-Z0-9]+)/g;

  // Process absolute path matches
  for (const match of content.matchAll(absolutePathRegex)) {
    const relativePath = match[1];
    const webUrl = `/api/media/${relativePath}`;

    if (seenUrls.has(webUrl)) continue;
    seenUrls.add(webUrl);

    const ext = relativePath.substring(relativePath.lastIndexOf(".")).toLowerCase();
    const filename = relativePath.split("/").pop() || relativePath;
    const type = EXTENSION_TO_TYPE[ext] || "document";

    detected.push({ type, filename, webUrl });
  }

  // Process relative path matches
  for (const match of content.matchAll(relativePathRegex)) {
    const fullRelativePath = match[1]; // e.g., "media/audio/file.mp3"
    const relativePath = fullRelativePath.replace(/^media\//, ""); // strip "media/" prefix
    const webUrl = `/api/media/${relativePath}`;

    if (seenUrls.has(webUrl)) continue;
    seenUrls.add(webUrl);

    const ext = relativePath.substring(relativePath.lastIndexOf(".")).toLowerCase();
    const filename = relativePath.split("/").pop() || relativePath;
    const type = EXTENSION_TO_TYPE[ext] || "document";

    detected.push({ type, filename, webUrl });
  }

  return detected;
}
