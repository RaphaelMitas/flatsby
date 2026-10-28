internal import ExpoModulesCore

class FlatsbySiriModule: Module {
  func definition() -> ModuleDefinition {
    Name("FlatsbySiri")

    Function("setApiBaseUrl") { (url: String) in
      UserDefaults.standard.set(url, forKey: FlatsbyAPI.baseUrlKey)
    }
  }
}
