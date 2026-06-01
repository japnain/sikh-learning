import AuthenticationServices
import SwiftUI

struct NaamRasTabShell: View {
    @EnvironmentObject private var appState: NaamRasAppState

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            ForEach(AppTab.allCases) { tab in
                NavigationStack {
                    tabContent(tab)
                        .navigationTitle(tab.title)
                        .navigationBarTitleDisplayMode(.inline)
                }
                .tabItem {
                    Label(tab.title, systemImage: tab.symbolName)
                }
                .tag(tab)
            }
        }
        .tint(Color.naamSage)
        .accessibilityIdentifier("native-tab-shell")
    }

    @ViewBuilder
    private func tabContent(_ tab: AppTab) -> some View {
        switch tab {
        case .home: HomeScreen()
        case .read: ReadScreen()
        case .saved: SavedScreen()
        case .more: MoreScreen()
        }
    }
}

struct HomeScreen: View {
    @EnvironmentObject private var appState: NaamRasAppState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HomeDoorHero(
                    item: appState.continueReading,
                    profileLabel: appState.profile.level.title,
                    savedCount: appState.bookmarks.count
                ) {
                    appState.openReadTab()
                } openSaved: {
                    appState.selectedTab = .saved
                }

                HomeFlowBand(
                    imageName: "FlowReadHero",
                    eyebrow: "Daily Nitnem",
                    title: "Anchor the day in the next bani.",
                    text: "Keep Nitnem immediate, then browse Banis, Rehat, Amrit Keertan, and Panth Prakash when you need the wider shelf.",
                    actionTitle: "Open Read",
                    symbolName: "book.pages"
                ) {
                    appState.selectedTab = .read
                }

                SectionHeader(title: "Read Today", subtitle: "Hukamnama, Nitnem, and saved return points stay one scroll apart.")
                NativeCard {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                        FlowActionTile(title: "Hukamnama", subtitle: "Open today's guidance with reader controls.", systemImage: "sparkle.magnifyingglass", tint: .naamGold) {
                            appState.selectedTab = .read
                        }
                        FlowActionTile(title: "Nitnem", subtitle: "Jump into the daily bani shelf.", systemImage: "book.closed", tint: .naamSage) {
                            appState.selectedTab = .read
                        }
                        FlowActionTile(title: "Saved", subtitle: "Return to bookmarks and progress.", systemImage: "bookmark", tint: .naamGold) {
                            appState.selectedTab = .saved
                        }
                    }
                }

                FlowSavedFooter(
                    title: "Saved and progress",
                    subtitle: "Bookmarks and reader progress stay available offline first.",
                    value: "\(appState.bookmarks.count)",
                    symbolName: "bookmark.fill",
                    actionTitle: "Open Saved"
                ) {
                    appState.selectedTab = .saved
                }
            }
            .padding(18)
        }
        .background(NativeBackground())
    }
}

struct ReadScreen: View {
    @EnvironmentObject private var appState: NaamRasAppState
    @State private var query = ""
    @State private var activeCategory = "All"

    private var categories: [String] {
        ["All"] + Array(Set(appState.readings.map(\.category))).sorted()
    }

