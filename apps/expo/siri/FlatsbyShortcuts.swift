import AppIntents

struct FlatsbyShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: AddShoppingListItemIntent(),
      phrases: [
        "Add to \(.applicationName)",
        "\(.applicationName) shopping",
        "Add something to \(.applicationName)",
        "Add to my \(.applicationName) list",
        "New item in \(.applicationName)",
      ],
      shortTitle: "Add to Shopping List",
      systemImageName: "cart.badge.plus"
    )
  }

  static let shortcutTileColor: ShortcutTileColor = .navy
}
