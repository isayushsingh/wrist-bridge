import SwiftUI

struct RowNodeView: View {
    let node: RowNode
    @Environment(\.watchAction) private var watchAction

    var body: some View {
        if let action = node.action {
            Button {
                watchAction(action)
            } label: {
                label(showsChevron: action.isNavigation)
            }
        } else {
            label(showsChevron: false)
        }
    }

    private func label(showsChevron: Bool) -> some View {
        HStack(spacing: 8) {
            if let icon = node.icon {
                Image(systemName: icon)
                    .foregroundStyle(Color(hex: node.tint) ?? .accentColor)
                    .frame(width: 18)
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(node.title)
                    .font(.headline)
                    .lineLimit(2)
                if let subtitle = node.subtitle {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
            Spacer(minLength: 4)
            if let value = node.value {
                Text(value).font(.caption).foregroundStyle(.secondary)
            }
            if showsChevron {
                Image(systemName: "chevron.right")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 2)
    }
}

extension Action {
    var isNavigation: Bool {
        if case .navigate = self { return true }
        return false
    }
}
