ALTER TABLE "reservation_change_request" ADD COLUMN "fee_acknowledgement" jsonb;
--> statement-breakpoint
-- Reconcile previously excluded IDs too: an unknown insert may have left an event.
UPDATE google_calendar_sync SET status = 'pending', next_attempt_at = now(), attempts = 0
WHERE status = 'excluded';
