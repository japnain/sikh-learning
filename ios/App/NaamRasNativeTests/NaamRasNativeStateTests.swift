import XCTest
@testable import NaamRasNative

@MainActor
final class NaamRasNativeStateTests: XCTestCase {
    private let storageKey = "naamras-native-state-v1"

    private func makeLocalOnlyState() -> NaamRasAppState {
        UserDefaults.standard.removeObject(forKey: storageKey)
        return NaamRasAppState(supabase: SupabaseBridge(configuration: SupabaseConfiguration(url: nil, anonKey: nil)))
    }

    func testSupportDensityAppliesReaderControls() {
        var preferences = ReaderPreferences()

        preferences.applySupportDensity(.minimal)

        XCTAssertEqual(preferences.supportDensity, .minimal)
        XCTAssertEqual(preferences.meaningLanguage, .none)
        XCTAssertFalse(preferences.transliterationVisible)
    }

    func testBookmarksToggleWithoutDuplicates() {
        let state = makeLocalOnlyState()
        let item = state.readings[0]

        state.toggleBookmark(item)
        state.toggleBookmark(item)
        state.toggleBookmark(item)

        XCTAssertEqual(state.bookmarks.count, 1)
        XCTAssertTrue(state.isBookmarked(item))
    }

    func testOnboardingCompletionDoesNotInventReadingProgress() {
        let state = makeLocalOnlyState()

        state.completeOnboarding()

        XCTAssertTrue(state.profile.completed)
        XCTAssertEqual(state.profile.accountChoice, "Guest")
        XCTAssertTrue(state.readingProgress.isEmpty)
    }

    func testSnapshotCarriesSyncPayload() {
        let state = makeLocalOnlyState()
        state.profile.goal = .understand
        let item = state.readings[0]
        state.toggleBookmark(item)

        let snapshot = state.snapshot

        XCTAssertEqual(snapshot.profile.goal, .understand)
        XCTAssertEqual(snapshot.bookmarks.map(\.readingId), [item.id])
    }

    func testNativeCatalogOnlyPublishesReadingsWithRealContentRoutes() {
        let state = makeLocalOnlyState()

        XCTAssertGreaterThan(state.readings.count, 50)
        XCTAssertTrue(state.readings.allSatisfy { $0.baniDbId != nil })
        XCTAssertTrue(state.readings.allSatisfy { $0.lines.isEmpty })
        XCTAssertNil(state.readings.first { $0.id == "panth-prakash" })
        XCTAssertFalse(state.cloudBackupAvailable)
    }
}