    private var filteredReadings: [ReadingItem] {
        let cleanQuery = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return appState.readings.filter { item in
            let categoryMatches = activeCategory == "All" || item.category == activeCategory
            let queryMatches = cleanQuery.isEmpty
                || item.title.lowercased().contains(cleanQuery)
                || item.subtitle.lowercased().contains(cleanQuery)
                || item.category.lowercased().contains(cleanQuery)
            return categoryMatches && queryMatches
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                FlowHero(
                    imageName: "FlowReadHero",
                    eyebrow: "Read",
                    title: "Scripture and history, ready to open.",
                    subtitle: "Browse Nitnem, Banis, Rehat, Panth Prakash, and scripture search with the same reader controls.",
                    symbolName: "book.pages",
                    progressTitle: "Current reading",
                    progressValue: appState.continueReading.progress
                )

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                    FlowActionTile(title: "Nitnem", subtitle: "Filter daily bani.", systemImage: "sun.max", tint: .naamGold) {
                        activeCategory = categories.first { $0.localizedCaseInsensitiveContains("Nitnem") } ?? "All"
                    }
                    FlowActionTile(title: "Banis", subtitle: "Browse bani sources.", systemImage: "text.book.closed", tint: .naamSage) {
                        activeCategory = categories.first { $0.localizedCaseInsensitiveContains("Bani") } ?? "All"
                    }
                    FlowActionTile(title: "Search", subtitle: "Find title, category, or source.", systemImage: "magnifyingglass", tint: .naamSage) {
                        query = ""
                    }
                    FlowActionTile(title: "Continue", subtitle: appState.continueReading.title, systemImage: "play.circle", tint: .naamGold) {
                        appState.markProgress(readingId: appState.continueReading.id, progress: max(appState.continueReading.progress, 0.25))
                    }
                }

                NativeCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Eyebrow(text: "Scripture search")
                        TextField("Search Nitnem, Banis, Panth Prakash", text: $query)
                            .textFieldStyle(.roundedBorder)
                            .accessibilityIdentifier("native-read-search")
                    }
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(categories, id: \.self) { category in
                            Button {
                                activeCategory = category
                            } label: {
                                Text(category)
                                    .font(.caption.weight(.semibold))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(activeCategory == category ? Color.naamGold.opacity(0.28) : Color.white.opacity(0.62), in: Capsule())
                                    .foregroundStyle(activeCategory == category ? Color.naamInk : Color.naamInk.opacity(0.68))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 2)
                }

                SectionHeader(title: "Reading shelf", subtitle: "\(filteredReadings.count) sources match the current filter.")
                ForEach(filteredReadings) { item in
                    NavigationLink {
                        ReaderScreen(item: item)
                    } label: {
                        ReadingRow(item: item)
                    }
                    .buttonStyle(.plain)
                }

                FlowSavedFooter(
                    title: "Saved readings",
                    subtitle: "Bookmarked readings and progress appear here before you leave the shelf.",
                    value: "\(appState.bookmarks.count)",
                    symbolName: "bookmark.fill",
                    actionTitle: "Open Saved"
                ) {
                    appState.selectedTab = .saved
                }
            }
            .padding(18)
        }
        .background(NativeBackground())
    }
}

