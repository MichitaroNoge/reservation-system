/** Keep the same identifier after a lost response, until this submission succeeds. */
export class ReservationSubmission {
  private pending: { payload: string; key: string } | null = null;
  begin(payload: string) {
    if (!this.pending || this.pending.payload !== payload) this.pending = { payload, key: crypto.randomUUID() };
    return this.pending.key;
  }
  complete(key: string) {
    if (this.pending?.key === key) this.pending = null;
  }
}
