/**
 * Buffers media group items when users send albums (multiple photos/videos at once).
 * Telegram sends each item as a separate message, but they share a media_group_id.
 * This buffer collects them and processes as a batch.
 */

interface MediaItem {
  type: string;
  fileId: string;
  caption?: string;
  messageId: number;
}

interface BufferedMediaGroup {
  chatId: number;
  mediaGroupId: string;
  items: MediaItem[];
  firstMessageId: number;
  timeout: NodeJS.Timeout;
}

type FlushCallback = (group: BufferedMediaGroup) => Promise<void>;

class MediaGroupBuffer {
  private groups: Map<string, BufferedMediaGroup> = new Map();
  private flushDelay: number;
  private onFlush: FlushCallback;

  constructor(flushDelayMs: number = 1000, onFlush: FlushCallback) {
    this.flushDelay = flushDelayMs;
    this.onFlush = onFlush;
  }

  /**
   * Add media to a group buffer.
   * Returns true if buffered, false if should process individually.
   */
  add(
    chatId: number,
    mediaGroupId: string | undefined,
    messageId: number,
    type: string,
    fileId: string,
    caption?: string
  ): boolean {
    if (!mediaGroupId) {
      return false; // Not part of a media group
    }

    const existing = this.groups.get(mediaGroupId);

    if (existing) {
      clearTimeout(existing.timeout);
      existing.items.push({ type, fileId, caption, messageId });
      existing.timeout = setTimeout(
        () => this.flush(mediaGroupId),
        this.flushDelay
      );
      return true;
    }

    // Start new group
    const timeout = setTimeout(
      () => this.flush(mediaGroupId),
      this.flushDelay
    );

    this.groups.set(mediaGroupId, {
      chatId,
      mediaGroupId,
      items: [{ type, fileId, caption, messageId }],
      firstMessageId: messageId,
      timeout,
    });

    return true;
  }

  /**
   * Flush a media group and call the callback.
   */
  private async flush(mediaGroupId: string): Promise<void> {
    const group = this.groups.get(mediaGroupId);
    if (!group) return;

    this.groups.delete(mediaGroupId);
    await this.onFlush(group);
  }

  /**
   * Clear a buffer without flushing.
   */
  clear(mediaGroupId: string): void {
    const group = this.groups.get(mediaGroupId);
    if (group) {
      clearTimeout(group.timeout);
      this.groups.delete(mediaGroupId);
    }
  }

  /**
   * Check if a media group is being buffered.
   */
  hasPending(mediaGroupId: string): boolean {
    return this.groups.has(mediaGroupId);
  }
}

export { MediaGroupBuffer, BufferedMediaGroup, MediaItem };
