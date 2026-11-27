import XCTest

/// Taps through the demo app the way a person would:
/// app list → Tasks → first open task → toggle Done → Delete (confirm) → back on the task list.
///
/// Needs the proxy running at the app's BRIDGE_BASE_URL with a fresh demo store
/// (the demo store resets when the proxy restarts). The test deletes one task.
final class DemoFlowUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    func testDemoClickThrough() {
        // 1. App list: the proxy's /apps response, rendered natively.
        let tasksApp = element(containing: "Tasks")
        XCTAssertTrue(tasksApp.waitForExistence(timeout: 15), "App list did not load from the proxy")
        snapshot("1-app-list")
        tasksApp.tap()

        // 2. Demo home screen: find the first open task row.
        let taskRow = element(containing: "Revise GS2 polity notes")
        XCTAssertTrue(taskRow.waitForExistence(timeout: 15), "Demo home screen did not load")
        snapshot("2-home")
        taskRow.tap()

        // 3. Task detail: flip the Done toggle. The proxy answers with a toast and the screen refreshes.
        let toggle = app.switches.firstMatch
        XCTAssertTrue(toggle.waitForExistence(timeout: 15), "Task detail did not load")
        snapshot("3-detail")
        toggle.tap()
        XCTAssertTrue(element(containing: "Marked done").waitForExistence(timeout: 10), "No toast after toggling")
        snapshot("4-toggled")

        // 4. Delete asks for confirmation first, then pops back to the list.
        let delete = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "Delete")).firstMatch
        XCTAssertTrue(delete.waitForExistence(timeout: 5))
        delete.tap()
        let confirm = app.buttons["Confirm"]
        XCTAssertTrue(confirm.waitForExistence(timeout: 5), "No confirmation before deleting")
        snapshot("5-confirm")
        confirm.tap()

        // 5. Back on the home screen, and the task is gone.
        XCTAssertTrue(element(containing: "Read The Hindu editorial").waitForExistence(timeout: 15),
                      "Did not return to the task list after deleting")
        XCTAssertFalse(element(containing: "Revise GS2 polity notes").exists, "Deleted task is still listed")
        snapshot("6-after-delete")
    }

    /// Any element whose label contains `text`. Rows and buttons combine their texts into one label.
    private func element(containing text: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] %@", text)).firstMatch
    }

    private func snapshot(_ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }
}
