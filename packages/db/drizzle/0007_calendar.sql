CREATE TABLE "flat-cove_calendar_item_member" (
	"item_id" integer NOT NULL,
	"group_member_id" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "flat-cove_calendar_item_member_item_id_group_member_id_pk" PRIMARY KEY("item_id","group_member_id")
);
--> statement-breakpoint
CREATE TABLE "flat-cove_calendar_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"kind" varchar(16) NOT NULL,
	"title" varchar(256) NOT NULL,
	"color" varchar(16) NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"start_time" time,
	"end_time" time,
	"recurrence" jsonb,
	"created_by_group_member_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flat-cove_calendar_occurrence" (
	"item_id" integer NOT NULL,
	"occurs_on" date NOT NULL,
	"skipped" boolean DEFAULT false NOT NULL,
	"completed_by_group_member_id" integer,
	"completed_at" timestamp,
	CONSTRAINT "flat-cove_calendar_occurrence_item_id_occurs_on_pk" PRIMARY KEY("item_id","occurs_on")
);
--> statement-breakpoint
ALTER TABLE "flat-cove_calendar_item_member" ADD CONSTRAINT "flat-cove_calendar_item_member_item_id_flat-cove_calendar_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."flat-cove_calendar_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flat-cove_calendar_item_member" ADD CONSTRAINT "flat-cove_calendar_item_member_group_member_id_flat-cove_group_members_id_fk" FOREIGN KEY ("group_member_id") REFERENCES "public"."flat-cove_group_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flat-cove_calendar_item" ADD CONSTRAINT "flat-cove_calendar_item_group_id_flat-cove_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."flat-cove_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flat-cove_calendar_item" ADD CONSTRAINT "flat-cove_calendar_item_created_by_group_member_id_flat-cove_group_members_id_fk" FOREIGN KEY ("created_by_group_member_id") REFERENCES "public"."flat-cove_group_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flat-cove_calendar_occurrence" ADD CONSTRAINT "flat-cove_calendar_occurrence_item_id_flat-cove_calendar_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."flat-cove_calendar_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flat-cove_calendar_occurrence" ADD CONSTRAINT "flat-cove_calendar_occurrence_completed_by_group_member_id_flat-cove_group_members_id_fk" FOREIGN KEY ("completed_by_group_member_id") REFERENCES "public"."flat-cove_group_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_item_group_idx" ON "flat-cove_calendar_item" USING btree ("group_id");