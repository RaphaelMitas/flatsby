import AppIntents
import SwiftUI

struct AddShoppingListItemIntent: AppIntent {
  static let title: LocalizedStringResource = "Add to Shopping List"
  static let description = IntentDescription("Adds an item to the shopping list you last used in Flatsby.")
  // The session cookie is only readable while the phone is unlocked
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication

  @Parameter(title: "Item", requestValueDialog: "What should go on the list?")
  var item: String

  func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
    let name = item.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !name.isEmpty else { throw $item.needsValueError() }

    let list = try await FlatsbyAPI.lastUsedList()
    try await FlatsbyAPI.addItem(name, to: list)

    return .result(
      dialog: "\(name) is now on \(list.listName).",
      view: AddedItemSnippet(item: name, list: list)
    )
  }
}

private struct AddedItemSnippet: View {
  let item: String
  let list: ShoppingListTarget

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .firstTextBaseline) {
        Text(list.listName).font(.headline).lineLimit(1).layoutPriority(1)
        Spacer()
        Text(list.groupName).font(.footnote).foregroundStyle(.secondary).lineLimit(1)
      }
      Divider()
      HStack(spacing: 10) {
        Image(systemName: "circle").foregroundStyle(.secondary)
        Text(item).fontWeight(.semibold)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding()
  }
}
