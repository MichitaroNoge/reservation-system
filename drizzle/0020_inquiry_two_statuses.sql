-- Reclassify from actual published replies/delivery; do not treat an unanswered legacy "closed" row as answered.
LOCK TABLE "inquiry" IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
LOCK TABLE "inquiry_reply" IN SHARE MODE;--> statement-breakpoint
UPDATE "inquiry" AS i
SET "status" = CASE WHEN EXISTS (SELECT 1 FROM "inquiry_reply" r WHERE r.inquiry_id = i.id)
    AND (i.firebase_uid IS NOT NULL OR NOT EXISTS (SELECT 1 FROM "inquiry_reply" r WHERE r.inquiry_id = i.id AND r.email_status NOT IN ('sent','not_sent')))
    THEN 'answered'::inquiry_status ELSE 'unhandled'::inquiry_status END,
    "revision" = i.revision + 1, "updated_at" = now()
WHERE i.status::text IS DISTINCT FROM (CASE WHEN EXISTS (SELECT 1 FROM "inquiry_reply" r WHERE r.inquiry_id = i.id)
    AND (i.firebase_uid IS NOT NULL OR NOT EXISTS (SELECT 1 FROM "inquiry_reply" r WHERE r.inquiry_id = i.id AND r.email_status NOT IN ('sent','not_sent')))
    THEN 'answered' ELSE 'unhandled' END);--> statement-breakpoint
ALTER TABLE "inquiry" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "inquiry" ALTER COLUMN "status" SET DEFAULT 'unhandled'::text;--> statement-breakpoint
DROP TYPE "public"."inquiry_status";--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('unhandled', 'answered');--> statement-breakpoint
ALTER TABLE "inquiry" ALTER COLUMN "status" SET DEFAULT 'unhandled'::"public"."inquiry_status";--> statement-breakpoint
ALTER TABLE "inquiry" ALTER COLUMN "status" SET DATA TYPE "public"."inquiry_status" USING "status"::"public"."inquiry_status";