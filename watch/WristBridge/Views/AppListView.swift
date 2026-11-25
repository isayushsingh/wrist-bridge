import SwiftUI

/// Root screen: every PWA registered on the proxy.
struct AppListView: View {
    @Environment(Navigator.self) private var navigator
    @State private var state: LoadState<[BridgeAppInfo]> = .loading

    var body: some View {
        content
            .navigationTitle("WristBridge")
            .task { await load() }
    }

    @ViewBuilder
    private var content: some View {
        switch state {
        case .loading:
            ProgressView()
        case .failed(let message):
            ErrorStateView(message: message) { Task { await load() } }
        case .loaded(let apps, let isStale):
            List {
                if isStale { StaleBanner() }
                if apps.isEmpty {
                    Text("No apps registered on the proxy yet.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                ForEach(apps) { app in
                    Button {
                        navigator.push(Route(appID: app.id, screenID: app.entry, params: [:], tint: app.themeColor))
                    } label: {
                        AppRow(app: app)
                    }
                }
            }
        }
    }

    private func load() async {
        do {
            let result = try await BridgeClient.shared.apps()
            state = .loaded(result.value, isStale: result.isStale)
        } catch {
            if case .loaded = state { return } // keep showing what we have
            state = .failed(error.localizedDescription)
        }
    }
}

private struct AppRow: View {
    let app: BridgeAppInfo

    var body: some View {
        HStack(spacing: 10) {
            AsyncImage(url: app.icon) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    Image(systemName: "app.dashed")
                        .foregroundStyle(Color(hex: app.themeColor) ?? .accentColor)
                }
            }
            .frame(width: 28, height: 28)
            .clipShape(Circle())

            Text(app.shortName ?? app.name)
                .font(.headline)
                .lineLimit(2)
        }
        .padding(.vertical, 2)
    }
}
