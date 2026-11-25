import SwiftUI

/// Renders a whole WatchUI document as a native watch List.
/// Top-level `section` nodes become real List sections (with headers); everything else is a row.
struct DocumentView: View {
    let document: WatchDocument
    let isStale: Bool

    var body: some View {
        List {
            if isStale { StaleBanner() }
            ForEach(Array(document.body.enumerated()), id: \.offset) { _, node in
                topLevel(node)
            }
        }
    }

    @ViewBuilder
    private func topLevel(_ node: Node) -> some View {
        switch node {
        case .section(let section):
            Section {
                ForEach(Array(section.children.enumerated()), id: \.offset) { _, child in
                    NodeView(node: child)
                }
            } header: {
                if let title = section.title { Text(title) }
            } footer: {
                if let footer = section.footer { Text(footer) }
            }
        default:
            NodeView(node: node)
        }
    }
}
