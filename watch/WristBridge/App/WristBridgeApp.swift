import SwiftUI

@main
struct WristBridgeApp: App {
    @State private var navigator = Navigator()

    var body: some Scene {
        WindowGroup {
            NavigationStack(path: $navigator.path) {
                AppListView()
                    .navigationDestination(for: Route.self) { route in
                        ScreenView(route: route)
                    }
            }
            .environment(navigator)
        }
    }
}
