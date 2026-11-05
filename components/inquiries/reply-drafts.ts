/** Drafts stay in this signed-in management screen's memory; never in browser storage. */
export type InquiryReplyDraft = { subject: string; body: string; requestKey: string };
export class InquiryReplyDraftStore {
  constructor(readonly ownerId?: string) {}
  private readonly drafts = new Map<string, InquiryReplyDraft>();
  get(number: string) { const draft = this.drafts.get(number); return draft ? { ...draft } : undefined; }
  set(number: string, draft: InquiryReplyDraft) { this.drafts.set(number, { ...draft }); }
  delete(number: string) { this.drafts.delete(number); }
}
