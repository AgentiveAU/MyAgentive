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
/**
 * Parse uploaded file info from user message content.
 * Matches the system message format: [Attached: type:photo, url:/api/media/photos/uuid.jpg, name:filename.jpg]
 * Returns the media info and the remaining user text (if any).
 */
export function parseUploadedFile(content: string): { media: DetectedMedia | null; userText: string } {
  // Pattern: [[ATTACHMENT|||type:photo|||url:/api/media/...|||name:filename.jpg]]
  // Uses ||| as delimiter to avoid conflicts with [] in filenames
  const uploadPattern = /\[\[ATTACHMENT\|\|\|type:(\w+)\|\|\|url:([^\|]+)\|\|\|name:([^\]]+)\]\]/;
  const match = content.match(uploadPattern);

  if (!match) {
    // Also try legacy format for backwards compatibility
    const legacyPattern = /\[Attached:\s*type:(\w+),\s*url:([^,\s\]]+),\s*name:([^\]]*)\]/;
    const legacyMatch = content.match(legacyPattern);
    if (!legacyMatch) {
      return { media: null, userText: content };
    }
    // Process legacy format
    const [fullMatch, fileType, webUrl, rawFilename] = legacyMatch;
    const userText = content.replace(fullMatch, "").trim();
    let filename = rawFilename.trim().replace(/[\[\]]+/g, "");
    if (!filename || filename.startsWith(".")) {
      const urlParts = webUrl.split("/");
      filename = urlParts[urlParts.length - 1] || "file";
    }
    return {
      media: { type: mapFileType(fileType), filename, webUrl },
      userText,
    };
  }

  const [fullMatch, fileType, webUrl, rawFilename] = match;

  // Extract user text (everything except the attachment tag)
  const userText = content.replace(fullMatch, "").trim();

  // Clean filename
  const filename = rawFilename.trim();

  return {
    media: { type: mapFileType(fileType), filename, webUrl },
    userText,
  };
}

// Helper to map file type string to MediaType
function mapFileType(fileType: string): MediaType {
  switch (fileType) {
    case "photo":
      return "image";
    case "video":
      return "video";
    case "audio":
    case "voice":
      return "audio";
    default:
      return "document";
  }
}

/**
 * Detect media file paths in message content.
 * Supports both absolute paths (containing /media/) and relative paths (starting with media/).
 */
export function detectMediaPaths(content: string): DetectedMedia[] {
  const detected: DetectedMedia[] = [];
  const seenUrls = new Set<string>();

  // Pattern 1: Absolute paths containing /media/
  // Matches: /home/user/.myagentive/media/audio/file.mp3
  // Excludes brackets and other special chars that might trail the path
  const absolutePathRegex = /\/[^\s\[\]]+\/media\/([^\s\[\]]+\.[a-zA-Z0-9]+)/g;

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
    const rawFilename = relativePath.split("/").pop() || relativePath;
    // Clean filename - remove any trailing brackets or special chars
    const filename = rawFilename.replace(/[\[\]]+$/, "");
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
    const rawFilename = relativePath.split("/").pop() || relativePath;
    // Clean filename - remove any trailing brackets or special chars
    const filename = rawFilename.replace(/[\[\]]+$/, "");
    const type = EXTENSION_TO_TYPE[ext] || "document";

    detected.push({ type, filename, webUrl });
  }

  return detected;
}