struct ReaderScreen: View {
    @EnvironmentObject private var appState: NaamRasAppState
    var item: ReadingItem
    @State private var selectedWord: WordNote?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                FlowHero(
                    imageName: "FlowReadHero",
                    eyebrow: item.source,
                    title: item.title,
                    subtitle: item.subtitle,
                    symbolName: "text.book.closed",
                    progressTitle: "Reading progress",
                    progressValue: appState.readingProgress[item.id] ?? item.progress
                )

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                    FlowActionTile(title: appState.isBookmarked(item) ? "Saved" : "Save", subtitle: "Bookmark this reading.", systemImage: appState.isBookmarked(item) ? "bookmark.fill" : "bookmark", tint: .naamGold) {
                        appState.toggleBookmark(item)
                    }
                    FlowActionTile(title: "Complete", subtitle: "Mark progress done.", systemImage: "checkmark.circle", tint: .naamSage) {
                        appState.markProgress(readingId: item.id, progress: 1)
                    }
                }

                ReaderControls()

                ForEach(item.lines) { line in
                    NativeCard {
                        VStack(alignment: appState.readerPreferences.centerAligned ? .center : .leading, spacing: appState.readerPreferences.lineSpacing) {
                            Text(appState.readerPreferences.scriptMode == .gurmukhi ? line.gurmukhi : line.devanagari)
                                .font(.system(size: appState.readerPreferences.fontSize, weight: .semibold, design: .serif))
                                .multilineTextAlignment(appState.readerPreferences.centerAligned ? .center : .leading)
                            if appState.readerPreferences.transliterationVisible {
                                Text(line.transliteration)
                                    .foregroundStyle(Color.naamInk.opacity(0.62))
                            }
                            if appState.readerPreferences.meaningLanguage != .none {
                                Text(line.meaning)
                                    .foregroundStyle(Color.naamSage)
                            }
                            if appState.readerPreferences.vishraamVisible {
                                Label(line.vishraamNote, systemImage: "pause.circle")
                                    .font(.caption)
                                    .foregroundStyle(Color.naamInk.opacity(0.56))
                                    .multilineTextAlignment(appState.readerPreferences.centerAligned ? .center : .leading)
                            }
                            Text(line.source)
                                .font(.caption)
                                .foregroundStyle(Color.naamInk.opacity(0.48))
                            if !line.wordNotes.isEmpty {
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 8) {
                                        ForEach(line.wordNotes) { note in
                                            Button {
                                                selectedWord = note
                                            } label: {
                                                Label(note.word, systemImage: "text.magnifyingglass")
                                                    .font(.caption.weight(.semibold))
                                                    .padding(.horizontal, 10)
                                                    .padding(.vertical, 7)
                                                    .background(Color.naamParchment.opacity(0.78), in: Capsule())
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: appState.readerPreferences.centerAligned ? .center : .leading)
                    }
                }

                FlowSavedFooter(
                    title: appState.isBookmarked(item) ? "This reading is saved" : "Save this reading",
                    subtitle: "Saved readings appear in the bottom tab with source context and progress.",
                    value: "\(Int((appState.readingProgress[item.id] ?? item.progress) * 100))%",
                    symbolName: appState.isBookmarked(item) ? "bookmark.fill" : "bookmark",
                    actionTitle: appState.isBookmarked(item) ? "Open Saved" : "Save Now"
                ) {
                    if appState.isBookmarked(item) {
                        appState.selectedTab = .saved
                    } else {
                        appState.toggleBookmark(item)
                    }
                }
            }
            .padding(18)
        }
        .background(NativeBackground())
        .sheet(item: $selectedWord) { note in
            WordLookupSheet(note: note)
        }
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button {
                    appState.toggleBookmark(item)
                } label: {
                    Image(systemName: appState.isBookmarked(item) ? "bookmark.fill" : "bookmark")
                }
                Button {
                    appState.markProgress(readingId: item.id, progress: 1)
                } label: {
                    Image(systemName: "checkmark.circle")
                }
            }
        }
    }
}

struct SavedScreen: View {
    @EnvironmentObject private var appState: NaamRasAppState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                FlowHero(
                    imageName: "FlowSavedHero",
                    eyebrow: "Saved",
                    title: "Everything worth returning to.",
                    subtitle: "Bookmarks, vocab review, and reading progress stay offline first and sync when you choose.",
                    symbolName: "bookmark.fill",
                    progressTitle: "Saved total",
                    progressValue: min(Double(appState.bookmarks.count) / 12, 1)
                )

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                    MetricCard(title: "Bookmarks", value: "\(appState.bookmarks.count)", symbol: "bookmark")
                    MetricCard(title: "Progress", value: "\(appState.readingProgress.count)", symbol: "chart.line.uptrend.xyaxis")
                }

                if appState.bookmarks.isEmpty {
                    NativeCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Image(systemName: "bookmark")
                                .font(.largeTitle)
                                .foregroundStyle(Color.naamGold)
                            Text("Nothing saved yet.")
                                .font(.title2.bold())
                                .foregroundStyle(Color.naamInk)
                            Text("Save a reader line and it appears here with source context.")
                                .foregroundStyle(Color.naamInk.opacity(0.64))
                        }
                    }
                }

                if !appState.bookmarks.isEmpty {
                    SectionHeader(title: "Bookmarked readings", subtitle: "Reader saves keep source context attached.")
                }
                ForEach(appState.bookmarks) { bookmark in
                    NativeCard {
                        VStack(alignment: .leading, spacing: 5) {
                            Eyebrow(text: bookmark.source)
                            Text(bookmark.title)
                                .font(.headline)
                            Text(bookmark.createdAt, style: .date)
                                .font(.caption)
                                .foregroundStyle(Color.naamInk.opacity(0.56))
                        }
                    }
                }

                FlowSavedFooter(
                    title: "Continue from Saved",
                    subtitle: "Use Saved as the bottom return point after reading.",
                    value: "\(appState.bookmarks.count)",
                    symbolName: "tray.full",
                    actionTitle: "Open Read"
                ) {
                    appState.selectedTab = .read
                }
            }
            .padding(18)
        }
        .background(NativeBackground())
    }
}

