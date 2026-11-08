CREATE TABLE "flat-cove_credit_balance" (
	"user_id" text NOT NULL,
	"month_start" date NOT NULL,
	"used" integer NOT NULL,
	CONSTRAINT "flat-cove_credit_balance_user_id_month_start_pk" PRIMARY KEY("user_id","month_start")
);
--> statement-breakpoint
ALTER TABLE "flat-cove_credit_balance" ADD CONSTRAINT "flat-cove_credit_balance_user_id_flat-cove_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."flat-cove_user"("id") ON DELETE cascade ON UPDATE no action;