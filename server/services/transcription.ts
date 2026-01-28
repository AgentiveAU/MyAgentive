import { createClient, DeepgramClient } from "@deepgram/sdk";
import fs from "fs/promises";
import { config } from "../config.js";

let client: DeepgramClient | null = null;

// Configuration
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit for Deepgram
const TRANSCRIPTION_TIMEOUT = 10000; // 10 seconds
const MIN_CONFIDENCE_THRESHOLD = 0.7;

function getClient(): DeepgramClient | null {
  if (!config.deepgramApiKey) {
    console.log("[Transcription] Skipped: no API key configured");
    return null;
  }
  if (!client) client = createClient(config.deepgramApiKey);
  return client;
}

export interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  confidence?: number;
  lowConfidence?: boolean;
  error?: string;
}

/**
 * Transcribe an audio file using Deepgram.
 * Returns null if transcription is not available (no API key configured).
 * Returns a result object with success/failure status otherwise.
 */
export async function transcribeAudioFile(
  filePath: string,
  mimeType?: string,
  fileSize?: number
): Promise<TranscriptionResult | null> {
  const deepgram = getClient();
  if (!deepgram) return null;

  // Check file size
  if (fileSize && fileSize > MAX_FILE_SIZE) {
    console.log(
      `[Transcription] Skipped: file too large (${Math.round(fileSize / 1024 / 1024)}MB > ${MAX_FILE_SIZE / 1024 / 1024}MB)`
    );
    return { success: false, error: "File too large for transcription" };
  }

  try {
    // Async file read (non-blocking)
    const audioBuffer = await fs.readFile(filePath);

    // Double-check size after read if not provided
    if (!fileSize && audioBuffer.length > MAX_FILE_SIZE) {
      console.log(
        `[Transcription] Skipped: file too large (${Math.round(audioBuffer.length / 1024 / 1024)}MB)`
      );
      return { success: false, error: "File too large for transcription" };
    }

    // Transcribe with timeout
    const transcriptionPromise = deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: "nova-2",
        smart_format: true,
        punctuate: true,
        mimetype: mimeType,
      }
    );

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Transcription timeout")),
        TRANSCRIPTION_TIMEOUT
      );
    });

    const { result, error } = await Promise.race([
      transcriptionPromise,
      timeoutPromise,
    ]);

    if (error) {
      console.error("[Transcription] Deepgram error:", error);
      return { success: false, error: error.message };
    }

    const transcript =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    const confidence =
      result?.results?.channels?.[0]?.alternatives?.[0]?.confidence;

    if (!transcript) {
      console.log("[Transcription] Failed: no transcript returned");
      return { success: false, error: "No transcript returned" };
    }

    const lowConfidence = confidence !== undefined && confidence < MIN_CONFIDENCE_THRESHOLD;
    if (lowConfidence) {
      console.log(
        `[Transcription] Warning: low confidence (${(confidence * 100).toFixed(1)}%)`
      );
    }

    const preview =
      transcript.length > 50 ? transcript.substring(0, 50) + "..." : transcript;
    console.log(
      `[Transcription] Success: "${preview}" (confidence: ${confidence !== undefined ? (confidence * 100).toFixed(1) + "%" : "unknown"})`
    );

    return {
      success: true,
      transcript,
      confidence,
      lowConfidence,
    };
  } catch (err) {
    const errorMessage = (err as Error).message;
    if (errorMessage === "Transcription timeout") {
      console.error("[Transcription] Timeout: Deepgram took too long");
    } else {
      console.error("[Transcription] Error:", err);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Check if transcription service is available (API key configured).
 */
export function isTranscriptionAvailable(): boolean {
  return !!config.deepgramApiKey;
}

/**
 * Helper to transcribe a voice file and extract the transcript.
 * Used by both web upload and Telegram handlers.
 * Returns { transcription, error } where transcription is the text or null.
 */
export async function transcribeVoiceFile(
  filePath: string,
  mimeType?: string,
  fileSize?: number
): Promise<{ transcription: string | null; error: string | null }> {
  const result = await transcribeAudioFile(filePath, mimeType, fileSize);

  if (!result) {
    // No API key configured - graceful fallback
    return { transcription: null, error: null };
  }

  if (!result.success) {
    return { transcription: null, error: result.error || "Transcription failed" };
  }

  return { transcription: result.transcript || null, error: null };
}
