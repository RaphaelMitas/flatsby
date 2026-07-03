# Account Management

## Goal
Verify user account deletion including proper cleanup of all associated data across the entire application.

## Test Cases
1. **Access Account Deletion Settings**: Verify that an authenticated user can navigate to the account deletion settings page.
2. **Two-Step Email Confirmation**: Verify that the user must type their email address to enable the delete button, preventing accidental deletion.
3. **Delete Account with No Data**: Verify that deleting an account with no groups, expenses, or shopping lists removes the user cleanly.
4. **Delete Account with Single Group (Sole Member)**: Verify that deleting an account where the user is the sole member of a group also deletes that group and all its associated data (shopping lists, items, expenses).
5. **Delete Account with Multiple Groups as Non-Admin**: Verify that deleting an account removes the user from all groups where they are a regular member, leaving the groups intact for remaining members.
6. **Delete Account as Last Admin with Other Members**: Verify that deleting an account where the user is the last admin promotes the earliest-joining member to admin before removing the user.
7. **Delete Account as Admin with Other Admins**: Verify that deleting an account where other admins exist simply removes the user from the group without role transfers.
8. **Shopping List Items Creator Reference Cleared**: Verify that after account deletion, shopping list items previously created or completed by the deleted user have their `createdByGroupMemberId` and `completedByGroupMemberId` references nulled out.
9. **Sessions Deleted**: Verify that all active sessions for the deleted user are destroyed and any existing session cookies become invalid.
10. **OAuth Accounts Deleted**: Verify that all linked OAuth provider accounts are removed for the deleted user.
11. **Verification Tokens Deleted**: Verify that all verification tokens associated with the deleted user's email are cleaned up.
12. **User Record Deleted**: Verify that the user row is completely removed from the users table after account deletion.
13. **Sign Out and Redirect After Deletion**: Verify that after successful account deletion, the user is signed out and redirected away from the app.
14. **Conversations and Chat Messages Cascade Deleted**: Verify that conversations and chat messages belonging to the deleted user are cascade-deleted by the database.
15. **Delete Account with Large Dataset**: Verify that account deletion completes successfully and cleans up all data even when the user has many groups, expenses, shopping lists, and items.
