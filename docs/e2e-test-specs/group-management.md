# Group Management

## Goal
Verify the complete lifecycle of a group from creation through member management to deletion.

## Test Cases
1. **Create Group**: Verify that an authenticated user can create a group with a name and becomes the group's only admin.
2. **Group Appears in Dashboard**: Verify that the newly created group appears in the user's groups dashboard with the correct name and member count.
3. **Join Through an Invite**: Verify that an admin's invite code or link lets another user preview the group and join it as a member after tapping Join.
4. **Member Sees Group**: Verify that the new member can see the group in their groups dashboard after joining.
5. **Promote Member to Admin**: Verify that an admin can change a member's role to admin and the member gains admin privileges.
6. **Demote Admin to Member**: Verify that an admin can demote another admin to a regular member, removing their admin privileges.
7. **Prevent Removing Last Admin**: Verify that the system prevents demoting or removing the last admin of a group.
8. **Remove Member**: Verify that an admin can remove a member from the group and the member can no longer access the group.
9. **Member Self-Remove**: Verify that a regular member can leave the group themselves.
10. **Removed Member Can't Rejoin**: Verify that removing a member, or resetting the link, kills the old code so it shows as expired.
11. **Change Group Name**: Verify that an admin can update the group name and it reflects for all members.
12. **Non-Admin Cannot Change Group Name**: Verify that a regular member cannot change the group name.
13. **Non-Admin Cannot Invite**: Verify that a regular member sees no invite button and cannot fetch or reset the group's invite.
14. **Non-Admin Cannot Remove Other Members**: Verify that a regular member cannot remove other members from the group.
15. **Delete Group**: Verify that an admin can delete the group and all associated data (shopping lists, items, conversations) is removed.
16. **Deleted Group Inaccessible**: Verify that after group deletion, no former members can access the group and it disappears from all dashboards.
17. **Delete Group Clears User References**: Verify that deleting a group nulls out `lastGroupUsed` and `lastShoppingListUsed` references on affected users.
18. **Switch Groups**: Verify that picking another group in the home's group switcher makes it the current group.
