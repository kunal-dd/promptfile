import { parsePartial } from "./partial-json.js";
import type { OutputSchema } from "./types.js";

export type Settle = (fullText: string) => Promise<{ data: unknown; text: string }>;

export class StructuredStream implements AsyncIterable<unknown> {
  private queue: unknown[] = [];
  private done = false;
  private error: unknown = null;
  private waiters: Array<() => void> = [];
  private started = false;
  private readonly _complete: Promise<{ data: unknown; text: string }>;
  private resolveComplete!: (v: { data: unknown; text: string }) => void;
  private rejectComplete!: (e: unknown) => void;

  constructor(
    private readonly source: AsyncIterable<string>,
    private readonly schema: OutputSchema | undefined,
    private readonly settle: Settle
  ) {
    this._complete = new Promise((res, rej) => {
      this.resolveComplete = res;
      this.rejectComplete = rej;
    });
    // Prevent an unhandled-rejection warning if the caller never awaits complete.
    this._complete.catch(() => {});
  }

  get complete(): Promise<{ data: unknown; text: string }> {
    this.start();
    return this._complete;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<unknown> {
    this.start();
    let i = 0;
    for (;;) {
      while (i < this.queue.length) yield this.queue[i++];
      if (this.done) {
        if (this.error) throw this.error;
        return;
      }
      await new Promise<void>((r) => this.waiters.push(r));
    }
  }

  private start(): void {
    if (this.started) return;
    this.started = true;
    void this.consume();
  }

  private async consume(): Promise<void> {
    let acc = "";
    try {
      for await (const chunk of this.source) {
        acc += chunk;
        if (this.schema) {
          const partial = parsePartial(acc);
          if (partial !== undefined) this.push(partial);
        } else {
          this.push(acc);
        }
      }
      this.resolveComplete(await this.settle(acc));
    } catch (e) {
      this.error = e;
      this.rejectComplete(e);
    } finally {
      this.done = true;
      this.wake();
    }
  }

  private push(v: unknown): void {
    this.queue.push(v);
    this.wake();
  }

  private wake(): void {
    const w = this.waiters;
    this.waiters = [];
    for (const fn of w) fn();
  }
}
