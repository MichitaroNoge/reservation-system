ALTER TABLE "approval_email_delivery" ADD COLUMN "snapshot_key" text;--> statement-breakpoint
ALTER TABLE "approval_email_delivery" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "approval_email_delivery" ADD COLUMN "stopped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inquiry_reply" ADD COLUMN "resolution" jsonb;--> statement-breakpoint
ALTER TABLE "reservation" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reservation" ADD COLUMN "cancellation_previous_status" varchar(40);--> statement-breakpoint
ALTER TABLE "reservation" ADD COLUMN "receipt_email_next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservation_change_request" ADD COLUMN "base_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE approval_email_delivery AS a SET sent_at = e.sent_at, last_error = NULL
FROM email_delivery AS e
WHERE e.delivery_key = 'reservation-approval/' || a.delivery_key AND e.status = 'sent' AND e.sent_at IS NOT NULL AND a.sent_at IS NULL;
--> statement-breakpoint
-- Legacy unsent payloads have no trustworthy reservation snapshot. Retain their audit trail,
-- but never replay potentially obsolete dates/amounts after upgrading.
UPDATE approval_email_delivery SET stopped_at = now(), last_error = '旧通知の予約内容を確認できないため送信を停止しました。予約と送信履歴を確認してください。'
WHERE sent_at IS NULL AND snapshot_key IS NULL;
--> statement-breakpoint
-- Recover only approval states supported by existing durable history. Unknown states stay unknown.
UPDATE reservation AS r SET cancellation_previous_status = CASE
  WHEN g.approved_kind = 'temporary' THEN 'temporary_confirmed'
  WHEN g.approved_kind = 'confirmed' OR r.initial_confirmed_people IS NOT NULL THEN 'confirmed'
  ELSE NULL END
FROM google_calendar_sync AS g
WHERE r.id = g.reservation_id AND r.status = 'CANCELLATION_REQUESTED';
