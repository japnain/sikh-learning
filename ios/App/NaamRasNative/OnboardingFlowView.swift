import AuthenticationServices
import SwiftUI

struct OnboardingFlowView: View {
    @EnvironmentObject private var appState: NaamRasAppState
    @State private var stepIndex = 0

    private let totalSteps = 5

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 8) {
                    ForEach(0..<totalSteps, id: \.self) { index in
                        Capsule()
                            .fill(index <= stepIndex ? Color.naamGold : Color.naamSage.opacity(0.18))
                            .frame(height: 5)
                    }
                }
                .accessibilityLabel("Onboarding step \(stepIndex + 1) of \(totalSteps)")

                FlowHero(
                    imageName: heroImageName,
                    eyebrow: "NaamRas setup",
                    title: onboardingTitle,
                    subtitle: "Five choices build a real reader: intent, script, support, profile, and backup.",
                    symbolName: "sparkles",
                    progressTitle: "Setup progress",
                    progressValue: Double(stepIndex + 1) / Double(totalSteps)
                )

                NativeCard {
                    stepContent
                }

                HStack {
                    if stepIndex > 0 {
                        Button {
                            stepIndex -= 1
                        } label: {
                            Label("Back", systemImage: "chevron.left")
                        }
                        .buttonStyle(.bordered)
                    }
                    Spacer()
                    PrimaryActionButton(title: stepIndex == totalSteps - 1 ? "Start NaamRas" : "Continue") {
                        if stepIndex == totalSteps - 1 {
                            appState.completeOnboarding()
                        } else {
                            stepIndex += 1
                        }
                    }
                    .frame(maxWidth: 220)
                }
            }
            .padding(22)
            .frame(maxWidth: 720)
        }
        .safeAreaInset(edge: .bottom) {
            Color.clear.frame(height: 12)
        }
        .accessibilityIdentifier("native-onboarding")
    }

    @ViewBuilder
    private var stepContent: some View {
        switch stepIndex {
        case 0:
            VStack(alignment: .leading, spacing: 14) {
                Eyebrow(text: "Step 1")
                Text("What should NaamRas help you do first?")
                    .font(.title.bold())
                    .foregroundStyle(Color.naamInk)
                ForEach(LearningGoal.allCases) { goal in
                    SelectableRow(
                        title: goal.title,
                        subtitle: subtitle(for: goal),
                        selected: appState.profile.goal == goal
                    ) {
                        appState.profile.goal = goal
                    }
                }
            }
        case 1:
            VStack(alignment: .leading, spacing: 14) {
                Eyebrow(text: "Step 2")
                Text("Choose the script your reader should open with.")
                    .font(.title.bold())
                    .foregroundStyle(Color.naamInk)
                ForEach(ScriptMode.allCases) { mode in
                    SelectableRow(
                        title: mode.title,
                        subtitle: mode == .gurmukhi ? "Keep the original Gurmukhi line central." : "Use Devanagari display when it helps recognition.",
                        selected: appState.readerPreferences.scriptMode == mode
                    ) {
                        appState.readerPreferences.scriptMode = mode
                    }
                }
            }
        case 2:
            VStack(alignment: .leading, spacing: 14) {
                Eyebrow(text: "Step 3")
                Text("Set how much help appears around each line.")
                    .font(.title.bold())
                    .foregroundStyle(Color.naamInk)
                ForEach(SupportDensity.allCases) { density in
                    SelectableRow(
                        title: density.title,
                        subtitle: density.description,
                        selected: appState.readerPreferences.supportDensity == density
                    ) {
                        appState.readerPreferences.applySupportDensity(density)
                    }
                }
            }
        case 3:
            VStack(alignment: .leading, spacing: 14) {
                Eyebrow(text: "Step 4")
                Text("Set your reading profile.")
                    .font(.title.bold())
                    .foregroundStyle(Color.naamInk)
                ForEach(LearningLevel.allCases) { level in
                    SelectableRow(
                        title: level.title,
                        subtitle: levelSubtitle(for: level),
                        selected: appState.profile.level == level
                    ) {
                        appState.profile.level = level
                    }
                }
                Picker("Meaning language", selection: $appState.readerPreferences.meaningLanguage) {
                    ForEach(MeaningLanguage.allCases) { language in
                        Text(language.title).tag(language)
                    }
                }
                .pickerStyle(.segmented)
            }
        default:
            VStack(alignment: .leading, spacing: 16) {
                Eyebrow(text: "Step 5")
                Text("Preview and choose backup.")
                    .font(.title.bold())
                    .foregroundStyle(Color.naamInk)
                ReaderPreviewCard(item: appState.continueReading)
                VStack(alignment: .leading, spacing: 12) {
                    Text("Backup stays optional.")
                        .font(.headline)
                    Text("Guest reading works now. Sign in with Apple or email later to sync saved passages, learning progress, and reader preferences through Supabase.")
                        .font(.subheadline)
                        .foregroundStyle(Color.naamInk.opacity(0.64))
                    SignInWithAppleButton(.continue) { request in
                        appState.prepareAppleRequest(request)
                    } onCompletion: { result in
                        Task { await appState.handleAppleAuthorization(result) }
                    }
                    .signInWithAppleButtonStyle(.black)
                    .frame(height: 48)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    TextField("Email for magic link", text: $appState.emailForMagicLink)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .padding(12)
                        .background(Color.white.opacity(0.7), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    Button {
                        Task { await appState.sendMagicLink() }
                    } label: {
                        Label("Send magic link", systemImage: "envelope")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(appState.emailForMagicLink.trimmingCharacters(in: .whitespacesAndNewlines).contains("@") == false)
                }
            }
        }
    }

    private func subtitle(for goal: LearningGoal) -> String {
        switch goal {
        case .read: "Open daily bani and keep the original line readable."
        case .understand: "Pair source text with meanings and guided Learn paths."
        case .habit: "Use gentle progress, saved passages, and daily returns."
        }
    }

    private func levelSubtitle(for level: LearningLevel) -> String {
        switch level {
        case .beginner: "Keep transliteration and meanings close."
        case .familiar: "Balance original text with context."
        case .dailyReader: "Start with quieter controls and faster navigation."
        }
    }

    private var heroImageName: String {
        switch stepIndex {
        case 0: "FlowHomeHero"
        case 1: "FlowReadHero"
        case 2: "FlowLearnHero"
        case 3: "FlowSavedHero"
        default: "FlowMoreHero"
        }
    }

    private var onboardingTitle: String {
        switch stepIndex {
        case 0: "Begin with your purpose."
        case 1: "Choose the first script."
        case 2: "Set the support density."
        case 3: "Shape the reader profile."
        default: "Preview, then start."
        }
    }
}

private struct ReaderPreviewCard: View {
    @EnvironmentObject private var appState: NaamRasAppState
    var item: ReadingItem

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(item.title)
                .font(.headline)
            ForEach(item.lines.prefix(2)) { line in
                VStack(alignment: appState.readerPreferences.centerAligned ? .center : .leading, spacing: 6) {
                    Text(appState.readerPreferences.scriptMode == .gurmukhi ? line.gurmukhi : line.devanagari)
                        .font(.system(size: appState.readerPreferences.fontSize, weight: .semibold, design: .serif))
                    if appState.readerPreferences.transliterationVisible {
                        Text(line.transliteration)
                            .font(.footnote)
                            .foregroundStyle(Color.naamInk.opacity(0.62))
                    }
                    if appState.readerPreferences.meaningLanguage != .none {
                        Text(line.meaning)
                            .font(.footnote)
                            .foregroundStyle(Color.naamSage)
                    }
                }
                .frame(maxWidth: .infinity, alignment: appState.readerPreferences.centerAligned ? .center : .leading)
                .padding(.vertical, appState.readerPreferences.lineSpacing / 2)
            }
        }
        .padding(14)
        .background(Color.naamParchment.opacity(0.7), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
