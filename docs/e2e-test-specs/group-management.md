# Group Management

## Goal
Verify the complete lifecycle of a group from creation through member management to deletion.

## Test Cases
1. **Create Group**: Verify that an authenticated user can create a group with a name and becomes the group's only admin.
2. **Group Appears in Dashboard**: Verify that the newly created group appears in the user's groups dashboard with the correct name and member count.
3. **Add Member by Email**: Verify that an admin can invite another user to the group by email and the invited user joins as a member.
4. **Member Sees Group**: Verify that the invited user can see the group in their groups dashboard after being added.
5. **Promote Member to Admin**: Verify that an admin can change a member's role to admin and the member gains admin privileges.
6. **Demote Admin to Member**: Verify that an admin can demote another admin to a regular member, removing their admin privileges.
7. **Prevent Removing Last Admin**: Verify that the system prevents demoting or removing the last admin of a group.
8. **Remove Member**: Verify that an admin can remove a member from the group and the member can no longer access the group.
9. **Member Self-Remove**: Verify that a regular member can leave the group themselves.
10. **Re-add Previously Removed Member**: Verify that re-adding a previously removed user reactivates their membership rather than creating a duplicate entry.
11. **Change Group Name**: Verify that an admin can update the group name and it reflects for all members.
12. **Non-Admin Cannot Change Group Name**: Verify that a regular member cannot change the group name.
13. **Non-Admin Cannot Add Members**: Verify that a regular member cannot add new members to the group.
14. **Non-Admin Cannot Remove Other Members**: Verify that a regular member cannot remove other members from the group.
15. **Delete Group**: Verify that an admin can delete the group and all associated data (shopping lists, items, conversations) is removed.
16. **Deleted Group Inaccessible**: Verify that after group deletion, no former members can access the group and it disappears from all dashboards.
17. **Delete Group Clears User References**: Verify that deleting a group nulls out `lastGroupUsed` and `lastShoppingListUsed` references on affected users.
