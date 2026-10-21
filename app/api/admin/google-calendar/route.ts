import { calendarAdmin } from "@/lib/google-calendar/http";
export const runtime = "nodejs";
export const GET = (request: Request) => calendarAdmin(request);
export const POST = (request: Request) => calendarAdmin(request);
