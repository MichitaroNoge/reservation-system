import "server-only";
import { z } from "zod";
import { consumeLimits } from "../abuse-limits";
import { requireAdmin, requireVerifiedFirebaseUser, verifyOptionalFirebaseUser } from "../auth";
import { getReservationRepository } from "../repositories";
import { inquiryAvailabilitySchema } from "./availability";
import { enqueueMail } from "../mail-dispatch";
import { inquiryRepository, InquiryError } from "./repository";
import { generalInquirySubmissionSchema, inquirySubmissionSchema, inquiryReplySchema, inquiryMailResolutionSchema, parseInquiryQuery, parseReservationInquiryQuery } from "./types";
import { inquiryError, issueChallenge, json, readBody, sameOrigin, submissionLimits, verifyChallenge } from "./http";
export async function challenge(request: Request) { try {
    await consumeLimits([{ key: "inquiry:challenge", max: 100, seconds: 60 }]);
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some(key => key !== "requestKey") || params.getAll("requestKey").length > 1) return json({ error: "フォームの準備条件を確認してください。" }, 400);
    const requestKey = z.string().uuid().optional().parse(params.get("requestKey") ?? undefined);
    return issueChallenge(request, Date.now(), requestKey);
}
catch (error) {
    return inquiryError(error);
} }
export async function submit(request: Request, reservationNumber?: string) {
    try {
        sameOrigin(request);
        if (request.headers.has("authorization") && !/^Bearer\s+\S+/i.test(request.headers.get("authorization") ?? ""))
            throw new InquiryError("ログイン状態を確認してください。", 401);
        const optional = await verifyOptionalFirebaseUser(request);
        const user = optional ? await requireVerifiedFirebaseUser(request) : null;
        const input = (reservationNumber ? inquirySubmissionSchema : generalInquirySubmissionSchema).parse(await readBody(request));
        if (input.website)
            throw new InquiryError("送信内容を確認してください。", 400);
        const actor = user ? `user:${user.uid}` : verifyChallenge(request, input.formToken, input.requestKey);
        const repo = await inquiryRepository();
        const reservation = reservationNumber ? (user ? await repo.ownedReservation(reservationNumber, user.uid) : null) : null;
        if (reservationNumber && !reservation)
            throw new InquiryError("予約のお問い合わせにはログインが必要です。", 401);
        const availability = !reservation && input.category === "availability" ? inquiryAvailabilitySchema.parse(input) : null;
        const number = await repo.create({ name: input.name, email: input.email, category: reservation ? "reservation" : input.category, subject: availability ? "空き状況について" : input.subject, body: input.body, requestKey: input.requestKey, ...(availability ?? {}) }, actor, user?.uid ?? null, reservation?.id ?? null, submissionLimits(request, input.email, user?.uid ?? null));
        return json({ number, receiptEmailSent: false, receiptEmailQueued: true, message: "お問い合わせを受け付けました。" }, 201);
    }
    catch (error) {
        return inquiryError(error);
    }
}
export async function reservationContext(request: Request, number: string) {
    try {
        const user = await requireVerifiedFirebaseUser(request), repo = await inquiryRepository();
        const reservation = await repo.ownedReservation(number, user.uid), account = await (await getReservationRepository()).findAccountByFirebaseUid(user.uid);
        return json({ reservationNumber: reservation.number, name: account?.name ?? user.name ?? "", email: account?.contact ?? user.email ?? "" });
    }
    catch (error) {
        return inquiryError(error);
    }
}
export async function myInquiries(request: Request, number?: string) {
    try {
        const user = await requireVerifiedFirebaseUser(request), repo = await inquiryRepository();
        return json(number ? await repo.detail(number, user.uid) : await repo.list(parseInquiryQuery(new URL(request.url)), user.uid));
    }
    catch (error) {
        return inquiryError(error);
    }
}
export async function adminInquiries(request: Request, number?: string) {
    try {
        await requireAdmin(request);
        if (request.method !== "GET") { const response = json({ error: "対応状況は回答に合わせて自動更新されます。" }, 405); response.headers.set("Allow", "GET"); return response; }
        const repo = await inquiryRepository();
        return json(number ? await repo.detail(number) : await repo.list(parseInquiryQuery(new URL(request.url))));
    }
    catch (error) {
        return inquiryError(error);
    }
}
export async function reply(request: Request, number: string, replyId?: string, receipt = false) {
    try {
        const admin = await requireAdmin(request);
        sameOrigin(request);
        const repo = await inquiryRepository();
        if (replyId || receipt) {
            z.object({}).strict().parse(await readBody(request));
            if (replyId)
                z.string().uuid().parse(replyId);
        }
        else {
            const input = inquiryReplySchema.parse(await readBody(request));
            replyId = await repo.prepareReply(number, input, admin.uid, typeof admin.name === "string" ? admin.name : admin.email ?? null);
        }
        const detail = await repo.detail(number);
        if (replyId && !detail.replies.some(item => item.id === replyId)) throw new InquiryError("回答が見つかりません。", 404);
        // New replies are queued atomically by prepareReply. Explicit retries reuse the same provider key.
        await enqueueMail(repo.db, { kind: "inquiry", number, replyId }, true);
        console.info(JSON.stringify({event:"inquiry_mail_admin_action",number,kind:receipt?"receipt":"reply",actor:admin.uid}));
        return json(await repo.detail(number));
    }
    catch (error) {
        return inquiryError(error);
    }
}

export async function reservationInquiryHistory(request: Request, number: string, admin = false) {
    try {
        const user = admin ? await requireAdmin(request) : await requireVerifiedFirebaseUser(request);
        const query = parseReservationInquiryQuery(new URL(request.url));
        return json(await (await inquiryRepository()).reservationHistory(number, query, admin ? undefined : user.uid));
    } catch (error) { return inquiryError(error); }
}

export async function resolveReplyMail(request: Request, number: string, replyId: string) {
    try {
        const admin = await requireAdmin(request);
        sameOrigin(request);
        z.string().uuid().parse(replyId);
        const input = inquiryMailResolutionSchema.parse(await readBody(request));
        const repo = await inquiryRepository();
        await repo.resolveReplyMail(number, replyId, input.outcome, input.revision, admin.uid);
        console.info(JSON.stringify({ event: "inquiry_mail_resolved", number, replyId, outcome: input.outcome, actor: admin.uid }));
        return json(await repo.detail(number));
    } catch (error) { return inquiryError(error); }
}
