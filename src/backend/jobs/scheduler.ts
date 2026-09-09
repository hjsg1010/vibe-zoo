type Task = {
  owner: string;
  run: () => Promise<unknown>;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
};
export class ModelScheduler {
  private queues = { background: [] as Task[], interactive: [] as Task[] };
  private busy = { background: false, interactive: false };
  private last = { background: "", interactive: "" };
  submit<T>(
    lane: "background" | "interactive",
    owner: string,
    run: () => Promise<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queues[lane].push({
        owner,
        run,
        resolve: (v) => resolve(v as T),
        reject,
      });
      this.pump(lane);
    });
  }
  private pump(lane: "background" | "interactive"): void {
    if (this.busy[lane]) return;
    const queue = this.queues[lane];
    if (!queue.length) return;
    const next = queue.findIndex((t) => t.owner !== this.last[lane]);
    const task = queue.splice(next < 0 ? 0 : next, 1)[0]!;
    this.busy[lane] = true;
    this.last[lane] = task.owner;
    void task
      .run()
      .then(task.resolve, task.reject)
      .finally(() => {
        this.busy[lane] = false;
        this.pump(lane);
      });
  }
}
