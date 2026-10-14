ALTER TABLE "flat-cove_expenses" ADD COLUMN "converted_amount_in_cents" integer;--> statement-breakpoint
ALTER TABLE "flat-cove_expenses" ADD COLUMN "converted_currency" varchar(3);--> statement-breakpoint
ALTER TABLE "flat-cove_groups" ADD COLUMN "currency" varchar(3) DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "flat-cove_groups" ADD COLUMN "convert_automatically" boolean;--> statement-breakpoint
-- Each group starts in the currency it already uses most
UPDATE "flat-cove_groups" AS g
SET "currency" = top."currency"
FROM (
  SELECT DISTINCT ON ("groupId") "groupId", "currency"
  FROM "flat-cove_expenses"
  GROUP BY "groupId", "currency"
  ORDER BY "groupId", count(*) DESC, "currency"
) AS top
WHERE g."id" = top."groupId";
