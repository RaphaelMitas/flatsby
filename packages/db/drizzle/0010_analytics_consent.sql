CREATE TABLE "flat-cove_analytics_consent" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"screens" boolean NOT NULL,
	"recordings" boolean NOT NULL,
	"version" varchar(20) NOT NULL,
	"platform" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flat-cove_user" ADD COLUMN "analytics_opt_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "flat-cove_analytics_consent" ADD CONSTRAINT "flat-cove_analytics_consent_user_id_flat-cove_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."flat-cove_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_consent_user_idx" ON "flat-cove_analytics_consent" USING btree ("user_id");