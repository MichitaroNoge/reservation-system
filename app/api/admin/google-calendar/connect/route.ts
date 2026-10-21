import { calendarAdmin } from "@/lib/google-calendar/http";
export const runtime = "nodejs";
export const POST = (request: Request) => calendarAdmin(request, true);
