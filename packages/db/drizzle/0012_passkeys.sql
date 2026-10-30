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
ALTER TABLE "flat-cove_passkey" ADD CONSTRAINT "flat-cove_passkey_user_id_flat-cove_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."flat-cove_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "passkey_user_idx" ON "flat-cove_passkey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credential_idx" ON "flat-cove_passkey" USING btree ("credential_id");