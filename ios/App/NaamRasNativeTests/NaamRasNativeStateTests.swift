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
        XCTAssertFalse(preferences.vishraamVisible)
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

    func testOnboardingCompletionCreatesUsableGuestState() {
        let state = makeLocalOnlyState()

        state.completeOnboarding()

        XCTAssertTrue(state.profile.completed)
        XCTAssertEqual(state.profile.accountChoice, "Guest")
        XCTAssertGreaterThan(state.readingProgress[state.continueReading.id] ?? 0, 0)
    }

    func testSnapshotCarriesSyncPayload() {
        let state = makeLocalOnlyState()
        state.profile.goal = .understand
        state.toggleLearnItem(state.learnItems[0])

        let snapshot = state.snapshot

        XCTAssertEqual(snapshot.profile.goal, .understand)
        XCTAssertEqual(snapshot.savedLearnItemIds, [state.learnItems[0].id])
    }

    func testNativeCatalogAddsProductCoverageBeyondPreviewFixtures() {
        let state = makeLocalOnlyState()

        XCTAssertGreaterThanOrEqual(state.readings.count, NativeFixtures.readings.count)
        XCTAssertGreaterThanOrEqual(state.learnItems.count, NativeFixtures.learnItems.count)
        XCTAssertNotNil(state.readings.first { $0.id == "panth-prakash" })
        XCTAssertNotNil(state.readings.first { $0.id == "scripture-search" })
    }
}
