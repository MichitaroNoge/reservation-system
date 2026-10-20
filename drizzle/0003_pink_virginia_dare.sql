CREATE TABLE "reservation_submission" (
	"firebase_uid" text NOT NULL,
	"request_key" varchar(128) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"reservation_code" varchar(30) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_submission_firebase_uid_request_key_pk" PRIMARY KEY("firebase_uid","request_key")
);
--> statement-breakpoint
ALTER TABLE "reservation_submission" ADD CONSTRAINT "reservation_submission_reservation_code_reservation_reservation_code_fk" FOREIGN KEY ("reservation_code") REFERENCES "public"."reservation"("reservation_code") ON DELETE no action ON UPDATE no action;