CREATE TYPE "public"."billing_status" AS ENUM('UNBILLED', 'INVOICED', 'PAID', 'VOIDED');--> statement-breakpoint
CREATE TYPE "public"."billing_type" AS ENUM('USAGE', 'CANCELLATION');--> statement-breakpoint
CREATE TYPE "public"."reservation_change_request_status" AS ENUM('REQUESTED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('TEMPORARY_REQUESTED', 'TEMPORARY_CONFIRMED', 'TEMPORARY_REJECTED', 'CONFIRMED_REQUESTED', 'CONFIRMED', 'CONFIRMED_REJECTED', 'WAITING_FOR_VISIT', 'VISITED', 'CANCELLATION_REQUESTED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(30),
	"address" varchar(500),
	"account_type" varchar(30),
	"company_branch_name" varchar(100),
	"contact_person_name" varchar(100),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "account_contact_email" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"verified_at" timestamp with time zone,
	"verification_token_hash" varchar(64) NOT NULL,
	"verification_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_contact_email_verification_token_hash_unique" UNIQUE("verification_token_hash")
);
--> statement-breakpoint
CREATE TABLE "approval_email_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_key" varchar(180) NOT NULL,
	"reservation_id" uuid NOT NULL,
	"email_type" varchar(50) NOT NULL,
	"reference_id" varchar(100),
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	CONSTRAINT "approval_email_delivery_delivery_key_unique" UNIQUE("delivery_key")
);
--> statement-breakpoint
CREATE TABLE "billing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"visit_detail_id" uuid,
	"billing_type" "billing_type" NOT NULL,
	"amount" integer NOT NULL,
	"billing_date" date NOT NULL,
	"status" "billing_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" text,
	"name" varchar(100) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"email" varchar(255) NOT NULL,
	"address" varchar(500),
	"account_type" varchar(30),
	"company_branch_name" varchar(100),
	"contact_person_name" varchar(100),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "email_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_key" varchar(240) NOT NULL,
	"reservation_id" uuid,
	"template_key" varchar(80) NOT NULL,
	"recipient" text NOT NULL,
	"subject" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"status" varchar(20) NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"last_error" text,
	CONSTRAINT "email_delivery_delivery_key_unique" UNIQUE("delivery_key")
);
--> statement-breakpoint
CREATE TABLE "email_sender_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_key" varchar(40) NOT NULL,
	"sender_name" varchar(100) NOT NULL,
	"from_email" varchar(255) NOT NULL,
	"reply_to_enabled" boolean DEFAULT false NOT NULL,
	"reply_to_email" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_sender_setting_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "email_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_key" varchar(80) NOT NULL,
	"name" varchar(100) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_template_template_key_unique" UNIQUE("template_key")
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billing_id" uuid NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_billing_id_unique" UNIQUE("billing_id"),
	CONSTRAINT "invoice_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "menu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"standard_price" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_code" varchar(30) NOT NULL,
	"customer_id" uuid,
	"account_id" uuid,
	"reserver_name" varchar(100),
	"reserver_email" varchar(255),
	"reserver_phone" varchar(30),
	"reserver_address" varchar(500),
	"reserver_account_type" varchar(30),
	"reserver_company_branch_name" varchar(100),
	"reserver_contact_person_name" varchar(100),
	"usage_date" date NOT NULL,
	"usage_time" varchar(5) NOT NULL,
	"usage_end_time" varchar(5),
	"status" "reservation_status" NOT NULL,
	"request_type" varchar(50),
	"booking_type" varchar(30),
	"booking_contact_name" varchar(100),
	"day_contact_name" varchar(100),
	"day_contact_phone" varchar(30),
	"group_name" varchar(100),
	"group_name_kana" varchar(100),
	"group_type" varchar(100),
	"group_type_other" varchar(100),
	"tc_count" integer DEFAULT 0 NOT NULL,
	"dg_count" integer DEFAULT 0 NOT NULL,
	"payment_condition" varchar(30),
	"remarks" text,
	"expected_people" integer NOT NULL,
	"policy_agreement_kind" varchar(20),
	"policy_agreement_accepted_at" timestamp with time zone,
	"confirmation_contacted_at" timestamp with time zone,
	"receipt_email_requested_at" timestamp with time zone,
	"receipt_email_sent_at" timestamp with time zone,
	"receipt_email_last_attempt_at" timestamp with time zone,
	"receipt_email_retry_count" integer DEFAULT 0 NOT NULL,
	"receipt_email_last_error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_reservation_code_unique" UNIQUE("reservation_code")
);
--> statement-breakpoint
CREATE TABLE "reservation_change_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"requested_date" date NOT NULL,
	"requested_time" varchar(5) NOT NULL,
	"requested_people" integer NOT NULL,
	"requested_menu_items_json" text NOT NULL,
	"reason" text,
	"status" "reservation_change_request_status" NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reservation_detail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"people" integer NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_detail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_record_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"visited_at" timestamp with time zone NOT NULL,
	"actual_people" integer NOT NULL,
	CONSTRAINT "visit_record_reservation_id_unique" UNIQUE("reservation_id")
);
--> statement-breakpoint
ALTER TABLE "account_contact_email" ADD CONSTRAINT "account_contact_email_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_email_delivery" ADD CONSTRAINT "approval_email_delivery_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "billing_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "billing_visit_detail_id_visit_detail_id_fk" FOREIGN KEY ("visit_detail_id") REFERENCES "public"."visit_detail"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_delivery" ADD CONSTRAINT "email_delivery_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_billing_id_billing_id_fk" FOREIGN KEY ("billing_id") REFERENCES "public"."billing"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_change_request" ADD CONSTRAINT "reservation_change_request_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_detail" ADD CONSTRAINT "reservation_detail_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_detail" ADD CONSTRAINT "reservation_detail_menu_id_menu_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_assignment" ADD CONSTRAINT "store_assignment_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_assignment" ADD CONSTRAINT "store_assignment_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_detail" ADD CONSTRAINT "visit_detail_visit_record_id_visit_record_id_fk" FOREIGN KEY ("visit_record_id") REFERENCES "public"."visit_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_detail" ADD CONSTRAINT "visit_detail_menu_id_menu_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_record" ADD CONSTRAINT "visit_record_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_contact_email_account_id_idx" ON "account_contact_email" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "approval_email_delivery_reservation_id_idx" ON "approval_email_delivery" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "billing_reservation_id_idx" ON "billing" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "billing_visit_detail_id_idx" ON "billing" USING btree ("visit_detail_id");--> statement-breakpoint
CREATE INDEX "email_delivery_reservation_id_idx" ON "email_delivery" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "invoice_billing_id_idx" ON "invoice" USING btree ("billing_id");--> statement-breakpoint
CREATE INDEX "reservation_customer_id_idx" ON "reservation" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "reservation_account_id_idx" ON "reservation" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "reservation_received_at_idx" ON "reservation" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "reservation_usage_date_idx" ON "reservation" USING btree ("usage_date");--> statement-breakpoint
CREATE INDEX "reservation_change_request_reservation_id_idx" ON "reservation_change_request" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "reservation_change_request_requested_at_idx" ON "reservation_change_request" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "reservation_detail_reservation_id_idx" ON "reservation_detail" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "reservation_detail_menu_id_idx" ON "reservation_detail" USING btree ("menu_id");--> statement-breakpoint
CREATE INDEX "store_assignment_reservation_id_idx" ON "store_assignment" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "store_assignment_store_id_idx" ON "store_assignment" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "visit_detail_visit_record_id_idx" ON "visit_detail" USING btree ("visit_record_id");--> statement-breakpoint
CREATE INDEX "visit_detail_menu_id_idx" ON "visit_detail" USING btree ("menu_id");--> statement-breakpoint
CREATE INDEX "visit_record_reservation_id_idx" ON "visit_record" USING btree ("reservation_id");