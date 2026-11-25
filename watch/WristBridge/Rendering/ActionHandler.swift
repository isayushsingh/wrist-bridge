import SwiftUI

/// How a deeply nested button tells its screen "the user tapped an action".
/// ScreenView puts a handler in the environment; components call `watchAction(action)`.
struct ActionHandler {
    let perform: (Action) -> Void

    func callAsFunction(_ action: Action) {
        perform(action)
    }
}

extension EnvironmentValues {
    @Entry var watchAction: ActionHandler = ActionHandler { _ in }
}
