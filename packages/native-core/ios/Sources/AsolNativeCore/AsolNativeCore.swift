import Foundation
import UIKit
import Capacitor

/**
 * Single entry point for native iOS lifecycle and background coordinator delegation.
 * Mirrors AsolNativeCore.java on Android.
 */
public final class AsolNativeCore {

    public static let shared = AsolNativeCore()

    private init() {}

    public func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) {
        NativeCrashReporter.install()
    }

    public func handleEventsForBackgroundURLSession(
        identifier: String,
        completionHandler: @escaping () -> Void
    ) -> Bool {
        if identifier == AsolBackgroundDownloadCoordinator.sessionIdentifier {
            AsolBackgroundDownloadCoordinator.shared.attach(completionHandler: completionHandler)
            return true
        }
        return false
    }
}
