import fs from "fs";
import path from "path";

// Maximum file size for serving (50MB - matches Telegram limit)
export const MAX_MEDIA_SIZE = 50 * 1024 * 1024;

export type MediaType = "audio" | "voice" | "video" | "image" | "document";

export interface DetectedMedia {
  type: MediaType;
  path: string;
  filename: string;
  relativePath: string;
  webUrl: string;
  size: number;
}

// Map file extensions to media types
const EXTENSION_TO_TYPE: Record<string, MediaType> = {
  // Audio
  ".mp3": "audio",
  ".wav": "audio",
  ".m4a": "audio",
  ".aac": "audio",
  ".flac": "audio",
  // Voice (Telegram format)
  ".ogg": "voice",
  ".oga": "voice",
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
  ".svg": "image",
  // Documents
  ".pdf": "document",
  ".doc": "document",
  ".docx": "document",
  ".txt": "document",
  ".csv": "document",
  ".xlsx": "document",
  ".xls": "document",
};

/**
 * Get media type from file extension
 */
function getMediaType(ext: string): MediaType {
  return EXTENSION_TO_TYPE[ext.toLowerCase()] || "document";
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detect media files referenced in a message content.
 * Only detects files within the specified media directory for security.
 * Supports both absolute paths and relative paths starting with "media/".
 *
 * @param content - The message content to scan for file paths
 * @param mediaBasePath - The base media directory path (from config)
 * @returns Array of detected media files with metadata
 */
export function detectMediaInMessage(
  content: string,
  mediaBasePath: string
): DetectedMedia[] {
  // Resolve the media base path to absolute
  const resolvedMediaPath = path.resolve(mediaBasePath);
  const detected: DetectedMedia[] = [];
  const seenPaths = new Set<string>();

  // Pattern 1: Full absolute paths containing the media directory
  // Matches: /home/user/.myagentive/media/audio/file.mp3
  const absolutePathRegex = new RegExp(
    `${escapeRegex(resolvedMediaPath)}/([\\w./-]+\\.[a-zA-Z0-9]+)`,
    "g"
  );

  // Pattern 2: Relative paths starting with "media/"
  // Matches: media/audio/file.mp3 or ./media/audio/file.mp3
  // Also handles markdown formatting like `media/...` or **`media/...`**
  const relativePathRegex = /(?:^|[\s:`*])\.?\/?(media\/[\w./-]+\.[a-zA-Z0-9]+)/g;

  // Collect all matches from both patterns
  const allMatches: Array<{ fullPath: string; relativePath: string }> = [];

  // Process absolute path matches
  for (const match of content.matchAll(absolutePathRegex)) {
    allMatches.push({
      fullPath: match[0],
      relativePath: match[1],
    });
  }

  // Process relative path matches
  for (const match of content.matchAll(relativePathRegex)) {
    const relativePath = match[1]; // e.g., "media/audio/file.mp3"
    // Strip the leading "media/" to get the subdirectory path
    const subPath = relativePath.replace(/^media\//, "");
    const fullPath = path.join(resolvedMediaPath, subPath);
    allMatches.push({
      fullPath,
      relativePath: subPath,
    });
  }

  for (const { fullPath, relativePath } of allMatches) {
    // Skip duplicates
    if (seenPaths.has(fullPath)) continue;
    seenPaths.add(fullPath);

    // Security check 1: Reject paths with directory traversal
    if (relativePath.includes("..") || path.isAbsolute(relativePath)) {
      console.warn(`[MediaDetector] Rejected suspicious path: ${relativePath}`);
      continue;
    }

    // Security check 2: Resolve and verify path is within media directory
    const resolvedFullPath = path.resolve(fullPath);
    if (!resolvedFullPath.startsWith(resolvedMediaPath + path.sep)) {
      console.warn(
        `[MediaDetector] Path escapes media directory: ${resolvedFullPath}`
      );
      continue;
    }

    // Check if file exists
    if (!fs.existsSync(resolvedFullPath)) {
      console.log(`[MediaDetector] File not found: ${resolvedFullPath}`);
      continue;
    }

    // Check file size
    const stats = fs.statSync(resolvedFullPath);
    if (stats.size > MAX_MEDIA_SIZE) {
      console.warn(
        `[MediaDetector] File too large (${stats.size} bytes): ${resolvedFullPath}`
      );
      continue;
    }

    const ext = path.extname(resolvedFullPath).toLowerCase();
    const filename = path.basename(resolvedFullPath);

    detected.push({
      type: getMediaType(ext),
      path: resolvedFullPath,
      filename,
      relativePath,
      webUrl: `/api/media/${relativePath}`,
      size: stats.size,
    });

    console.log(`[MediaDetector] Found ${getMediaType(ext)}: ${resolvedFullPath}`);
  }

  return detected;
}

/**
 * Validate and resolve a media path for serving.
 * Returns null if the path is invalid or outside the media directory.
 *
 * @param relativePath - The relative path from the URL
 * @param mediaBasePath - The base media directory path
 * @returns The resolved absolute path, or null if invalid
 */
export function validateMediaPath(
  relativePath: string,
  mediaBasePath: string
): string | null {
  // Security check 1: Reject suspicious patterns
  if (relativePath.includes("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  // Resolve paths
  const resolvedMediaPath = path.resolve(mediaBasePath);
  const fullPath = path.resolve(resolvedMediaPath, relativePath);

  // Security check 2: Ensure resolved path is within media directory
  if (!fullPath.startsWith(resolvedMediaPath + path.sep)) {
    return null;
  }

  // Check file exists
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return fullPath;
}

/**
 * Get file type and subdirectory from MIME type
 */
export function getFileTypeFromMime(mimeType: string): { fileType: string; subDir: string } {
  if (mimeType.startsWith("image/")) {
    return { fileType: "photo", subDir: "photos" };
  } else if (mimeType.startsWith("video/")) {
    return { fileType: "video", subDir: "videos" };
  } else if (mimeType.startsWith("audio/")) {
    // Voice message formats (Telegram OGG and browser WebM recordings)
    // Use startsWith to handle MIME types with codec parameters (e.g. "audio/webm;codecs=opus")
    const baseMime = mimeType.split(";")[0];
    if (baseMime === "audio/ogg" || baseMime === "audio/oga" || baseMime === "audio/webm") {
      return { fileType: "voice", subDir: "voice" };
    }
    return { fileType: "audio", subDir: "audio" };
  } else {
    return { fileType: "document", subDir: "documents" };
  }
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMime(mimeType: string): string {
  // Strip parameters (e.g. "text/plain;charset=utf-8" → "text/plain")
  const baseMime = mimeType.split(";")[0];
  const mimeToExt: Record<string, string> = {
    "audio/ogg": ".ogg",
    "audio/webm": ".webm",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
    "audio/aac": ".aac",
    "audio/flac": ".flac",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/csv": ".csv",
  };

  return mimeToExt[baseMime] || "";
}

/**
 * Ensure media directories exist
 */
export function ensureMediaDirs(mediaBasePath: string): void {
  const dirs = ["voice", "audio", "documents", "videos", "photos"];
  for (const dir of dirs) {
    const fullPath = path.join(mediaBasePath, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

/**
 * Get MIME type for a file extension
 */
export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Audio
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".flac": "audio/flac",
    // Video
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    // Images
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    // Documents
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".csv": "text/csv",
  };

  return mimeTypes[ext] || "application/octet-stream";
}
