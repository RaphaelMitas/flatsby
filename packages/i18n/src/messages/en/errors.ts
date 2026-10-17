export const errors = {
  aiConsentRequired:
    "Please accept AI data sharing before using the assistant.",
  notFound: {
    invite: "This invite has expired. Ask someone in the group for a new one.",
    adminMembership: "admin membership not found",
    calendarItem: "calendar entry not found",
    expense: "expense not found",
    group: "group not found",
    groupMember: "group member not found",
    groupMembership: "group membership not found",
    shoppingList: "shopping list not found",
    shoppingListItem: "shopping list item not found",
    user: "user not found",
  },
  empty: {
    groupName: "Group name: cannot be empty",
    shoppingListItemName: "Shopping list item name: cannot be empty",
    shoppingListName: "Shopping list name: cannot be empty",
  },
  mustBeGroupMember: "You must be a member of this group",
  notGroupMember: "You are not a member of this group",
  mustBeAdmin: "You must be an admin to perform this action",
  adminRequiredToChangeRoles:
    "You need admin privileges to change member roles",
  adminRequiredToAddMembers:
    "You need admin privileges to add members to this group",
  onlyAdminsRemoveMembers:
    "Only group admins can remove other members. You can only remove yourself.",
  calendarDateNotScheduled: "That date is no longer on the schedule",
  calendarSeriesReplaced:
    "A newer repeat already took over from that date. Edit that one instead.",
  cannotRemoveLastAdmin: "Cannot remove the last admin from the group",
  promoteAdminFirst:
    "Cannot remove the last admin. Promote another member to admin first.",
  noExpenseAccess: "You don't have access to this expense",
  noShoppingListAccess: "You don't have access to this shopping list",
  unauthorized: "You must be logged in to access this resource",
  invalidInviteCode: "That isn't a valid invite code",
  alreadyMember: "This user is already a member of the group",
  alreadyExists: "This item already exists",
  invalidReference: "Invalid reference to related data",
  fieldRequired: "{field} is required",
  invalidName: "Please enter a valid name",
  databaseFailed: "Database operation failed: {operation}",
  serviceUnavailable: "External service ({service}) is currently unavailable",
  unexpected: "An unexpected error occurred. Please try again later.",
  updateRoleFailed: "Unable to update member role at this time",
  removeMemberFailed:
    "Unable to remove group member at this time. Please try again.",
  updateNameFailed:
    "Unable to update your name at this time. Please try again.",
  updateConsentFailed:
    "Unable to update consent at this time. Please try again.",
  updateAiConsentFailed:
    "Unable to update AI consent at this time. Please try again.",
  exportDataFailed:
    "Unable to export your data at this time. Please try again.",
  conversationNotFound: "Conversation not found",
  createConversationFailed: "Failed to create conversation",
  createAssistantMessageFailed: "Failed to create assistant message",
  messageNotFound: "Message not found",
  messageNotInConversation: "Message not found in this conversation",
  notAuthorized: "Not authorized",
  outOfCredits:
    "You've run out of credits. Please upgrade your plan to continue.",
  creditCheckFailed: "Error checking credits",
  streamFailed: "Failed to stream response",
  groupAccessDenied: "Group not found or access denied",
  groupNotFound: "Group not found",
  shoppingListNotFound: "Shopping list not found",
  itemNotFound: "Item not found",
  expenseNotFound: "Expense not found",
  adminAccessRequired: "Admin access required for this operation",
};
