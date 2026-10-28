import AppIntents
import Foundation
import Security

struct ShoppingListTarget {
  let groupId: Int
  let groupName: String
  let listId: Int
  let listName: String
}

enum FlatsbyAPIError: Error, CustomLocalizedStringResourceConvertible {
  case signedOut
  case noList
  case failed
  case unconfirmed

  var localizedStringResource: LocalizedStringResource {
    switch self {
    case .signedOut: "Open Flatsby to sign in."
    case .noList: "Open a shopping list in Flatsby first."
    case .failed: "Flatsby couldn't add that. Try again in the app."
    case .unconfirmed: "Flatsby didn't confirm that. Check the list before you try again."
    }
  }
}

enum FlatsbyAPI {
  static let baseUrlKey = "FlatsbySiri.apiBaseUrl"

  static func lastUsedList() async throws -> ShoppingListTarget {
    let current: CurrentUser = try await call("user.getCurrentUserWithGroups")
    guard
      let list = current.user?.lastShoppingListUsed,
      let group = current.groups.first(where: { $0.id == list.groupId })
    else { throw FlatsbyAPIError.noList }
    return ShoppingListTarget(groupId: group.id, groupName: group.name, listId: list.id, listName: list.name)
  }

  static func addItem(_ name: String, to list: ShoppingListTarget) async throws {
    let input = CreateItemInput(groupId: list.groupId, shoppingListId: list.listId, name: name)
    let _: Int = try await call("shoppingList.createShoppingListItem", body: JSONEncoder().encode(TRPCInput(json: input)))
  }

  private static func call<Output: Decodable>(_ procedure: String, body: Data? = nil) async throws -> Output {
    // Unset until the app's JS has run once on this build
    let base = UserDefaults.standard.string(forKey: baseUrlKey) ?? "https://www.flatsby.com"
    guard let url = URL(string: "\(base)/api/trpc/\(procedure)"), let cookie = sessionCookie() else {
      throw FlatsbyAPIError.signedOut
    }

    var request = URLRequest(url: url)
    request.setValue(cookie, forHTTPHeaderField: "Cookie")
    request.setValue("expo-siri", forHTTPHeaderField: "x-trpc-source")
    request.setValue(Locale.preferredLanguages.joined(separator: ","), forHTTPHeaderField: "Accept-Language")
    if let body {
      request.httpMethod = "POST"
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = body
    }
    // iOS would add its own stored cookies next to the session cookie
    request.httpShouldHandleCookies = false

    let result: ApiResult<Output>
    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      if (response as? HTTPURLResponse)?.statusCode == 401 { throw FlatsbyAPIError.signedOut }
      result = try JSONDecoder().decode(TRPCResponse<ApiResult<Output>>.self, from: data).result.data.json
    } catch let error as FlatsbyAPIError {
      throw error
    } catch {
      // A write whose answer got lost may still have landed on the server
      throw body == nil ? FlatsbyAPIError.failed : FlatsbyAPIError.unconfirmed
    }
    guard result.success, let output = result.data else { throw FlatsbyAPIError.failed }
    return output
  }

  // expo-secure-store's service names ("app" is its legacy alias); the account is better-auth's `${storagePrefix}_cookie`
  private static func sessionCookie() -> String? {
    let jar = ["app:no-auth", "app"].lazy.compactMap(keychainItem).first
    guard let jar, let cookies = try? JSONDecoder().decode([String: StoredCookie].self, from: jar) else { return nil }
    let header = cookies
      .filter { !$0.value.isExpired }
      .map { "\($0.key)=\($0.value.value)" }
      .joined(separator: "; ")
    return header.isEmpty ? nil : header
  }

  private static func keychainItem(service: String) -> Data? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: Data("flatsby_cookie".utf8),
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var item: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess else { return nil }
    return item as? Data
  }
}

private struct StoredCookie: Decodable {
  let value: String
  let expires: String?

  var isExpired: Bool {
    guard let expires, let date = try? Date(expires, strategy: Date.ISO8601FormatStyle(includingFractionalSeconds: true)) else {
      return false
    }
    return date < .now
  }
}

private struct TRPCInput<T: Encodable>: Encodable {
  let json: T
}

private struct CreateItemInput: Encodable {
  let groupId: Int
  let shoppingListId: Int
  let name: String
  let categoryId = "ai-auto-select"
}

private struct CurrentUser: Decodable {
  struct ListRef: Decodable {
    let id: Int
    let name: String
    let groupId: Int
  }
  struct User: Decodable {
    let lastShoppingListUsed: ListRef?
  }
  struct Group: Decodable {
    let id: Int
    let name: String
  }
  let user: User?
  let groups: [Group]
}

private struct TRPCResponse<T: Decodable>: Decodable {
  struct Result: Decodable {
    struct Payload: Decodable { let json: T }
    let data: Payload
  }
  let result: Result
}

private struct ApiResult<T: Decodable>: Decodable {
  let success: Bool
  let data: T?
}
