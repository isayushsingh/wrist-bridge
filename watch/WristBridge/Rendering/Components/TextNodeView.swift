import SwiftUI

struct TextNodeView: View {
    let node: TextNode

    var body: some View {
        Text(node.text)
            .font(Tokens.font(node.style))
            .foregroundStyle(foreground)
            .multilineTextAlignment(Tokens.alignment(node.align))
            .lineLimit(node.lines)
            .frame(maxWidth: .infinity, alignment: Tokens.frameAlignment(node.align))
            .listRowBackground(Color.clear)
    }

    private var foreground: Color {
        if let color = Color(hex: node.color) { return color }
        return node.style == "caption" || node.style == "footnote" ? .secondary : .primary
    }
}
