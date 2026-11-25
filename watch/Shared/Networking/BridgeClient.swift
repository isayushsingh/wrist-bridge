import Foundation

/// A value plus whether it came from the offline cache.
struct Loaded<Value: Sendable>: Sendable {
    let value: Value
    let isStale: Bool
}

enum BridgeClientError: LocalizedError {
    case http(status: Int, message: String?)
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case let .http(status, message):
            if let message { return message }
            switch status {
            case 401: return "Wrong bridge key. Check BRIDGE_API_KEY."
            case 404: return "Not found on the proxy."
            default: return "Proxy error (\(status))."
            }
        case .invalidResponse:
            return "Unexpected response from the proxy."
        }
    }
}

/// Talks to the WristBridge proxy. The ONLY place in the app that does networking.
///
///   GET  /api/v1/apps
///   GET  /api/v1/apps/:app/screens/:screen?params
///   POST /api/v1/apps/:app/actions/:action      { payload, params }
///   GET  /api/v1/apps/:app/complication
final class BridgeClient: Sendable {
    static let shared = BridgeClient()

    private let baseURL: URL
    private let apiKey: String
    private let session: URLSession
    private let cache: ResponseCache

    init(
        baseURL: URL = AppConfig.baseURL,
        apiKey: String = AppConfig.apiKey,
        session: URLSession = .shared,
        cache: ResponseCache = .shared
    ) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        self.session = session
        self.cache = cache
    }

    // MARK: - Endpoints

    func apps() async throws -> Loaded<[BridgeAppInfo]> {
        let loaded: Loaded<AppsResponse> = try await get(["api", "v1", "apps"])
        return Loaded(value: loaded.value.apps, isStale: loaded.isStale)
    }

    func screen(app: String, screen: String, params: [String: String]) async throws -> Loaded<WatchDocument> {
        try await get(["api", "v1", "apps", app, "screens", screen], query: params)
    }

    func complication(app: String) async throws -> Loaded<ComplicationPayload> {
        try await get(["api", "v1", "apps", app, "complication"])
    }

    func perform(app: String, action: String, payload: JSONValue?, params: [String: String]) async throws -> ActionResult {
        struct Body: Encodable {
            let payload: JSONValue?
            let params: [String: String]
        }
        var request = URLRequest(url: makeURL(["api", "v1", "apps", app, "actions", action]), timeoutInterval: 15)
        request.httpMethod = "POST"
        request.httpBody = try JSONEncoder().encode(Body(payload: payload, params: params))
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        applyHeaders(to: &request)

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw BridgeClientError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            throw BridgeClientError.http(status: http.statusCode, message: Self.errorMessage(in: data))
        }
        return try JSONDecoder().decode(ActionResult.self, from: data)
    }

    // MARK: - Plumbing

    /// GET with ETag revalidation and offline fallback.
    private func get<T: Decodable & Sendable>(_ path: [String], query: [String: String] = [:]) async throws -> Loaded<T> {
        let url = makeURL(path, query: query)
        let key = url.absoluteString
        let cached = cache.read(key: key)

        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        applyHeaders(to: &request)
        if let etag = cached?.etag {
            request.setValue(etag, forHTTPHeaderField: "If-None-Match")
        }

        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw BridgeClientError.invalidResponse }

            if http.statusCode == 304, let cached {
                return Loaded(value: try JSONDecoder().decode(T.self, from: cached.data), isStale: false)
            }
            guard (200..<300).contains(http.statusCode) else {
                throw BridgeClientError.http(status: http.statusCode, message: Self.errorMessage(in: data))
            }
            let value = try JSONDecoder().decode(T.self, from: data)
            cache.write(key: key, data: data, etag: http.value(forHTTPHeaderField: "ETag"))
            return Loaded(value: value, isStale: false)
        } catch let error as URLError {
            // Offline / timeout: fall back to the last good copy if we have one.
            if let cached, let value = try? JSONDecoder().decode(T.self, from: cached.data) {
                return Loaded(value: value, isStale: true)
            }
            throw error
        }
    }

    private func makeURL(_ path: [String], query: [String: String] = [:]) -> URL {
        var url = baseURL
        for component in path {
            url.appendPathComponent(component)
        }
        guard !query.isEmpty, var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return url
        }
        // Sorted so the same params always produce the same cache key.
        components.queryItems = query.keys.sorted().map { URLQueryItem(name: $0, value: query[$0]) }
        return components.url ?? url
    }

    private func applyHeaders(to request: inout URLRequest) {
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if !apiKey.isEmpty {
            request.setValue(apiKey, forHTTPHeaderField: "x-bridge-key")
        }
    }

    private static func errorMessage(in data: Data) -> String? {
        (try? JSONDecoder().decode(ErrorEnvelope.self, from: data))?.error.message
    }
}
