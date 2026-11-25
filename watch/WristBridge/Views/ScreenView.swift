import SwiftUI

/// Shows one WatchUI document and wires its actions.
struct ScreenView: View {
    @Environment(Navigator.self) private var navigator
    @State private var model: ScreenViewModel

    init(route: Route) {
        _model = State(initialValue: ScreenViewModel(route: route))
    }

    var body: some View {
        content
            .navigationTitle(model.title)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await model.load() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(model.isWorking)
                }
            }
            .tint(Color(hex: model.tintHex) ?? .accentColor)
            .environment(\.watchAction, ActionHandler { action in
                model.handle(action, navigator: navigator)
            })
            .alert(
                model.pendingCall?.prompt ?? "Are you sure?",
                isPresented: confirmBinding,
                presenting: model.pendingCall
            ) { call in
                Button("Confirm", role: .destructive) {
                    Task { await model.run(call, navigator: navigator) }
                }
                Button("Cancel", role: .cancel) {}
            }
            .overlay(alignment: .bottom) {
                if let toast = model.toast {
                    ToastView(text: toast)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(.easeInOut(duration: 0.2), value: model.toast)
            .task(id: model.toast) {
                guard model.toast != nil else { return }
                try? await Task.sleep(for: .seconds(2))
                model.toast = nil
            }
            .task { await model.load() }
    }

    @ViewBuilder
    private var content: some View {
        switch model.state {
        case .loading:
            ProgressView()
        case .failed(let message):
            ErrorStateView(message: message) { Task { await model.load() } }
        case .loaded(let document, let isStale):
            DocumentView(document: document, isStale: isStale)
                .overlay {
                    if model.isWorking {
                        ProgressView().padding(8).background(.ultraThinMaterial, in: Circle())
                    }
                }
        }
    }

    private var confirmBinding: Binding<Bool> {
        Binding(
            get: { model.pendingCall != nil },
            set: { if !$0 { model.pendingCall = nil } }
        )
    }
}
