import { createReplyTemplate, listReplyTemplates } from "@/lib/inquiries/reply-template-controllers";
export const runtime = "nodejs";
export const GET = listReplyTemplates;
export const POST = createReplyTemplate;
