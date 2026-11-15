/** Serializes one confirmed operation, including retries after a failed response. */
export class AdminActionGate {
  private executing = false;
  get busy() { return this.executing; }
  async run(action: () => void | boolean | Promise<void | boolean>) {
    if (this.executing) return false;
    this.executing = true;
    try {
      if (await action() === false) throw new Error("処理が完了しませんでした。内容を確認して、もう一度お試しください。");
      return true;
    } finally { this.executing = false; }
  }
}

/** A partial batch can retry failed items without repeating successful operations. */
export function retryableAdminBatch<T>(items: T[], perform: (item: T) => Promise<unknown>) {
  let pending = [...items];
  let completed = 0;
  let running = false;
  return {
    async run() {
      if (running) throw new Error("処理中です。完了するまでお待ちください。");
      running = true;
      try {
        const results = await Promise.allSettled(pending.map(item => Promise.resolve().then(() => perform(item))));
        completed += results.filter(result => result.status === "fulfilled").length;
        pending = pending.filter((_, index) => results[index].status === "rejected");
        return { completed, failed: pending.length };
      } finally { running = false; }
    },
  };
}
