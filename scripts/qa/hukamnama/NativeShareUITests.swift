import XCTest

final class NativeShareUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication(bundleIdentifier: "com.naamras.shareqa")
        app.launch()
        XCTAssertTrue(app.buttons["Open share composer"].waitForExistence(timeout: 45))
    }

    override func tearDownWithError() throws {
        screenshot("Final state")
        app.terminate()
    }

    func testShortShareCancelAndSave() throws { try exercise("Short excerpt", name: "short") }
    func testMediumShareCancelAndSave() throws { try exercise("Medium excerpt", name: "medium") }
    func testLongShareCancelAndSave() throws { try exercise("Long complete", name: "long") }

    // Run separately after denying photos-add with simctl. Successful length
    // tests are run with photos-add granted; permission state is never faked.
    func testPhotosPermissionDeniedAndSharingRecovery() throws {
        openComposer("Long complete")
        let save = app.buttons["Save to Photos"]
        XCTAssertTrue(save.waitForExistence(timeout: 10))
        save.tap()
        let failed = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "The image was not saved.")).firstMatch
        XCTAssertTrue(failed.waitForExistence(timeout: 20), "Run this case with photos-add denied for com.naamras.shareqa.")
        screenshot("Denied Photos permission gives recoverable message")
        try cancelNativeSharing(name: "denied permission recovery")
        XCTAssertTrue(save.isEnabled)
    }

    private func exercise(_ lengthButton: String, name: String) throws {
        openComposer(lengthButton)
        screenshot("\(name) image ready")
        try cancelNativeSharing(name: name)
        let save = app.buttons["Save to Photos"]
        XCTAssertTrue(save.waitForExistence(timeout: 10))
        XCTAssertTrue(save.isEnabled)
        save.tap()
        let saved = app.staticTexts["Saved to Photos."]
        XCTAssertTrue(saved.waitForExistence(timeout: 25), "Run length cases with photos-add granted for the isolated app.")
        screenshot("\(name) saved to Photos")
    }

    private func openComposer(_ lengthButton: String) {
        let fixtures: [String: (kind: String, count: Int)] = [
            "Short excerpt": ("short", 3),
            "Medium excerpt": ("medium", 7),
            "Long complete": ("long", 13),
        ]
        guard let fixture = fixtures[lengthButton] else {
            XCTFail("Unknown native QA fixture: \(lengthButton)")
            return
        }
        // Match the fixture's accessible name without depending on WebKit's
        // choice of XCUI element type for a particular iOS version.
        let length = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", lengthButton)).firstMatch
        XCTAssertTrue(length.waitForExistence(timeout: 15), app.debugDescription)
        length.tap()
        let selectedPrefix = "Selected \(fixture.kind): \(fixture.count) ordered lines,"
        let selected = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", selectedPrefix)).firstMatch
        let selectedKind = app.staticTexts.matching(NSPredicate(format: "label == %@", fixture.kind)).firstMatch
        let selectedCount = app.staticTexts.matching(NSPredicate(format: "label == %@", String(fixture.count))).firstMatch
        // This WebKit version can expose the live sentence as separate exact
        // kind/count static texts even when React supplies a single text node.
        let selectionConfirmed = NSPredicate { _, _ in
            selected.exists || (selectedKind.exists && selectedCount.exists)
        }
        func waitForSelection(_ timeout: TimeInterval) -> Bool {
            let expectation = XCTNSPredicateExpectation(predicate: selectionConfirmed, object: app)
            return XCTWaiter.wait(for: [expectation], timeout: timeout) == .completed
        }
        if !waitForSelection(3) {
            // A single bounded retry is another actual fixture-button tap;
            // the explicit selected-kind/count assertion remains mandatory.
            length.tap()
        }
        XCTAssertTrue(waitForSelection(15), "The requested \(fixture.kind) fixture must be selected before opening. \(app.debugDescription)")
        app.buttons["Open share composer"].tap()
        let ready = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Image ready.")).firstMatch
        XCTAssertTrue(ready.waitForExistence(timeout: 45), "Current production PNG must decode and paint before delivery.")
        let expectedCoverage = "\(fixture.count) of \(fixture.count) lines in this image"
        let coverage = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", expectedCoverage)).firstMatch
        XCTAssertTrue(coverage.waitForExistence(timeout: 15), "The rendered image must contain the requested fixture's \(fixture.count) lines before delivery. \(app.debugDescription)")
        XCTAssertTrue(app.buttons["Share image"].isEnabled)
    }

    private func cancelNativeSharing(name: String) throws {
        app.buttons["Share image"].tap()
        // This is an observed native activity cell, not the web share button.
        // Save Image can be absent after Photos permission is denied.
        let nativeCopy = app.cells.matching(NSPredicate(format: "label == %@", "Copy")).firstMatch
        XCTAssertTrue(nativeCopy.waitForExistence(timeout: 20), "The real iOS activity sheet must be presented.")
        screenshot("\(name) native activity sheet")
        // The system exposes its own dismissal region. A raw app-coordinate
        // tap can be swallowed during the activity sheet's presentation.
        let dismiss = app.otherElements["PopoverDismissRegion"]
        XCTAssertTrue(dismiss.waitForExistence(timeout: 10), app.debugDescription)
        let backdrop = dismiss.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2))
        let popover = app.popovers.firstMatch
        XCTAssertTrue(popover.exists)
        XCTAssertLessThan(backdrop.screenPoint.y, popover.frame.minY, "The dismissal tap must be outside the observed native sheet.")
        backdrop.tap()
        let closed = NSPredicate(format: "exists == false")
        if XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: closed, object: popover)], timeout: 5) != .completed {
            // One more real dismissal interaction, never a synthetic callback.
            // The callback assertion below still fails if UIKit closes without
            // the production bridge recovering the composer.
            backdrop.tap()
        }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: closed, object: popover)], timeout: 15), .completed, "The native sheet must close before asserting app cancellation.")
        let cancelled = app.staticTexts["Sharing cancelled."]
        XCTAssertTrue(cancelled.waitForExistence(timeout: 15))
        XCTAssertTrue(app.buttons["Share image"].isEnabled)
        screenshot("\(name) sharing cancelled and recovered")
    }

    private func screenshot(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
