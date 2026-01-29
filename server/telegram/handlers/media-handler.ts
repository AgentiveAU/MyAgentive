import type { Context } from "grammy";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { config } from "../../config.js";
import { getDatabase } from "../../db/database.js";
import { sessionManager } from "../../core/session-manager.js";
import { telegramSubscriptionManager } from "../subscription-manager.js";
import { transcribeVoiceFile } from "../../services/transcription.js";

interface SessionData {
  currentSessionName: string;
}

type MyContext = Context & { session: SessionData };

// Ensure media directories exist
function ensureMediaDirs(): void {
  const dirs = ["voice", "audio", "documents", "videos", "photos"];
  for (const dir of dirs) {
    const fullPath = path.join(config.mediaPath, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

export async function handleMedia(ctx: MyContext): Promise<void> {
  ensureMediaDirs();

  const message = ctx.message;
  if (!message) return;

  let fileId: string | undefined;
  let fileType: string;
  let subDir: string;
  let originalFilename: string | undefined;
  let mimeType: string | undefined;

  // Determine file type and get file ID
  if (message.voice) {
    fileId = message.voice.file_id;
    fileType = "voice";
    subDir = "voice";
    mimeType = message.voice.mime_type;
  } else if (message.audio) {
    fileId = message.audio.file_id;
    fileType = "audio";
    subDir = "audio";
    originalFilename = message.audio.file_name;
    mimeType = message.audio.mime_type;
  } else if (message.document) {
    fileId = message.document.file_id;
    fileType = "document";
    subDir = "documents";
    originalFilename = message.document.file_name;
    mimeType = message.document.mime_type;
  } else if (message.video) {
    fileId = message.video.file_id;
    fileType = "video";
    subDir = "videos";
    originalFilename = message.video.file_name;
    mimeType = message.video.mime_type;
  } else if (message.photo) {
    // Get the largest photo
    const photo = message.photo[message.photo.length - 1];
    fileId = photo.file_id;
    fileType = "photo";
    subDir = "photos";
    mimeType = "image/jpeg";
  } else {
    return;
  }

  if (!fileId) return;

  try {
    // Notify user we're downloading
    await ctx.reply(`Downloading ${fileType}...`);

    // Get file info from Telegram
    const file = await ctx.api.getFile(fileId);
    if (!file.file_path) {
      await ctx.reply("Error: Could not get file path");
      return;
    }

    // Determine file extension
    const ext = path.extname(file.file_path) || getExtensionFromMime(mimeType);
    const storedFilename = `${uuidv4()}${ext}`;
    const storedPath = path.join(config.mediaPath, subDir, storedFilename);

    // Download file
    const fileUrl = `https://api.telegram.org/file/bot${config.telegramBotToken}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Save to disk
    fs.writeFileSync(storedPath, buffer);

    // Transcribe voice messages using Deepgram (if available)
    let transcription: string | null = null;
    let transcriptionError: string | null = null;
    if (fileType === "voice") {
      const result = await transcribeVoiceFile(storedPath, mimeType, buffer.length);
      transcription = result.transcription;
      transcriptionError = result.error;
    }

    // Get session info
    const sessionName = ctx.session.currentSessionName;
    const sessions = sessionManager.listSessions();
    const session = sessions.find((s) => s.name === sessionName);

    // Store in database
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO media_files (id, session_id, telegram_file_id, file_type, original_filename, stored_path, mime_type, file_size, transcription, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      session?.id || null,
      fileId,
      fileType,
      originalFilename || null,
      storedPath,
      mimeType || null,
      buffer.length,
      transcription,
      now
    );

    // Notify user
    const displayName = originalFilename || storedFilename;
    const sizeKB = Math.round(buffer.length / 1024);

    let transcriptionNote = "";
    if (transcription) {
      const preview = transcription.length > 100
        ? transcription.substring(0, 100) + "..."
        : transcription;
      transcriptionNote = `\nTranscribed: "${preview}"`;
    } else if (transcriptionError) {
      transcriptionNote = `\nTranscription unavailable: ${transcriptionError}`;
    } else if (fileType === "voice") {
      transcriptionNote = "\nTranscription: not configured";
    }
    await ctx.reply(
      `${fileType} saved!\n\nFile: ${displayName}\nSize: ${sizeKB} KB${transcriptionNote}\n\nThe agent can access this file.`
    );

    // Build message for the agent about the file
    // Use the [[ATTACHMENT]] tag format so web UI can render the media inline
    const webUrl = `/api/media/${subDir}/${storedFilename}`;
    const attachmentTag = `[[ATTACHMENT|||type:${fileType}|||url:${webUrl}|||name:${displayName}]]`;

    // For voice messages: include transcription if available, otherwise ask agent to listen
    const transcriptionText = fileType === "voice"
      ? transcription
        ? `\n\n[Voice message transcribed: "${transcription}"]\n\nPlease respond to what I said above.`
        : "\n\n[Voice message recorded - please listen and respond to what I said]"
      : "";
    const captionText = message.caption ? `\n\n${message.caption}` : "";
    const agentContext = `\n\n[System: File path for agent access: ${storedPath}]`;
    const fileMessage = `${attachmentTag}${captionText}${agentContext}${transcriptionText}`;

    const chatId = ctx.chat?.id;
    const originalMessageId = ctx.message?.message_id;
    if (chatId && originalMessageId) {
      // Ensure user is subscribed to the session
      if (!telegramSubscriptionManager.isSubscribed(chatId) ||
          telegramSubscriptionManager.getSessionName(chatId) !== sessionName) {
        telegramSubscriptionManager.subscribe(chatId, sessionName);
      }

      // React with eyes emoji to acknowledge receipt (if enabled)
      if (config.telegramReactionAck) {
        try {
          await ctx.react("👀");
        } catch {
          // Reactions may not be supported in all chats
        }
      }

      // Create placeholder for agent response
      // For transcribed voice, file is already processed - just waiting for AI response
      const placeholderText = (fileType === "voice" && transcription)
        ? "Thinking..."
        : "Processing file...";
      const placeholder = await ctx.reply(placeholderText);
      telegramSubscriptionManager.startActiveResponse(chatId, placeholder.message_id, originalMessageId);
    }

    // Get the session and send message
    const managedSession = sessionManager.getOrCreateSession(sessionName, "telegram");
    managedSession.sendMessage(fileMessage, "telegram");
  } catch (error) {
    console.error("Error handling media:", error);
    await ctx.reply(`Error downloading ${fileType}: ${(error as Error).message}`);
  }
}

function getExtensionFromMime(mimeType: string | undefined): string {
  if (!mimeType) return "";

  const mimeToExt: Record<string, string> = {
    "audio/ogg": ".ogg",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
  };

  return mimeToExt[mimeType] || "";
}
