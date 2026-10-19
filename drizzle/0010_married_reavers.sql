CREATE TYPE "public"."inquiry_category" AS ENUM('reservation', 'service', 'other');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('unhandled', 'in_progress', 'answered', 'closed');--> statement-breakpoint
CREATE TABLE "inquiry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_number" integer GENERATED ALWAYS AS IDENTITY (sequence name "inquiry_inquiry_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1001 CACHE 1),
	"firebase_uid" text,
	"reservation_id" uuid,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"category" "inquiry_category" NOT NULL,
	"subject" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"status" "inquiry_status" DEFAULT 'unhandled' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"request_key" uuid NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"receipt_email_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"receipt_message_id" text,
	"receipt_first_attempt_at" timestamp with time zone,
	"receipt_last_attempt_at" timestamp with time zone,
	"receipt_attempts" integer DEFAULT 0 NOT NULL,
	"receipt_lease_until" timestamp with time zone,
	"receipt_lease_token" uuid,
	"receipt_sender" jsonb,
	CONSTRAINT "inquiry_inquiry_number_unique" UNIQUE("inquiry_number"),
	CONSTRAINT "inquiry_request_key_unique" UNIQUE("request_key")
);
--> statement-breakpoint
CREATE TABLE "inquiry_reply" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"admin_firebase_uid" text NOT NULL,
	"admin_label" text,
	"subject" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"email_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"resend_message_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_key" uuid NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"first_attempt_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease_until" timestamp with time zone,
	"lease_token" uuid,
	"last_error" varchar(50),
	"sender" jsonb,
	CONSTRAINT "inquiry_reply_request_key_unique" UNIQUE("request_key")
);
--> statement-breakpoint
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_reply" ADD CONSTRAINT "inquiry_reply_inquiry_id_inquiry_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiry_owner_created_idx" ON "inquiry" USING btree ("firebase_uid","created_at","id");--> statement-breakpoint
CREATE INDEX "inquiry_status_created_idx" ON "inquiry" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "inquiry_category_created_idx" ON "inquiry" USING btree ("category","created_at","id");--> statement-breakpoint
CREATE INDEX "inquiry_created_idx" ON "inquiry" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "inquiry_reply_inquiry_created_idx" ON "inquiry_reply" USING btree ("inquiry_id","created_at");