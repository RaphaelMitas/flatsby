export const shoppingList = {
  createFailed: "Failed to create shopping list",
  createShoppingList: "Create Shopping List",
  editItem: "Edit Item",
  emptyList: "No items in this shopping list yet. Add your first item below!",
  itemsLeft: "{count, plural, one {# item left} other {# items left}}",
  listNameLabel: "List Name",
  loadingMoreItems: "Loading more items...",
  namePlaceholder: "Enter shopping list name",
  noListsYet: "No shopping lists yet",
  noMoreItems: "No more items to load",
  purchasedItems: "Purchased Items",
  renameFailed: "Error renaming shopping list",
  renamePlaceholder: "Enter new name",
  selectGroupToView: "Select a group to view its shopping list",
  sidebarTitle: "Shopping Lists",
  yourShoppingList: "Your Shopping List",
  switcher: {
    title: "Lists",
    listCount: "{count, plural, one {# list} other {# lists}}",
    newList: "New list",
    moreFor: "More for {name}",
    editTitle: "Edit list",
  },
  firstList: {
    title: "Start your first list",
    body: "Everyone in {group} sees it and can add to it.",
    presets: {
      groceries: "Groceries",
      drugstore: "Drugstore",
      hardware: "Hardware",
    },
  },
  create: {
    createList: "Create List",
    failed: "unknown error during creation of shopping list",
    namePlaceholder: "Enter your shopping list name",
    submit: "Create",
  },
  delete: {
    confirmationLabel:
      "To confirm deletion, please type the shopping list name: {name}",
    description:
      'Are you sure you want to delete "{name}"? This action cannot be undone and will permanently remove all items in this list.',
    descriptionShort:
      'Are you sure you want to delete "{name}"? This action cannot be undone.',
    failed: "Error deleting list",
    title: "Delete Shopping List",
  },
  filter: {
    all: "All",
    allItems: "All Items",
  },
  item: {
    add: "Add",
    addedBy: "Added by {name} · {date}",
    addItem: "Add Item",
    addPlaceholder: "Add new item...",
    cancelLowercase: "cancel",
    deleteDescription: 'Are you sure you want to delete "{name}"?',
    deleteTitle: "Delete Item",
    doneBy: "Done by {name} · {date}",
    inputPlaceholder: "add new item",
    unknownMember: "unknown",
    update: "Update",
  },
  sections: {
    last7Days: "Last 7 Days",
    older: "Older",
    today: "Today",
  },
  validation: {
    descriptionRequired: "Shopping list description cannot be empty",
    descriptionTooLong:
      "Shopping list description cannot be longer than 256 characters",
    iconInvalid: "Shopping list icon is invalid",
    iconRequired: "Shopping list icon cannot be empty",
    itemNameRequired: "Shopping list item name cannot be empty",
    itemNameTooLong:
      "Shopping list item name cannot be longer than 64 characters",
    nameRequired: "Shopping list name is required",
    nameTooLong: "Shopping list name cannot be longer than 32 characters",
  },
};
