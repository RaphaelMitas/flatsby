CREATE TABLE "flat-cove_pin" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"title" varchar(60) NOT NULL,
	"body" text NOT NULL,
	"icon" varchar(16) NOT NULL,
	"wifi" jsonb,
	"created_by_group_member_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flat-cove_pin" ADD CONSTRAINT "flat-cove_pin_group_id_flat-cove_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."flat-cove_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flat-cove_pin" ADD CONSTRAINT "flat-cove_pin_created_by_group_member_id_flat-cove_group_members_id_fk" FOREIGN KEY ("created_by_group_member_id") REFERENCES "public"."flat-cove_group_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pin_group_idx" ON "flat-cove_pin" USING btree ("group_id");