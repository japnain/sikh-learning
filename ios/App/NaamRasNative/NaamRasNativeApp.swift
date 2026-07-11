import SwiftUI

@main
struct NaamRasNativeApp: App {
    @StateObject private var appState = NaamRasAppState()

    var body: some Scene {
        WindowGroup {
            NaamRasRootView()
                .environmentObject(appState)
        }
    }
}

struct NaamRasRootView: View {
    @EnvironmentObject private var appState: NaamRasAppState

    var body: some View {
        ZStack {
            NativeBackground()
            if appState.profile.completed {
                NaamRasTabShell()
                    .transition(.opacity.combined(with: .scale(scale: 0.98)))
            } else {
                OnboardingFlowView()
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .animation(.snappy(duration: 0.35), value: appState.profile.completed)
        .preferredColorScheme(preferredColorScheme)
    }

    private var preferredColorScheme: ColorScheme? {
        switch appState.appearanceMode {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}
