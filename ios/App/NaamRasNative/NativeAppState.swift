import AuthenticationServices
import Foundation
import SwiftUI

@MainActor
final class NaamRasAppState: ObservableObject {
    @Published var selectedTab: AppTab = .home
    @Published var profile = OnboardingProfile() { didSet { persist() } }
    @Published var readerPreferences = ReaderPreferences() { didSet { persist() } }
    @Published var bookmarks: [BookmarkItem] = [] { didSet { persist() } }
    @Published var savedLearnItemIds: [String] = [] { didSet { persist() } }
    @Published var readingProgress: [String: Double] = [:] { didSet { persist() } }
    @Published var currentUser: CloudUser? { didSet { persist() } }
    @Published var cloudStatus: CloudSyncStatus
    @Published var lastSyncedAt: Date? { didSet { persist() } }
    @Published var lastError: String?
    @Published var emailForMagicLink = ""

    private let storageKey = "naamras-native-state-v1"
    private let supabase: SupabaseBridge
    private var pendingAppleNonce: String?

    init(supabase: SupabaseBridge = SupabaseBridge()) {
        self.supabase = supabase
        cloudStatus = supabase.configuration.isConfigured ? .configured : .localOnly
        restore()
    }

    var readings: [ReadingItem] {
        NativeCatalogStore.readings.map { item in
            var next = item
            next.progress = readingProgress[item.id] ?? item.progress
            return next
        }
    }

    var continueReading: ReadingItem {
        readings.first { $0.progress > 0 } ?? readings[0]
    }

    var savedLearnItems: [LearnItem] {
        learnItems.filter { savedLearnItemIds.contains($0.id) }
    }

    var learnItems: [LearnItem] {
        NativeCatalogStore.learnItems
    }

    var snapshot: NativeSnapshot {
        NativeSnapshot(
            profile: profile,
            readerPreferences: readerPreferences,
            bookmarks: bookmarks,
            savedLearnItemIds: savedLearnItemIds,
            readingProgress: readingProgress,
            exportedAt: Date()
        )
    }

    func completeOnboarding(accountChoice: String = "Guest") {
        profile.accountChoice = accountChoice
        profile.completed = true
        readerPreferences.applySupportDensity(readerPreferences.supportDensity)
        markProgress(readingId: continueReading.id, progress: max(continueReading.progress, 0.2))
    }

    func resetOnboarding() {
        profile.completed = false
    }

    func openReadTab() {
        selectedTab = .read
    }

    func markProgress(readingId: String, progress: Double) {
        readingProgress[readingId] = min(max(progress, 0), 1)
    }

    func isBookmarked(_ item: ReadingItem) -> Bool {
        bookmarks.contains { $0.readingId == item.id }
    }

    func toggleBookmark(_ item: ReadingItem) {
        if let existing = bookmarks.firstIndex(where: { $0.readingId == item.id }) {
            bookmarks.remove(at: existing)
        } else {
            bookmarks.insert(
                BookmarkItem(
                    id: "bookmark-\(item.id)-\(Int(Date().timeIntervalSince1970))",
                    readingId: item.id,
                    title: item.title,
                    source: item.source,
                    createdAt: Date()
                ),
                at: 0
            )
        }
    }

    func isLearnItemSaved(_ item: LearnItem) -> Bool {
        savedLearnItemIds.contains(item.id)
    }

    func toggleLearnItem(_ item: LearnItem) {
        if savedLearnItemIds.contains(item.id) {
            savedLearnItemIds.removeAll { $0 == item.id }
        } else {
            savedLearnItemIds.insert(item.id, at: 0)
        }
    }

    func prepareAppleRequest(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = SupabaseBridge.randomNonceString()
        pendingAppleNonce = nonce
        request.requestedScopes = [.email, .fullName]
        request.nonce = SupabaseBridge.sha256(nonce)
        cloudStatus = .authenticating
        lastError = nil
    }

    func handleAppleAuthorization(_ result: Result<ASAuthorization, Error>) async {
        do {
            let authorization = try result.get()
            guard let nonce = pendingAppleNonce else { throw SupabaseBridgeError.missingAppleToken }
            let user = try await supabase.signInWithApple(authorization: authorization, nonce: nonce)
            currentUser = user
            cloudStatus = .signedIn
            profile.accountChoice = "Apple"
            try await syncNow()
        } catch {
            cloudStatus = .error
            lastError = error.localizedDescription
        }
        pendingAppleNonce = nil
    }

    func sendMagicLink() async {
        let email = emailForMagicLink.trimmingCharacters(in: .whitespacesAndNewlines)
        guard email.contains("@") else {
            lastError = "Enter a valid email address."
            return
        }

        do {
            cloudStatus = .authenticating
            try await supabase.sendMagicLink(email: email)
            currentUser = CloudUser(id: email.lowercased(), email: email)
            cloudStatus = .signedIn
            lastError = "Check your email for the Supabase magic link."
        } catch {
            cloudStatus = .error
            lastError = error.localizedDescription
        }
    }

    func syncNow() async throws {
        cloudStatus = .syncing
        do {
            let syncedAt = try await supabase.invokeMerge(snapshot: snapshot)
            lastSyncedAt = syncedAt
            cloudStatus = .synced
            lastError = nil
        } catch {
            cloudStatus = currentUser == nil ? .error : .signedIn
            lastError = error.localizedDescription
            throw error
        }
    }

    private func persist() {
        let envelope = NativeStateEnvelope(
            profile: profile,
            readerPreferences: readerPreferences,
            bookmarks: bookmarks,
            savedLearnItemIds: savedLearnItemIds,
            readingProgress: readingProgress,
            currentUser: currentUser,
            lastSyncedAt: lastSyncedAt
        )

        if let data = try? JSONEncoder.nativeSyncEncoder.encode(envelope) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    private func restore() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let envelope = try? JSONDecoder.nativeSyncDecoder.decode(NativeStateEnvelope.self, from: data) else {
            return
        }

        profile = envelope.profile
        readerPreferences = envelope.readerPreferences
        bookmarks = envelope.bookmarks
        savedLearnItemIds = envelope.savedLearnItemIds
        readingProgress = envelope.readingProgress
        currentUser = envelope.currentUser
        lastSyncedAt = envelope.lastSyncedAt
        if currentUser != nil {
            cloudStatus = .signedIn
        }
    }
}

private struct NativeStateEnvelope: Codable {
    var profile: OnboardingProfile
    var readerPreferences: ReaderPreferences
    var bookmarks: [BookmarkItem]
    var savedLearnItemIds: [String]
    var readingProgress: [String: Double]
    var currentUser: CloudUser?
    var lastSyncedAt: Date?
}
