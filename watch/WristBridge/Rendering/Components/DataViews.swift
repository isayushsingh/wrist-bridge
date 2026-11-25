import Charts
import SwiftUI

struct MetricNodeView: View {
    let node: MetricNode

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(node.label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(node.value)
                    .font(.title3.weight(.bold))
                    .fontDesign(.rounded)
                    .monospacedDigit()
                    .foregroundStyle(Color(hex: node.tint) ?? .primary)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                if let unit = node.unit {
                    Text(unit).font(.caption2).foregroundStyle(.secondary)
                }
                if let trend = node.trend {
                    Image(systemName: trendSymbol(trend))
                        .font(.caption2)
                        .foregroundStyle(trendColor(trend))
                }
            }
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.quaternary.opacity(0.6), in: RoundedRectangle(cornerRadius: 12))
    }

    private func trendSymbol(_ trend: String) -> String {
        switch trend {
        case "up": return "arrow.up.right"
        case "down": return "arrow.down.right"
        default: return "arrow.right"
        }
    }

    private func trendColor(_ trend: String) -> Color {
        switch trend {
        case "up": return .green
        case "down": return .red
        default: return .secondary
        }
    }
}

struct GaugeNodeView: View {
    let node: GaugeNode

    var body: some View {
        let lower = node.min ?? 0
        let upper = Swift.max(node.max ?? 1, lower + 0.000_001)
        let clamped = Swift.min(Swift.max(node.value, lower), upper)

        ProgressView(value: clamped - lower, total: upper - lower) {
            HStack {
                Text(node.label).font(.caption)
                Spacer()
                if let valueLabel = node.valueLabel {
                    Text(valueLabel).font(.caption).monospacedDigit()
                }
            }
        }
        .tint(Color(hex: node.tint) ?? .accentColor)
        .padding(.vertical, 2)
    }
}

struct ChartNodeView: View {
    let node: ChartNode

    var body: some View {
        let tint = Color(hex: node.tint) ?? .accentColor
        VStack(alignment: .leading, spacing: 4) {
            if let title = node.title {
                Text(title).font(.caption2).foregroundStyle(.secondary)
            }
            chart(tint: tint)
                .chartYAxis(.hidden)
                .frame(height: CGFloat(node.height ?? 60))
        }
        .padding(.vertical, 2)
    }

    @ViewBuilder
    private func chart(tint: Color) -> some View {
        let points = Array(node.points.enumerated())
        if node.kind == "line" {
            Chart(points, id: \.offset) { _, point in
                LineMark(x: .value("X", point.x), y: .value("Y", point.y))
                    .foregroundStyle(tint)
                    .interpolationMethod(.catmullRom)
            }
        } else {
            Chart(points, id: \.offset) { _, point in
                BarMark(x: .value("X", point.x), y: .value("Y", point.y))
                    .foregroundStyle(tint)
                    .cornerRadius(2)
            }
        }
    }
}

struct ImageNodeView: View {
    let node: ImageNode

    var body: some View {
        AsyncImage(url: node.url) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFit()
            case .failure:
                Image(systemName: "photo").foregroundStyle(.secondary)
            default:
                ProgressView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: CGFloat(node.height ?? 90))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .accessibilityLabel(node.alt ?? "Image")
        .listRowBackground(Color.clear)
    }
}