struct MoreScreen: View {
    @EnvironmentObject private var appState: NaamRasAppState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                FlowHero(
                    imageName: "FlowMoreHero",
                    eyebrow: "More",
                    title: appState.currentUser?.email ?? "Guest reading is active",
                    subtitle: "Account, sync, privacy, sources, reader settings, support, and App Review notes live behind one quiet control surface.",
                    symbolName: "ellipsis.circle",
                    progressTitle: "Sync state",
                    progressValue: appState.cloudStatus == .synced ? 1 : 0.35
                )

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                    FlowActionTile(title: "Sync", subtitle: appState.cloudStatus.rawValue, systemImage: "icloud", tint: .naamGold) {
                        Task { try? await appState.syncNow() }
                    }
                    FlowActionTile(title: "Privacy", subtitle: "Sources and data use.", systemImage: "hand.raised", tint: .naamSage) {}
                    FlowActionTile(title: "Reader", subtitle: "Typography controls.", systemImage: "textformat.size", tint: .naamSage) {}
                    FlowActionTile(title: "Onboarding", subtitle: "Retune the setup.", systemImage: "slider.horizontal.3", tint: .naamGold) {
                        appState.resetOnboarding()
                    }
                }

                NativeCard(tint: .naamGold) {
                    VStack(alignment: .leading, spacing: 12) {
                        Eyebrow(text: "Supabase sync")
                        Text("Optional backup")
                            .font(.title2.bold())
                            .foregroundStyle(Color.naamInk)
                        Text("Status: \(appState.cloudStatus.rawValue)")
                            .foregroundStyle(Color.naamInk.opacity(0.64))
                        if let lastSyncedAt = appState.lastSyncedAt {
                            Text("Last synced \(lastSyncedAt.formatted(date: .abbreviated, time: .shortened))")
                                .font(.caption)
                                .foregroundStyle(Color.naamInk.opacity(0.56))
                        }
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
                            .textInputAutocapitalization(.never)
                            .textFieldStyle(.roundedBorder)
                        Button("Send magic link") {
                            Task { await appState.sendMagicLink() }
                        }
                        .buttonStyle(.borderedProminent)
                        if let error = appState.lastError {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(Color.naamSage)
                        }
                    }
                }

                NativeCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Eyebrow(text: "Privacy & Sources")
                        Text("No subscriptions, trial gates, paid locks, or unsupported recitation claims.")
                            .font(.headline)
                        Text("Guest data is stored on device. When signed in, bookmarks, reader preferences, vocab, and reading progress sync through Supabase with row-level security.")
                            .foregroundStyle(Color.naamInk.opacity(0.64))
                    }
                }

                NativeCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Eyebrow(text: "App Review Notes")
                        Text("Reviewer path")
                            .font(.headline)
                        ReviewNoteRow(title: "Demo mode", value: "Continue as Guest, then open Read > Japji Sahib.")
                        ReviewNoteRow(title: "Account", value: "Sign in is optional; Apple and email link are backup paths.")
                        ReviewNoteRow(title: "Content", value: "BaniDB remains the scripture source; guidance is not canonical commentary.")
                        ReviewNoteRow(title: "Commerce", value: "No IAP, subscriptions, paid locks, or restore flow.")
                    }
                }

                NativeCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Eyebrow(text: "Reader settings")
                        Toggle("Show transliteration", isOn: $appState.readerPreferences.transliterationVisible)
                        Toggle("Show vishraam support", isOn: $appState.readerPreferences.vishraamVisible)
                        Toggle("Center align lines", isOn: $appState.readerPreferences.centerAligned)
                        Slider(value: $appState.readerPreferences.fontSize, in: 18...34, step: 1) {
                            Text("Reader size")
                        }
                    }
                }

                Button("Reopen onboarding") {
                    appState.resetOnboarding()
                }
                .buttonStyle(.bordered)

                FlowSavedFooter(
                    title: "Saved stays local first",
                    subtitle: "Account setup never blocks reading; saved content can sync after sign-in.",
                    value: "\(appState.bookmarks.count)",
                    symbolName: "bookmark.fill",
                    actionTitle: "Open Saved"
                ) {
                    appState.selectedTab = .saved
                }
            }
            .padding(18)
        }
        .background(NativeBackground())
    }
}

