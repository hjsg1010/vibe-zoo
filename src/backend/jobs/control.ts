/** Serializes decisions, not browser/model waits. Callbacks commit then enqueue. */
export class SerialControl {
  private tails = new Map<string, Promise<void>>();
  async run<T>(key: string, fn: () => T): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const done = new Promise<void>((r) => {
      release = r;
    });
    this.tails.set(key, done);
    await previous;
    try {
      return fn();
    } finally {
      release();
      if (this.tails.get(key) === done) this.tails.delete(key);
    }
  }
}
export class TargetSlots {
  private owners = new Map<string, string>();
  acquire(key: string, holder: string): boolean {
    const current = this.owners.get(key);
    if (current && current !== holder) return false;
    this.owners.set(key, holder);
    return true;
  }
  release(key: string, holder: string): void {
    if (this.owners.get(key) === holder) this.owners.delete(key);
  }
}
