import SwiftUI

/// The renderer's switchboard: one WatchUI node in, one SwiftUI view out.
/// To add a component: add a case in WatchUI.swift, a view in Components/, and a line here.
struct NodeView: View {
    let node: Node

    var body: some View {
        switch node {
        case .text(let n): TextNodeView(node: n)
        case .section(let n): InlineSectionView(node: n)
        case .stack(let n): StackNodeView(node: n)
        case .row(let n): RowNodeView(node: n)
        case .metric(let n): MetricNodeView(node: n)
        case .gauge(let n): GaugeNodeView(node: n)
        case .chart(let n): ChartNodeView(node: n)
        case .image(let n): ImageNodeView(node: n)
        case .button(let n): ButtonNodeView(node: n)
        // .id(...) resets the toggle's local state whenever the server value changes.
        case .toggle(let n): ToggleNodeView(node: n).id("\(n.label)-\(n.isOn)")
        case .divider: Divider()
        case .unsupported(let type):
            Label("Update the app to see “\(type)”", systemImage: "questionmark.square.dashed")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }
}

/// Maps WatchUI style tokens to SwiftUI. Unknown tokens fall back to sensible defaults.
enum Tokens {
    static func font(_ style: String?) -> Font {
        switch style {
        case "title": return .title3.weight(.semibold)
        case "headline": return .headline
        case "caption": return .caption
        case "footnote": return .footnote
        default: return .body
        }
    }

    static func alignment(_ align: String?) -> TextAlignment {
        switch align {
        case "center": return .center
        case "trailing": return .trailing
        default: return .leading
        }
    }

    static func frameAlignment(_ align: String?) -> Alignment {
        switch align {
        case "center": return .center
        case "trailing": return .trailing
        default: return .leading
        }
    }
}
