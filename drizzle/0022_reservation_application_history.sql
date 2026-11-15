-- This additive upgrade is safe to apply independently while an older migration
-- is pending. The normal migrator can later register it without replaying data.
DO $history_upgrade$
BEGIN
IF to_regclass('public.reservation_application_history') IS NULL THEN
CREATE TABLE "reservation_application_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_key" text NOT NULL,
	"reservation_id" uuid NOT NULL,
	"kind" varchar(40) NOT NULL,
	"status" varchar(20) NOT NULL,
	"reference_id" text,
	"requested_at" timestamp with time zone,
	"requested_by" jsonb,
	"before_snapshot" jsonb,
	"requested_snapshot" jsonb,
	"processed_at" timestamp with time zone,
	"processed_by" jsonb,
	"applied_before_snapshot" jsonb,
	"after_snapshot" jsonb,
	"reason" text,
	"legacy" boolean DEFAULT false NOT NULL,
	CONSTRAINT "reservation_application_history_event_key_unique" UNIQUE("event_key")
);

ALTER TABLE "reservation_application_history" ADD CONSTRAINT "reservation_application_history_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "reservation_history_reservation_idx" ON "reservation_application_history" USING btree ("reservation_id");
CREATE INDEX "reservation_history_kind_processed_idx" ON "reservation_application_history" USING btree ("kind","processed_at");
-- Only persisted historical facts are imported. No before-state, reviewer or
-- processing time is reconstructed from the current reservation.
INSERT INTO reservation_application_history (id, event_key, reservation_id, kind, status, reference_id, requested_at, requested_snapshot, processed_at, reason, legacy)
SELECT gen_random_uuid(), 'legacy-change:' || c.id::text, c.reservation_id, 'change', lower(c.status::text), c.id::text, c.requested_at,
  jsonb_build_object('id', r.reservation_code, 'date', c.requested_date, 'startTime', c.requested_time, 'people', c.requested_people, 'menuItems', c.requested_menu_items_json::jsonb, 'feeAcknowledgement', c.fee_acknowledgement),
  c.reviewed_at, c.reason, true
FROM reservation_change_request c JOIN reservation r ON r.id = c.reservation_id
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO reservation_application_history (id, event_key, reservation_id, kind, status, reference_id, requested_at, requested_by, requested_snapshot, legacy)
SELECT gen_random_uuid(), 'legacy-consent:' || c.id::text, c.reservation_id,
  CASE WHEN c.source = 'confirmed_change_request' THEN 'confirmed_conversion' ELSE 'reservation' END,
  'unknown', c.id::text, c.accepted_at,
  jsonb_build_object('uid', c.accepted_by_firebase_uid, 'label', 'お客様', 'role', 'customer'),
  jsonb_build_object('id', r.reservation_code, 'people', c.people, 'policyConsents', jsonb_build_array(jsonb_build_object('source', c.source, 'acceptedAt', c.accepted_at, 'version', c.policy_version, 'policyText', c.policy_text, 'people', c.people))), true
FROM reservation_policy_consent c JOIN reservation r ON r.id = c.reservation_id
WHERE c.source IN ('confirmed_request', 'confirmed_change_request')
ON CONFLICT (event_key) DO NOTHING;

CREATE FUNCTION protect_reservation_application_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'requested' OR NEW.status = 'requested' OR
    ROW(NEW.id, NEW.event_key, NEW.reservation_id, NEW.kind, NEW.reference_id, NEW.requested_at, NEW.requested_by, NEW.before_snapshot, NEW.requested_snapshot, NEW.reason, NEW.legacy)
    IS DISTINCT FROM
    ROW(OLD.id, OLD.event_key, OLD.reservation_id, OLD.kind, OLD.reference_id, OLD.requested_at, OLD.requested_by, OLD.before_snapshot, OLD.requested_snapshot, OLD.reason, OLD.legacy) THEN
    RAISE EXCEPTION 'Reservation application history is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reservation_application_history_immutable BEFORE UPDATE ON reservation_application_history FOR EACH ROW EXECUTE FUNCTION protect_reservation_application_history();

END IF;
END;
$history_upgrade$;
