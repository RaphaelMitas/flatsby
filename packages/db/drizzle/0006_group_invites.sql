CREATE TABLE "flat-cove_group_invites" (
	"group_id" integer PRIMARY KEY NOT NULL,
	"code" varchar(8) NOT NULL,
	"created_by_member_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "flat-cove_group_invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "flat-cove_group_invites" ADD CONSTRAINT "flat-cove_group_invites_group_id_flat-cove_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."flat-cove_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flat-cove_group_invites" ADD CONSTRAINT "flat-cove_group_invites_created_by_member_id_flat-cove_group_members_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."flat-cove_group_members"("id") ON DELETE cascade ON UPDATE no action;