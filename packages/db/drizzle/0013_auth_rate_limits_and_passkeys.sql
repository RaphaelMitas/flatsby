CREATE TABLE "flat-cove_passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp,
	"aaguid" text
);
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "flat-cove_passkey" ADD CONSTRAINT "flat-cove_passkey_user_id_flat-cove_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."flat-cove_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "passkey_user_idx" ON "flat-cove_passkey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credential_idx" ON "flat-cove_passkey" USING btree ("credential_id");