private struct HomeDoorHero: View {
    var item: ReadingItem
    var profileLabel: String
    var savedCount: Int
    var openReader: () -> Void
    var openSaved: () -> Void

    var body: some View {
        NativeCard(tint: .naamGold, padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 12) {
                    Image("LaunchManuscript")
                        .resizable()
                        .scaledToFill()
                        .frame(width: 48, height: 48)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        .shadow(color: Color.black.opacity(0.12), radius: 10, x: 0, y: 6)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("NaamRas")
                            .font(.largeTitle.bold())
                            .foregroundStyle(Color.naamInk)
                        Text("Daily · Divine · You")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.naamGold)
                    }
                    Spacer()
                    Button(action: openSaved) {
                        Label("\(savedCount)", systemImage: "bookmark")
                            .labelStyle(.iconOnly)
                            .font(.headline)
                            .foregroundStyle(Color.naamInk)
                            .frame(width: 42, height: 42)
                            .background(Color.naamSurface.opacity(0.68), in: Circle())
                    }
                    .accessibilityLabel("Open saved library")
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)

                HStack {
                    Text(Date.now, format: .dateTime.weekday(.wide).month(.abbreviated).day())
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    Text(profileLabel)
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.naamGold.opacity(0.14), in: Capsule())
                }
                .foregroundStyle(Color.naamInk.opacity(0.78))
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .overlay(alignment: .top) {
                    Rectangle()
                        .fill(Color.naamBorder.opacity(0.18))
                        .frame(height: 1)
                        .padding(.horizontal, 16)
                }

                GeometryReader { proxy in
                    ZStack(alignment: .bottom) {
                        Image("FlowHomeHero")
                            .resizable()
                            .scaledToFill()
                            .frame(width: proxy.size.width, height: 288)
                            .clipped()
                            .accessibilityHidden(true)

                        LinearGradient(
                            colors: [
                                Color.clear,
                                Color.naamParchment.opacity(0.22),
                                Color.naamParchment.opacity(0.88)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )

                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Eyebrow(text: "Today's Hukamnama")
                                Spacer()
                                Text(item.source)
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(Color.naamInk.opacity(0.54))
                            }
                            if let firstLine = item.lines.first {
                                Text(firstLine.gurmukhi)
                                    .font(.system(size: 25, weight: .semibold, design: .serif))
                                    .foregroundStyle(Color.naamInk)
                                    .fixedSize(horizontal: false, vertical: true)
                            } else {
                                Text(item.title)
                                    .font(.title2.bold())
                                    .foregroundStyle(Color.naamInk)
                            }
                            Text(item.subtitle)
                                .font(.subheadline)
                                .foregroundStyle(Color.naamInk.opacity(0.68))
                                .lineLimit(2)
                            ProgressPill(title: "Continue reading", value: item.progress)
                            PrimaryActionButton(title: "Read Hukamnama", systemImage: "book.pages", action: openReader)
                        }
                        .padding(14)
                        .background(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(Color.naamSurface.opacity(0.94))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .stroke(Color.naamGold.opacity(0.22), lineWidth: 1)
                                )
                                .shadow(color: Color.black.opacity(0.12), radius: 18, x: 0, y: 10)
                        )
                        .padding(14)
                    }
                }
                .frame(height: 288)
            }
        }
        .accessibilityIdentifier("native-home-door-hero")
    }
}

private struct HomeFlowBand: View {
    var imageName: String
    var eyebrow: String
    var title: String
    var text: String
    var actionTitle: String
    var symbolName: String
    var action: () -> Void

