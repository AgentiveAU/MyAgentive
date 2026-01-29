import { config } from "../config.js";

/**
 * Buffers message fragments when users paste long text (>4096 chars).
 * Telegram automatically splits long messages, and this buffer
 * combines them back into a single logical message.
 */

interface BufferedMessage {
  chatId: number;
  fragments: string[];
  firstMessageId: number;
  lastUpdate: number;
  timeout: NodeJS.Timeout;
}

type FlushCallback = (
  chatId: number,
  combinedText: string,
  firstMessageId: number
) => Promise<void>;

class FragmentBuffer {
  private buffers: Map<number, BufferedMessage> = new Map();
  private flushDelay: number;
  private onFlush: FlushCallback;

  // Threshold for considering a message as potentially fragmented
  // Telegram's limit is 4096, but we use a slightly lower threshold
  private fragmentThreshold = 4000;

  constructor(flushDelayMs: number, onFlush: FlushCallback) {
    this.flushDelay = flushDelayMs;
    this.onFlush = onFlush;
  }

  /**
   * Add a message fragment. Returns true if message was buffered,
   * false if it should be processed immediately.
   */
  add(chatId: number, messageId: number, text: string): boolean {
    // Only buffer if message looks like a fragment (near max length)
    const isLikelyFragment = text.length >= this.fragmentThreshold;

    const existing = this.buffers.get(chatId);

    if (existing) {
      // Clear existing timeout
      clearTimeout(existing.timeout);

      // Add fragment
      existing.fragments.push(text);
      existing.lastUpdate = Date.now();

      // Set new flush timeout
      existing.timeout = setTimeout(() => {
        this.flush(chatId);
      }, this.flushDelay);

      return true;
    }

    if (isLikelyFragment) {
      // Start new buffer
      const timeout = setTimeout(() => {
        this.flush(chatId);
      }, this.flushDelay);

      this.buffers.set(chatId, {
        chatId,
        fragments: [text],
        firstMessageId: messageId,
        lastUpdate: Date.now(),
        timeout,
      });

      return true;
    }

    // Not a fragment, process immediately
    return false;
  }

  /**
   * Flush a buffer and call the callback with combined text.
   */
  private async flush(chatId: number): Promise<void> {
    const buffer = this.buffers.get(chatId);
    if (!buffer) return;

    this.buffers.delete(chatId);

    const combined = buffer.fragments.join("");
    await this.onFlush(chatId, combined, buffer.firstMessageId);
  }

  /**
   * Clear a buffer without flushing (e.g., on error).
   */
  clear(chatId: number): void {
    const buffer = this.buffers.get(chatId);
    if (buffer) {
      clearTimeout(buffer.timeout);
      this.buffers.delete(chatId);
    }
  }

  /**
   * Check if a chat has a pending buffer.
   */
  hasPending(chatId: number): boolean {
    return this.buffers.has(chatId);
  }
}

// Factory function to create a fragment buffer with config
export function createFragmentBuffer(onFlush: FlushCallback): FragmentBuffer {
  return new FragmentBuffer(config.telegramFragmentBufferMs, onFlush);
}

export { FragmentBuffer };
