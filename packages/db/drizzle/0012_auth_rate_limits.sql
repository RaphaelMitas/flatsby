CREATE TABLE "flat-cove_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "flat-cove_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "flat-cove_sign_in_code_request" (
	"email_hash" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp NOT NULL
);