    var body: some View {
        NativeCard(tint: .naamGold, padding: 0) {
            HStack(alignment: .center, spacing: 14) {
                Image(imageName)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 118, height: 128)
                    .clipped()
                    .overlay(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .stroke(Color.naamGold.opacity(0.18), lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(text: eyebrow)
                    Text(title)
                        .font(.title3.bold())
                        .foregroundStyle(Color.naamInk)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(text)
                        .font(.subheadline)
                        .foregroundStyle(Color.naamInk.opacity(0.66))
                        .fixedSize(horizontal: false, vertical: true)
                    Button(action: action) {
                        Label(actionTitle, systemImage: symbolName)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 11)
                            .padding(.vertical, 8)
                            .background(Color.naamDeep, in: Capsule())
                            .foregroundStyle(Color.naamParchment)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.vertical, 14)
                .padding(.trailing, 14)
            }
        }
    }
}

private struct SectionHeader: View {
    var title: String
    var subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title)
                .font(.title.bold())
                .foregroundStyle(Color.naamInk)
            Text(subtitle)
                .foregroundStyle(Color.naamInk.opacity(0.64))
        }
    }
}

private struct MetricCard: View {
    var title: String
    var value: String
    var symbol: String

    var body: some View {
        NativeCard {
            VStack(alignment: .leading, spacing: 8) {
                Image(systemName: symbol)
                    .foregroundStyle(Color.naamGold)
                Text(value)
                    .font(.headline)
                    .foregroundStyle(Color.naamInk)
                    .lineLimit(2)
                    .minimumScaleFactor(0.75)
                Text(title)
                    .font(.caption)
                    .foregroundStyle(Color.naamInk.opacity(0.56))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct ReadingRow: View {
    var item: ReadingItem

    var body: some View {
        NativeCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Eyebrow(text: item.category)
                    Spacer()
                    Text(item.source)
                        .font(.caption.monospaced())
                        .foregroundStyle(Color.naamInk.opacity(0.5))
                }
                Text(item.title)
                    .font(.title3.bold())
                    .foregroundStyle(Color.naamInk)
                Text(item.subtitle)
                    .foregroundStyle(Color.naamInk.opacity(0.64))
                ProgressPill(title: "Progress", value: item.progress)
            }
        }
    }
}

private struct ReaderControls: View {
    @EnvironmentObject private var appState: NaamRasAppState

    var body: some View {
        NativeCard {
            VStack(alignment: .leading, spacing: 14) {
                Eyebrow(text: "Reader controls")
                Picker("Script", selection: $appState.readerPreferences.scriptMode) {
                    ForEach(ScriptMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                Picker("Meaning", selection: $appState.readerPreferences.meaningLanguage) {
                    ForEach(MeaningLanguage.allCases) { language in
                        Text(language.title).tag(language)
                    }
                }
                .pickerStyle(.segmented)
                Toggle("Transliteration", isOn: $appState.readerPreferences.transliterationVisible)
                Toggle("Vishraam", isOn: $appState.readerPreferences.vishraamVisible)
                Slider(value: $appState.readerPreferences.fontSize, in: 18...34, step: 1) {
                    Text("Font size")
                }
            }
        }
    }
}

private struct WordLookupSheet: View {
    var note: WordNote

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text(note.word)
                    .font(.largeTitle.bold())
                    .foregroundStyle(Color.naamInk)
                Text(note.pronunciation)
                    .font(.title3)
                    .foregroundStyle(Color.naamSage)
                Text(note.meaning)
                    .font(.body)
                    .foregroundStyle(Color.naamInk.opacity(0.74))
                Text(note.source)
                    .font(.caption)
                    .foregroundStyle(Color.naamInk.opacity(0.52))
                Spacer()
            }
            .padding(22)
            .background(NativeBackground())
            .navigationTitle("Word Lookup")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

private struct ReviewNoteRow: View {
    var title: String
    var value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption.weight(.bold))
                .textCase(.uppercase)
                .foregroundStyle(Color.naamInk.opacity(0.48))
            Text(value)
                .foregroundStyle(Color.naamInk.opacity(0.72))
        }
    }
}
