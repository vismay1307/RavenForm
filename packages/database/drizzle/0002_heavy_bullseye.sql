CREATE TABLE "auth_otp_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"otp_hash" varchar(64) NOT NULL,
	"full_name" varchar(80),
	"pending_password_hash" text,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
