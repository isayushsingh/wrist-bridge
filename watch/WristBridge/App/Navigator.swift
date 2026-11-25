import Observation
import SwiftUI

/// One screen on the navigation stack.
struct Route: Hashable {
    let appID: String
    let screenID: String
    let params: [String: String]
    /// The app's theme color, used until the screen's own tint arrives.
    let tint: String?
}

/// Owns the navigation stack so any screen can push or pop.
@Observable
final class Navigator {
    var path: [Route] = []

    func push(_ route: Route) {
        path.append(route)
    }

    func pop() {
        if !path.isEmpty { path.removeLast() }
    }
}
