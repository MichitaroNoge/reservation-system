CREATE TABLE "reservation_policy_consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"accepted_by_firebase_uid" text NOT NULL,
	"source" varchar(40) NOT NULL,
	"policy_version" varchar(64) NOT NULL,
	"policy_text" text NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL,
	"people" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservation_policy_consent" ADD CONSTRAINT "reservation_policy_consent_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reservation_policy_consent_reservation_id_idx" ON "reservation_policy_consent" USING btree ("reservation_id");