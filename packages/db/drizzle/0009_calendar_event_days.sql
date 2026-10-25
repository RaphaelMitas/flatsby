ALTER TABLE "flat-cove_calendar_item" ADD COLUMN "days" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "flat-cove_calendar_item" ADD COLUMN "time_zone" varchar(64) DEFAULT 'Europe/Berlin' NOT NULL;--> statement-breakpoint
UPDATE "flat-cove_calendar_item" SET "days" = 2 WHERE "end_time" <= "start_time" AND "end_time" <> '00:00';
