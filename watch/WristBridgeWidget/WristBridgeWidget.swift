import SwiftUI
import WidgetKit

// Watch-face complications. They fetch /api/v1/apps/:app/complication directly
// (no App Group needed, so this works with a free Apple developer account).

struct ComplicationEntry: TimelineEntry {
    let date: Date
    let payload: ComplicationPayload?
    let isStale: Bool
}

struct ComplicationProvider: TimelineProvider {
    func placeholder(in context: Context) -> ComplicationEntry {
        ComplicationEntry(date: .now, payload: .placeholder, isStale: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (ComplicationEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
            return
        }
        Task { completion(await fetch()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ComplicationEntry>) -> Void) {
        Task {
            let entry = await fetch()
            // watchOS budgets widget reloads; never ask for more than every 5 minutes.
            let seconds = Double(max(entry.payload?.ttl ?? 900, 300))
            completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(seconds))))
        }
    }

    private func fetch() async -> ComplicationEntry {
        do {
            let result = try await BridgeClient.shared.complication(app: AppConfig.complicationAppID)
            return ComplicationEntry(date: .now, payload: result.value, isStale: result.isStale)
        } catch {
            return ComplicationEntry(date: .now, payload: nil, isStale: true)
        }
    }
}

struct ComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ComplicationEntry

    private var payload: ComplicationPayload? { entry.payload }
    private var symbol: String { payload?.symbol ?? "applewatch" }

    var body: some View {
        switch family {
        case .accessoryCircular:
            if let gauge = payload?.gauge {
                Gauge(value: gauge.value) {
                    Image(systemName: symbol)
                } currentValueLabel: {
                    Text(payload?.shortText ?? "")
                }
                .gaugeStyle(.accessoryCircular)
            } else {
                ZStack {
                    AccessoryWidgetBackground()
                    Text(payload?.shortText ?? "–").font(.headline)
                }
            }
        case .accessoryInline:
            Label(payload?.text ?? "WristBridge", systemImage: symbol)
        case .accessoryCorner:
            Image(systemName: symbol)
                .font(.title3)
                .widgetLabel {
                    Text(payload?.text ?? "WristBridge")
                }
        default:
            VStack(alignment: .leading, spacing: 2) {
                Label(payload?.text ?? "No data", systemImage: symbol)
                    .font(.headline)
                    .lineLimit(2)
                if let gauge = payload?.gauge {
                    Gauge(value: gauge.value) {
                        Text(gauge.label ?? "")
                    }
                    .gaugeStyle(.accessoryLinearCapacity)
                }
                if entry.isStale {
                    Text("Offline").font(.caption2).foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct WristBridgeComplication: Widget {
    let kind = "WristBridgeComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ComplicationProvider()) { entry in
            ComplicationView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("WristBridge")
        .description("A glance at your PWA.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
    }
}

@main
struct WristBridgeWidgetBundle: WidgetBundle {
    var body: some Widget {
        WristBridgeComplication()
    }
}
