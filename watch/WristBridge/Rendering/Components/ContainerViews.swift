import SwiftUI

/// A `section` nested inside another node (top-level sections become List sections instead).
struct InlineSectionView: View {
    let node: SectionNode

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let title = node.title {
                Text(title.uppercased())
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            ForEach(Array(node.children.enumerated()), id: \.offset) { _, child in
                NodeView(node: child)
            }
            if let footer = node.footer {
                Text(footer).font(.caption2).foregroundStyle(.secondary)
            }
        }
    }
}

struct StackNodeView: View {
    let node: StackNode

    var body: some View {
        let spacing = node.spacing.map { CGFloat($0) } ?? 6
        Group {
            if node.axis == "horizontal" {
                HStack(alignment: .top, spacing: spacing) { children }
            } else {
                VStack(alignment: .leading, spacing: spacing) { children }
            }
        }
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets())
    }

    private var children: some View {
        ForEach(Array(node.children.enumerated()), id: \.offset) { _, child in
            NodeView(node: child)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
