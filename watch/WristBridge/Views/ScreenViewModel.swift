import Foundation
import Observation
import WidgetKit

/// A call action waiting for the user to confirm.
struct PendingCall: Identifiable {
    let id = UUID()
    let actionID: String
    let payload: JSONValue?
    let prompt: String
    let then: String?
}

/// Loads one screen and runs its actions. One instance per pushed screen.
@MainActor
@Observable
final class ScreenViewModel {
    let route: Route
    private(set) var state: LoadState<WatchDocument> = .loading
    var pendingCall: PendingCall?
    var toast: String?
    private(set) var isWorking = false

    private let client: BridgeClient

    init(route: Route, client: BridgeClient = .shared) {
        self.route = route
        self.client = client
    }

    var title: String {
        if case .loaded(let doc, _) = state { return doc.screen.title }
        return ""
    }

    var tintHex: String? {
        if case .loaded(let doc, _) = state, let tint = doc.screen.tint { return tint }
        return route.tint
    }

    func load() async {
        do {
            let result = try await client.screen(app: route.appID, screen: route.screenID, params: route.params)
            state = .loaded(result.value, isStale: result.isStale)
        } catch {
            // Keep showing an already-loaded screen; just tell the user.
            if case .loaded = state {
                toast = error.localizedDescription
            } else {
                state = .failed(error.localizedDescription)
            }
        }
    }

    /// Entry point for every tap that carries an Action.
    func handle(_ action: Action, navigator: Navigator) {
        switch action {
        case let .navigate(screen, params):
            navigator.push(Route(appID: route.appID, screenID: screen, params: params, tint: tintHex))
        case let .call(id, payload, confirm, then):
            if let confirm {
                pendingCall = PendingCall(actionID: id, payload: payload, prompt: confirm, then: then)
            } else {
                Task { await run(PendingCall(actionID: id, payload: payload, prompt: "", then: then), navigator: navigator) }
            }
        case .refresh:
            Task { await load() }
        case .unsupported(let type):
            toast = "Unsupported action: \(type)"
        }
    }

    func run(_ call: PendingCall, navigator: Navigator) async {
        guard !isWorking else { return }
        isWorking = true
        defer { isWorking = false }

        do {
            let result = try await client.perform(
                app: route.appID,
                action: call.actionID,
                payload: call.payload,
                params: route.params
            )
            if result.ok { Haptics.success() } else { Haptics.failure() }
            if let message = result.message { toast = message }
            guard result.ok else { return }

            // Data changed: let the watch-face complication refresh too.
            WidgetCenter.shared.reloadAllTimelines()

            switch result.then ?? call.then ?? "refresh" {
            case "pop": navigator.pop()
            case "none": break
            default: await load()
            }
        } catch {
            Haptics.failure()
            toast = error.localizedDescription
        }
    }
}
