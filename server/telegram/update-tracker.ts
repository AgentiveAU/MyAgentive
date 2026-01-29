/**
 * Tracks recently processed update IDs to prevent duplicate processing.
 * Uses a circular buffer approach to limit memory usage.
 *
 * This handles cases where Telegram retries sending an update due to
 * network issues or slow response times.
 */
class UpdateTracker {
  private processedIds: Set<number> = new Set();
  private orderedIds: number[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Check if an update has been processed and mark it as processed.
   * Returns true if this is a duplicate (already processed).
   */
  isDuplicate(updateId: number): boolean {
    if (this.processedIds.has(updateId)) {
      return true;
    }

    // Add to tracking
    this.processedIds.add(updateId);
    this.orderedIds.push(updateId);

    // Evict oldest if over capacity
    if (this.orderedIds.length > this.maxSize) {
      const oldest = this.orderedIds.shift()!;
      this.processedIds.delete(oldest);
    }

    return false;
  }

  /**
   * Clear all tracked updates.
   */
  clear(): void {
    this.processedIds.clear();
    this.orderedIds = [];
  }

  /**
   * Get the count of tracked updates.
   */
  get size(): number {
    return this.processedIds.size;
  }
}

export const updateTracker = new UpdateTracker();
