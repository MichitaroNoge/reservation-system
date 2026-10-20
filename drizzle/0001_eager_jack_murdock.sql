CREATE TABLE "abuse_limit" (
	"bucket_key" varchar(64) PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "abuse_limit_expires_at_idx" ON "abuse_limit" USING btree ("expires_at");