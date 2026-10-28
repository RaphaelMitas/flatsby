CREATE TABLE "flat-cove_user_payment_details" (
	"user_id" text PRIMARY KEY NOT NULL,
	"account_holder" varchar(70),
	"iban" varchar(34),
	"paypal_handle" varchar(20),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flat-cove_user_payment_details" ADD CONSTRAINT "flat-cove_user_payment_details_user_id_flat-cove_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."flat-cove_user"("id") ON DELETE no action ON UPDATE no action;