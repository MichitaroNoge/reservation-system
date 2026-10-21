CREATE TABLE "google_calendar_connection" (
	"key" text PRIMARY KEY NOT NULL,
	"google_sub" text NOT NULL,
	"email" text NOT NULL,
	"refresh_token" text NOT NULL,
	"calendar_id" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"connected_by" text NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "google_calendar_flow" (
	"state_hash" text PRIMARY KEY NOT NULL,
	"browser_hash" text NOT NULL,
	"uid" text NOT NULL,
	"verifier" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_calendar_sync" (
	"reservation_id" uuid PRIMARY KEY NOT NULL,
	"approved_kind" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"event_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"remote_present" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone,
	"last_error" text
);
--> statement-breakpoint
ALTER TABLE "google_calendar_sync" ADD CONSTRAINT "google_calendar_sync_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "google_calendar_sync_due_idx" ON "google_calendar_sync" USING btree ("status","next_attempt_at");
--> statement-breakpoint
CREATE FUNCTION queue_google_calendar_reservation(booking uuid, booking_status text, request_type text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE kind text;
BEGIN
  kind := CASE WHEN booking_status = 'TEMPORARY_CONFIRMED' OR (booking_status = 'CONFIRMED_REQUESTED' AND request_type = 'confirmed_from_temporary') THEN 'temporary'
    WHEN booking_status IN ('CONFIRMED','WAITING_FOR_VISIT','VISITED') THEN 'confirmed' ELSE NULL END;
  IF booking_status = 'CANCELLATION_REQUESTED' THEN
    SELECT approved_kind INTO kind FROM google_calendar_sync WHERE reservation_id = booking;
  END IF;
  INSERT INTO google_calendar_sync (reservation_id, approved_kind) VALUES (booking, kind)
  ON CONFLICT (reservation_id) DO UPDATE SET approved_kind = kind, revision = google_calendar_sync.revision + 1,
    status = 'pending', attempts = 0, next_attempt_at = now(), last_error = NULL;
END $$;
--> statement-breakpoint
CREATE FUNCTION google_calendar_reservation_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM queue_google_calendar_reservation(NEW.id, NEW.status::text, NEW.request_type);
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER google_calendar_reservation_changed AFTER INSERT OR UPDATE OF status, request_type, usage_date, usage_time, usage_end_time, expected_people, reserver_name, group_name ON reservation FOR EACH ROW EXECUTE FUNCTION google_calendar_reservation_changed();
--> statement-breakpoint
CREATE FUNCTION google_calendar_child_changed() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE booking uuid; current_status text; kind text;
BEGIN
  booking := CASE WHEN TG_OP = 'DELETE' THEN OLD.reservation_id ELSE NEW.reservation_id END;
  SELECT status::text, request_type INTO current_status, kind FROM reservation WHERE id = booking;
  IF FOUND THEN PERFORM queue_google_calendar_reservation(booking, current_status, kind); END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER google_calendar_assignment_changed AFTER INSERT OR UPDATE OR DELETE ON store_assignment FOR EACH ROW EXECUTE FUNCTION google_calendar_child_changed();
--> statement-breakpoint
CREATE TRIGGER google_calendar_detail_changed AFTER INSERT OR UPDATE OR DELETE ON reservation_detail FOR EACH ROW EXECUTE FUNCTION google_calendar_child_changed();
--> statement-breakpoint
CREATE FUNCTION google_calendar_master_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'store' THEN
    UPDATE google_calendar_sync SET revision = revision + 1, status = 'pending', attempts = 0, next_attempt_at = now(), last_error = NULL WHERE reservation_id IN (SELECT reservation_id FROM store_assignment WHERE store_id = NEW.id);
  ELSE
    UPDATE google_calendar_sync SET revision = revision + 1, status = 'pending', attempts = 0, next_attempt_at = now(), last_error = NULL WHERE reservation_id IN (SELECT reservation_id FROM reservation_detail WHERE menu_id = NEW.id);
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER google_calendar_store_changed AFTER UPDATE OF name ON store FOR EACH ROW EXECUTE FUNCTION google_calendar_master_changed();
--> statement-breakpoint
CREATE TRIGGER google_calendar_menu_changed AFTER UPDATE OF name, duration_minutes ON menu FOR EACH ROW EXECUTE FUNCTION google_calendar_master_changed();
--> statement-breakpoint
INSERT INTO google_calendar_sync (reservation_id, approved_kind, last_error)
SELECT r.id, CASE
  WHEN r.status = 'TEMPORARY_CONFIRMED' OR (r.status = 'CONFIRMED_REQUESTED' AND r.request_type = 'confirmed_from_temporary') THEN 'temporary'
  WHEN r.status IN ('CONFIRMED','WAITING_FOR_VISIT','VISITED') THEN 'confirmed'
  WHEN r.status = 'CANCELLATION_REQUESTED' AND (r.initial_confirmed_people IS NOT NULL OR EXISTS (SELECT 1 FROM approval_email_delivery a WHERE a.reservation_id = r.id AND a.email_type = 'confirmed_change_approved')) THEN 'confirmed'
  WHEN r.status = 'CANCELLATION_REQUESTED' AND EXISTS (SELECT 1 FROM approval_email_delivery a WHERE a.reservation_id = r.id AND a.email_type IN ('reservation_approved','confirmed_change_approved')) THEN 'approved'
  ELSE NULL END,
  CASE WHEN r.status = 'CANCELLATION_REQUESTED' AND r.initial_confirmed_people IS NULL AND NOT EXISTS (SELECT 1 FROM approval_email_delivery a WHERE a.reservation_id = r.id AND a.email_type IN ('reservation_approved','confirmed_change_approved')) THEN 'approval_unknown' ELSE NULL END
FROM reservation r;
