import XCTest
@testable import AsolNativeCore

final class AsolNativeCoreTests: XCTestCase {

    func testSharedInstanceExists() {
        XCTAssertNotNil(AsolNativeCore.shared)
    }

    func testBackgroundDownloadCoordinatorSessionId() {
        XCTAssertEqual(
            AsolBackgroundDownloadCoordinator.sessionIdentifier,
            "hgh.asol.app.background-download"
        )
    }
}
