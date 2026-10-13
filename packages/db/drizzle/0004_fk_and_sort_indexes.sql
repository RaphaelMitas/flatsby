CREATE INDEX "conversations_user_updated_idx" ON "flat-cove_conversations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "expense_splits_expense_idx" ON "flat-cove_expense_splits" USING btree ("expenseId");--> statement-breakpoint
CREATE INDEX "expenses_group_date_idx" ON "flat-cove_expenses" USING btree ("groupId","expenseDate","id");--> statement-breakpoint
CREATE INDEX "expenses_group_created_idx" ON "flat-cove_expenses" USING btree ("groupId","createdAt");--> statement-breakpoint
CREATE INDEX "group_members_group_user_idx" ON "flat-cove_group_members" USING btree ("groupId","userId");--> statement-breakpoint
CREATE INDEX "group_members_user_idx" ON "flat-cove_group_members" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "shopping_list_item_list_idx" ON "flat-cove_shopping_list_item" USING btree ("shoppingListId","completedAt","createdAt");--> statement-breakpoint
CREATE INDEX "shopping_lists_group_idx" ON "flat-cove_shopping_lists" USING btree ("groupId");