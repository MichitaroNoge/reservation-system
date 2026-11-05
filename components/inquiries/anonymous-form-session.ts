/** Anonymous form proofs expire independently of the stable submission identity. */
export type InquiryFormProof = { requestKey: string; formToken: string };
type Clock = { now: () => number; wait: (milliseconds: number) => Promise<void> };
export class AnonymousInquiryFormSession {
  private proof: (InquiryFormProof & { readyAt: number; renewAt: number }) | null = null;
  private preparing: Promise<void> | null = null;
  constructor(readonly requestKey: string, private issue: (key: string) => Promise<InquiryFormProof>, private clock: Clock = { now: Date.now, wait: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)) }) {}

  async prepare(force = false): Promise<void> {
    if (this.preparing) { await this.preparing; return; }
    if (!force && this.proof && this.clock.now() < this.proof.renewAt) return;
    if (!this.preparing) {
      this.preparing = (async () => {
        const proof = await this.issue(this.requestKey);
        if (proof.requestKey !== this.requestKey) throw new Error("フォームの送信識別子を確認できません。再度お試しください。");
        const receivedAt = this.clock.now();
        this.proof = { ...proof, readyAt: receivedAt + 2100, renewAt: receivedAt + 25 * 60000 };
      })().finally(() => { this.preparing = null; });
    }
    await this.preparing;
  }

  async token(): Promise<string> {
    await this.prepare();
    const proof = this.proof!;
    const delay = proof.readyAt - this.clock.now();
    if (delay > 0) await this.clock.wait(delay);
    // A concurrent renewal must also respect the server's minimum form age.
    if (this.proof !== proof || this.clock.now() >= proof.renewAt) return this.token();
    return proof.formToken;
  }
}
