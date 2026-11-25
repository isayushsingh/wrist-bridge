import SwiftUI

struct ButtonNodeView: View {
    let node: ButtonNode
    @Environment(\.watchAction) private var watchAction

    var body: some View {
        Button(role: node.role == "destructive" ? .destructive : nil) {
            watchAction(node.action)
        } label: {
            if let icon = node.icon {
                Label(node.label, systemImage: icon)
            } else {
                Text(node.label)
            }
        }
        .foregroundStyle(node.role == "destructive" ? Color.red : (Color(hex: node.tint) ?? .accentColor))
    }
}

/// Optimistic toggle: flips instantly, then sends the call action with payload.value = new state.
/// After the action the screen reloads; NodeView gives this view a new identity when the
/// server value changes, which resets the local state to the truth.
struct ToggleNodeView: View {
    let node: ToggleNode
    @Environment(\.watchAction) private var watchAction
    @State private var isOn: Bool

    init(node: ToggleNode) {
        self.node = node
        _isOn = State(initialValue: node.isOn)
    }

    var body: some View {
        Toggle(node.label, isOn: $isOn)
            .onChange(of: isOn) { _, newValue in
                watchAction(node.action.withValue(newValue))
            }
    }
}
