import "server-only";
import { getReservationRepository } from "../repositories";
import { getEmailSenderSnapshot, repositoryEmailClient } from "../email/email-sender-settings";
import { buildEmailContent } from "../email/email-layout";
import { EmailDeliveryError, type EmailClient } from "../email/resend-email-client";
import { InquiryError, type InquiryRepository, type MailTarget } from "./repository";
import type { SenderSnapshot } from "./types";
export type MailDependencies = {
    sender: () => Promise<SenderSnapshot>;
    client: (sender: SenderSnapshot) => Promise<EmailClient>;
    timeoutMs?: number;
};
const dependencies: MailDependencies = { sender: async () => getEmailSenderSnapshot(await getReservationRepository()), client: async (sender) => repositoryEmailClient(await getReservationRepository(), sender) };
/** Persist first, use one provider key and immutable payload, then atomically finalize the outbox. */
export async function deliverInquiryMail(repo: InquiryRepository, target: MailTarget, deps = dependencies) {
    // A previously sent mail must remain a successful no-op even if sender settings are later removed.
    const detail = await repo.detail(target.number);
    if (target.replyId ? detail.replies.some(r => r.id === target.replyId && r.emailStatus === "sent") : detail.inquiry.receiptEmailStatus === "sent")
        return;
    const answerNotice = target.replyId ? "回答は保存され、お客様の履歴に公開されています。" : "";
    let sender: SenderSnapshot;
    try {
        sender = (await repo.frozenSender(target)) ?? await deps.sender();
    }
    catch {
        throw new InquiryError(answerNotice + "メール送信設定を確認してください。問い合わせと回答は保存されています。", 503);
    }
    const claim = await repo.claimMail(target, sender);
    if (!claim)
        return;
    let result: {
        id: string;
    } | {
        error: "failed" | "unknown";
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const client = await deps.client(claim.sender);
        const content = buildEmailContent(claim.delivery.subject, claim.delivery.body, { linkify: false });
        result = await Promise.race([client.send({ to: claim.delivery.recipient, ...content, idempotencyKey: claim.delivery.deliveryKey }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new EmailDeliveryError("timeout")), deps.timeoutMs ?? 20000); })]);
    }
    catch (error) {
        result = { error: error instanceof EmailDeliveryError ? error.outcome : (error && typeof error === "object" && "statusCode" in error && [400, 429, 503].includes(Number(error.statusCode))) ? "failed" : "unknown" };
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
    // Do not mark success if the final DB write fails. A retry uses the same frozen delivery and key.
    try {
        await repo.finishMail(target, claim.token, result);
    }
    catch {
        throw new InquiryError("送信結果の保存を確認できません。少し待って再読み込みし、同じ回答の再試行を行ってください。", 503);
    }
    console.info(JSON.stringify({ event: "inquiry_mail_result", number: target.number, kind: target.replyId ? "reply" : "receipt", result: "id" in result ? "sent" : result.error }));
    if ("error" in result)
        throw new InquiryError(answerNotice + (result.error === "unknown" ? "メールの送信結果が不明です。同じ回答の再試行で確認してください。" : "メールを送信できませんでした。少し待って同じ回答を再試行してください。"), 502);
}
