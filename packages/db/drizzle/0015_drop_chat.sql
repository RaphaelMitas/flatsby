DROP TABLE "flat-cove_chat_messages" CASCADE;--> statement-breakpoint
DROP TABLE "flat-cove_conversations" CASCADE;--> statement-breakpoint
ALTER TABLE "flat-cove_user" DROP COLUMN "last_chat_model_used";--> statement-breakpoint
ALTER TABLE "flat-cove_user" DROP COLUMN "last_tools_enabled";--> statement-breakpoint
ALTER TABLE "flat-cove_user" DROP COLUMN "ai_consent_accepted_at";--> statement-breakpoint
ALTER TABLE "flat-cove_user" DROP COLUMN "ai_consent_version";