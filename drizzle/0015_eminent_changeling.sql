CREATE TABLE "transactional_mail_job" (
	"key" text PRIMARY KEY NOT NULL,
	"target" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"lease_token" uuid
);
--> statement-breakpoint
CREATE INDEX "transactional_mail_job_due_idx" ON "transactional_mail_job" USING btree ("status","available_at");