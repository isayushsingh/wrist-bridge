import Foundation

/// Values injected at build time: Config/*.xcconfig -> Info.plist -> here.
enum AppConfig {
    private static func string(_ key: String) -> String {
        let raw = Bundle.main.object(forInfoDictionaryKey: key) as? String ?? ""
        return raw.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static var baseURL: URL {
        URL(string: string("BRIDGE_BASE_URL")) ?? URL(string: "http://localhost:3000")!
    }

    static var apiKey: String { string("BRIDGE_API_KEY") }

    static var complicationAppID: String {
        let id = string("BRIDGE_COMPLICATION_APP")
        return id.isEmpty ? "demo" : id
    }
}
