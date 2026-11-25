import SwiftUI

struct ErrorStateView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                Image(systemName: "wifi.exclamationmark")
                    .font(.title2)
                    .foregroundStyle(.orange)
                Text(message)
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                Button("Try again", action: retry)
            }
            .padding(.top, 8)
        }
    }
}

/// Shown when content came from the offline cache.
struct StaleBanner: View {
    var body: some View {
        Label("Offline: showing saved copy", systemImage: "icloud.slash")
            .font(.caption2)
            .foregroundStyle(.secondary)
            .listRowBackground(Color.clear)
    }
}

struct ToastView: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption)
            .lineLimit(2)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.thinMaterial, in: Capsule())
            .padding(.bottom, 4)
    }
}
