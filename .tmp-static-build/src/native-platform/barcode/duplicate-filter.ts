/**
 * Duplicate suppression for continuous scanning.
 *
 * Single responsibility: decide whether a decoded value is new enough to
 * report. A camera decodes the same code many times per second, so without
 * this the application would receive a flood of identical scans.
 */

export class DuplicateFilter {
  private readonly seen = new Map<string, number>();

  constructor(private readonly windowMs: number) {}

  /** True when the value should be reported to the application. */
  accept(value: string, now = Date.now()): boolean {
    if (this.windowMs <= 0) return true;

    const previous = this.seen.get(value);
    if (previous !== undefined && now - previous < this.windowMs) {
      return false;
    }
    this.seen.set(value, now);
    this.prune(now);
    return true;
  }

  reset(): void {
    this.seen.clear();
  }

  /** Drop entries that can no longer suppress anything. */
  private prune(now: number): void {
    if (this.seen.size < 64) return;
    for (const [value, timestamp] of this.seen) {
      if (now - timestamp >= this.windowMs) this.seen.delete(value);
    }
  }
}
