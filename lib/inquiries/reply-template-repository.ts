import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { inquiryReplyTemplate } from "../db/schema";
import type { ReservationDatabase } from "../repositories/drizzle-reservation-repository";
import { InquiryError } from "./types";
import type { ReplyTemplateFields } from "./reply-template-types";

export class InquiryReplyTemplateRepository {
  constructor(private db: ReservationDatabase) {}
  async list(activeOnly = false) {
    return this.db.select({ id: inquiryReplyTemplate.id, name: inquiryReplyTemplate.name, isActive: inquiryReplyTemplate.isActive, revision: inquiryReplyTemplate.revision, createdAt: inquiryReplyTemplate.createdAt, updatedAt: inquiryReplyTemplate.updatedAt })
      .from(inquiryReplyTemplate).where(activeOnly ? eq(inquiryReplyTemplate.isActive, true) : undefined).orderBy(asc(inquiryReplyTemplate.name), asc(inquiryReplyTemplate.id));
  }
  async listWithBodies(activeOnly = false) {
    return this.db.select().from(inquiryReplyTemplate)
      .where(activeOnly ? eq(inquiryReplyTemplate.isActive, true) : undefined).orderBy(asc(inquiryReplyTemplate.name), asc(inquiryReplyTemplate.id));
  }
  async get(id: string) {
    const [row] = await this.db.select().from(inquiryReplyTemplate).where(eq(inquiryReplyTemplate.id, id));
    if (!row) throw new InquiryError("テンプレートが見つかりません。", 404);
    return row;
  }
  async create(input: ReplyTemplateFields & { id: string }) {
    const [created] = await this.db.insert(inquiryReplyTemplate).values(input).onConflictDoNothing({ target: inquiryReplyTemplate.id }).returning();
    if (created) return created;
    const current = await this.get(input.id);
    if (current.name !== input.name || current.body !== input.body || current.isActive !== input.isActive) throw new InquiryError("同じ登録操作で内容が変更されています。再読み込みしてください。", 409);
    return current;
  }
  async update(id: string, input: ReplyTemplateFields & { revision: number }) {
    const { revision, ...fields } = input;
    const [updated] = await this.db.update(inquiryReplyTemplate).set({ ...fields, revision: sql`${inquiryReplyTemplate.revision}+1`, updatedAt: new Date().toISOString() })
      .where(and(eq(inquiryReplyTemplate.id, id), eq(inquiryReplyTemplate.revision, revision))).returning();
    if (updated) return updated;
    await this.get(id);
    throw new InquiryError("他の管理者が更新しています。画面を開き直して確認してください。", 409);
  }
}
