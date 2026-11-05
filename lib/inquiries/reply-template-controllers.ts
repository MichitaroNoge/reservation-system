import "server-only";
import { z } from "zod";
import { requireAdmin } from "../auth";
import { getDatabase } from "../db/client";
import { inquiryError, json, readBody, sameOrigin } from "./http";
import { InquiryReplyTemplateRepository } from "./reply-template-repository";
import { createReplyTemplateSchema, updateReplyTemplateSchema } from "./reply-template-types";
import { InquiryError } from "./types";

export async function listReplyTemplates(request: Request) {
  try {
    await requireAdmin(request);
    const values: Record<string, string> = {};
    for (const [key, value] of new URL(request.url).searchParams) {
      if (Object.hasOwn(values, key)) throw new InquiryError("検索条件が重複しています。", 400);
      values[key] = value;
    }
    const query = z.object({ activeOnly: z.enum(["true", "false"]).optional(), includeBody: z.enum(["true", "false"]).optional() }).strict().parse(values);
    const repository = new InquiryReplyTemplateRepository(await getDatabase());
    const templates = query.includeBody === "true" ? await repository.listWithBodies(query.activeOnly === "true") : await repository.list(query.activeOnly === "true");
    return json({ templates });
  } catch (error) { return inquiryError(error); }
}
export async function createReplyTemplate(request: Request) {
  try {
    const admin = await requireAdmin(request);
    sameOrigin(request);
    const input = createReplyTemplateSchema.parse(await readBody(request));
    const template = await new InquiryReplyTemplateRepository(await getDatabase()).create(input);
    console.info(JSON.stringify({ event: "inquiry_reply_template_created", id: template.id, actor: admin.uid }));
    return json({ template }, 201);
  } catch (error) { return inquiryError(error); }
}
export async function getReplyTemplate(request: Request, id: string) {
  try {
    await requireAdmin(request);
    z.string().uuid().parse(id);
    return json({ template: await new InquiryReplyTemplateRepository(await getDatabase()).get(id) });
  } catch (error) { return inquiryError(error); }
}
export async function updateReplyTemplate(request: Request, id: string) {
  try {
    const admin = await requireAdmin(request);
    sameOrigin(request);
    z.string().uuid().parse(id);
    const input = updateReplyTemplateSchema.parse(await readBody(request));
    const template = await new InquiryReplyTemplateRepository(await getDatabase()).update(id, input);
    console.info(JSON.stringify({ event: "inquiry_reply_template_updated", id, actor: admin.uid }));
    return json({ template });
  } catch (error) { return inquiryError(error); }
}
