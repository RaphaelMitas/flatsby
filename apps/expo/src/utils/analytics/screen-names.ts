const names: Record<string, string> = {
  home: "Home",
  "home/create-group": "Create Group",
  "settings/group-settings": "Group Settings",
  "settings/group-settings/members": "Group Members",
  "settings/group-settings/member-actions": "Member Actions",
  "settings/group-settings/group-details": "Group Details",
  "home/shopping-lists": "Shopping Lists",
  "home/shopping-lists/create": "Create Shopping List",
  shoppingList: "Shopping List",
  "shoppingList/edit-item": "Edit Shopping Item",
  expenses: "Expenses",
  "expenses/create": "Create Expense",
  "expenses/debts": "Debts",
  "expenses/settle": "Settle Debts",
  calendar: "Calendar",
  "calendar/[itemId]": "Calendar Item",
  "calendar/form": "Calendar Item Form",
  settings: "Settings",
  "settings/account": "Account Settings",
  "settings/profile": "Profile",
  "settings/manage-groups": "Manage Groups",
  "settings/danger": "Danger Zone",
  "auth/login": "Login",
};

export function getScreenName(segments: string[]): string {
  const filtered = segments.filter((s) => !s.startsWith("("));
  const key = filtered.join("/");

  if (key.includes("[expenseId]")) {
    if (key.endsWith("/edit")) return "Edit Expense";
    return "Expense Detail";
  }
  return names[key] ?? filtered.join(" > ");
}
