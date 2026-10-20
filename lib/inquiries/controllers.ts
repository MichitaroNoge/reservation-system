import "server-only";
import { z } from "zod";
import { consumeLimits } from "../abuse-limits";
import { requireAdmin, requireVerifiedFirebaseUser, verifyOptionalFirebaseUser } from "../auth";
import { getReservationRepository } from "../repositories";
import { deliverInquiryMail } from "./mail-service";
import { inquiryRepository, InquiryError } from "./repository";
import { inquirySubmissionSchema, inquiryReplySchema, inquiryStatusSchema, parseInquiryQuery, parseReservationInquiryQuery } from "./types";
import { inquiryError, issueChallenge, json, readBody, sameOrigin, submissionLimits, verifyChallenge } from "./http";
export async function challenge(request: Request) { try {
    await consumeLimits([{ key: "inquiry:challenge", max: 100, seconds: 60 }]);
    return issueChallenge(request);
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
        const input = inquirySubmissionSchema.parse(await readBody(request));
        if (input.website)
            throw new InquiryError("送信内容を確認してください。", 400);
        const actor = user ? `user:${user.uid}` : verifyChallenge(request, input.formToken, input.requestKey);
        const repo = await inquiryRepository();
        const reservation = reservationNumber ? (user ? await repo.ownedReservation(reservationNumber, user.uid) : null) : null;
        if (reservationNumber && !reservation)
            throw new InquiryError("予約のお問い合わせにはログインが必要です。", 401);
        const number = await repo.create({ name: input.name, email: input.email, category: reservation ? "reservation" : input.category, subject: input.subject, body: input.body, requestKey: input.requestKey }, actor, user?.uid ?? null, reservation?.id ?? null, submissionLimits(request, input.email, user?.uid ?? null));
        let receiptEmailSent = true;
        try {
            await deliverInquiryMail(repo, { number });
        }
        catch {
            receiptEmailSent = false;
        }
        return json({ number, receiptEmailSent, message: receiptEmailSent ? "お問い合わせを受け付けました。" : "お問い合わせは保存されました。受付メールを送信できませんでした。問い合わせ番号をお控えください。" }, 201);
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
        const admin = await requireAdmin(request);
        const repo = await inquiryRepository();
        if (request.method === "GET")
            return json(number ? await repo.detail(number) : await repo.list(parseInquiryQuery(new URL(request.url))));
        sameOrigin(request);
        if (!number)
            throw new InquiryError("問い合わせ番号が必要です。", 400);
        const input = inquiryStatusSchema.parse(await readBody(request));
        await repo.setStatus(number, input.status, input.revision);
        console.info(JSON.stringify({event:"inquiry_status_changed",number,status:input.status,actor:admin.uid}));
        return json(await repo.detail(number));
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
        await deliverInquiryMail(repo, { number, replyId });
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
