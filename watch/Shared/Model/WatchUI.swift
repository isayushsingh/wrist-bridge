import Foundation

// WatchUI v1 — Swift mirror of proxy/lib/watchui.ts and schema/watchui.v1.schema.json.
// Keep the three in sync when you add a component (see docs/09-extending.md).
//
// Design rule: decoding NEVER fails because of one bad or unknown node.
// Unknown types decode to `.unsupported`, so an older watch app keeps working
// when the proxy starts sending a newer component (forward compatibility).

struct WatchDocument: Decodable, Sendable {
    let schemaVersion: String
    let screen: ScreenMeta
    let ttl: Int?
    let body: [Node]
}

struct ScreenMeta: Decodable, Sendable {
    let id: String
    let title: String
    let tint: String?
}

// MARK: - Nodes

enum Node: Decodable, Sendable {
    case text(TextNode)
    case section(SectionNode)
    case stack(StackNode)
    case row(RowNode)
    case metric(MetricNode)
    case gauge(GaugeNode)
    case chart(ChartNode)
    case image(ImageNode)
    case button(ButtonNode)
    case toggle(ToggleNode)
    case divider
    case unsupported(String)

    private enum CodingKeys: String, CodingKey { case type }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = (try? container.decode(String.self, forKey: .type)) ?? "?"
        do {
            switch type {
            case "text": self = .text(try TextNode(from: decoder))
            case "section": self = .section(try SectionNode(from: decoder))
            case "stack": self = .stack(try StackNode(from: decoder))
            case "row": self = .row(try RowNode(from: decoder))
            case "metric": self = .metric(try MetricNode(from: decoder))
            case "gauge": self = .gauge(try GaugeNode(from: decoder))
            case "chart": self = .chart(try ChartNode(from: decoder))
            case "image": self = .image(try ImageNode(from: decoder))
            case "button": self = .button(try ButtonNode(from: decoder))
            case "toggle": self = .toggle(try ToggleNode(from: decoder))
            case "divider": self = .divider
            default: self = .unsupported(type)
            }
        } catch {
            self = .unsupported("\(type) (invalid)")
        }
    }
}

// Style tokens are kept as plain Strings and mapped at render time,
// so an unknown token (e.g. a future "largeTitle") falls back instead of failing.

struct TextNode: Decodable, Sendable {
    let text: String
    let style: String?
    let color: String?
    let align: String?
    let lines: Int?
}

struct SectionNode: Decodable, Sendable {
    let title: String?
    let footer: String?
    let children: [Node]
}

struct StackNode: Decodable, Sendable {
    let axis: String?
    let spacing: Double?
    let children: [Node]
}

struct RowNode: Decodable, Sendable {
    let title: String
    let subtitle: String?
    let icon: String?
    let value: String?
    let tint: String?
    let action: Action?
}

struct MetricNode: Decodable, Sendable {
    let label: String
    let value: String
    let unit: String?
    let trend: String?
    let tint: String?
}

struct GaugeNode: Decodable, Sendable {
    let label: String
    let value: Double
    let min: Double?
    let max: Double?
    let valueLabel: String?
    let tint: String?
}

struct ChartPoint: Decodable, Sendable {
    let x: String
    let y: Double
}

struct ChartNode: Decodable, Sendable {
    let kind: String?
    let title: String?
    let height: Double?
    let tint: String?
    let points: [ChartPoint]
}

struct ImageNode: Decodable, Sendable {
    let url: URL
    let alt: String?
    let height: Double?
}

struct ButtonNode: Decodable, Sendable {
    let label: String
    let icon: String?
    let role: String?
    let tint: String?
    let action: Action
}

struct ToggleNode: Decodable, Sendable {
    let label: String
    let isOn: Bool
    let action: Action
}

// MARK: - Actions

enum Action: Decodable, Hashable, Sendable {
    /// Push another screen of the same app.
    case navigate(screen: String, params: [String: String])
    /// Ask the proxy to run a named action from watch.json.
    case call(id: String, payload: JSONValue?, confirm: String?, then: String?)
    /// Reload the current screen.
    case refresh
    case unsupported(String)

    private enum CodingKeys: String, CodingKey {
        case type, screen, params, id, payload, confirm, then
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let type = try c.decode(String.self, forKey: .type)
        switch type {
        case "navigate":
            self = .navigate(
                screen: try c.decode(String.self, forKey: .screen),
                params: try c.decodeIfPresent([String: String].self, forKey: .params) ?? [:]
            )
        case "call":
            self = .call(
                id: try c.decode(String.self, forKey: .id),
                payload: try c.decodeIfPresent(JSONValue.self, forKey: .payload),
                confirm: try c.decodeIfPresent(String.self, forKey: .confirm),
                then: try c.decodeIfPresent(String.self, forKey: .then)
            )
        case "refresh":
            self = .refresh
        default:
            self = .unsupported(type)
        }
    }

    /// For toggles: the same call action with `payload.value` set to the new state.
    func withValue(_ value: Bool) -> Action {
        guard case let .call(id, payload, confirm, then) = self else { return self }
        let merged = (payload ?? .object([:])).setting("value", to: .bool(value))
        return .call(id: id, payload: merged, confirm: confirm, then: then)
    }
}

// MARK: - Other proxy responses

struct BridgeAppInfo: Decodable, Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let shortName: String?
    let themeColor: String?
    let icon: URL?
    let entry: String
}

struct AppsResponse: Decodable, Sendable {
    let apps: [BridgeAppInfo]
}

struct ActionResult: Decodable, Sendable {
    let ok: Bool
    let message: String?
    let then: String?
}

struct ComplicationGauge: Codable, Sendable {
    /// Always 0...1.
    let value: Double
    let label: String?
}

struct ComplicationPayload: Codable, Sendable {
    let text: String
    let shortText: String?
    let symbol: String?
    let tint: String?
    let gauge: ComplicationGauge?
    let ttl: Int?

    static let placeholder = ComplicationPayload(
        text: "3 open · 40% done",
        shortText: "3",
        symbol: "checklist",
        tint: nil,
        gauge: ComplicationGauge(value: 0.4, label: "Done"),
        ttl: 900
    )
}

struct ErrorEnvelope: Decodable {
    struct Body: Decodable {
        let code: String?
        let message: String
    }
    let error: Body
}
