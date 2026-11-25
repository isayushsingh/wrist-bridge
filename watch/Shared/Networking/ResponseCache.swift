import CryptoKit
import Foundation

/// Tiny disk cache: last good response per URL, plus its ETag.
///
/// Why: watches lose connectivity constantly. With this, a screen opened before
/// still shows (marked "offline") instead of an error, and unchanged screens
/// cost one tiny 304 response instead of a full download.
final class ResponseCache: @unchecked Sendable {
    static let shared = ResponseCache()

    struct Entry: Codable {
        let etag: String?
        let data: Data
        let savedAt: Date
    }

    private let directory: URL
    private let queue = DispatchQueue(label: "wristbridge.response-cache")
    /// Keep the cache small; watch storage is precious.
    private let maxEntries = 60

    init(folder: String = "WristBridgeCache") {
        let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        directory = base.appendingPathComponent(folder, isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    func read(key: String) -> Entry? {
        queue.sync {
            guard let data = try? Data(contentsOf: fileURL(for: key)) else { return nil }
            return try? JSONDecoder().decode(Entry.self, from: data)
        }
    }

    func write(key: String, data: Data, etag: String?) {
        let entry = Entry(etag: etag, data: data, savedAt: Date())
        let url = fileURL(for: key)
        queue.async { [directory, maxEntries] in
            guard let encoded = try? JSONEncoder().encode(entry) else { return }
            try? encoded.write(to: url, options: .atomic)
            Self.prune(directory: directory, keep: maxEntries)
        }
    }

    func removeAll() {
        queue.sync {
            let files = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
            files.forEach { try? FileManager.default.removeItem(at: $0) }
        }
    }

    private func fileURL(for key: String) -> URL {
        let digest = SHA256.hash(data: Data(key.utf8))
        let name = digest.map { String(format: "%02x", $0) }.joined()
        return directory.appendingPathComponent(name)
    }

    /// Delete the oldest files beyond `keep`.
    private static func prune(directory: URL, keep: Int) {
        let fm = FileManager.default
        guard let files = try? fm.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: [.contentModificationDateKey]
        ), files.count > keep else { return }
        let dated = files.map { url -> (URL, Date) in
            let date = (try? url.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
            return (url, date)
        }
        for (url, _) in dated.sorted(by: { $0.1 < $1.1 }).prefix(files.count - keep) {
            try? fm.removeItem(at: url)
        }
    }
}
