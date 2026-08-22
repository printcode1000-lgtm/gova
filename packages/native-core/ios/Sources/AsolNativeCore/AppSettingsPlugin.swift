import Foundation
import UIKit
import Capacitor

/// Opens only this application's iOS settings screens.
///
/// iOS exposes two official destinations and nothing in between:
/// `openNotificationSettings` (iOS 16, and its pre-renamed constant on 15.4)
/// lands on this app's Notifications page; `openSettings` lands on the app's
/// own settings page, which is the closest official fallback on iOS 15.0–15.3
/// and whenever the notifications URL cannot be opened.
@objc(AppSettingsPlugin)
public class AppSettingsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppSettingsPlugin"
    public let jsName = "AppSettings"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openNotifications", returnType: CAPPluginReturnPromise)
    ]

    private enum Target: String {
        case notifications
        case appDetails
    }

    @objc public func open(_ call: CAPPluginCall) {
        openAppSettings(call)
    }

    @objc public func openNotifications(_ call: CAPPluginCall) {
        let notificationsURLString: String?
        if #available(iOS 16.0, *) {
            notificationsURLString = UIApplication.openNotificationSettingsURLString
        } else if #available(iOS 15.4, *) {
            notificationsURLString = UIApplicationOpenNotificationSettingsURLString
        } else {
            notificationsURLString = nil
        }

        guard let urlString = notificationsURLString, let url = URL(string: urlString) else {
            openAppSettings(call)
            return
        }

        openURL(url, target: .notifications, call: call) { [weak self] in
            // An OEM-free platform still refuses the URL on some builds; the
            // app's own settings page is the closest official destination.
            self?.openAppSettings(call)
        }
    }

    private func openAppSettings(_ call: CAPPluginCall) {
        guard let url = URL(string: UIApplication.openSettingsURLString) else {
            call.reject("Unable to open application settings")
            return
        }
        openURL(url, target: .appDetails, call: call) {
            call.reject("Unable to open application settings")
        }
    }

    private func openURL(
        _ url: URL,
        target: Target,
        call: CAPPluginCall,
        onFailure: @escaping () -> Void
    ) {
        DispatchQueue.main.async {
            let application = UIApplication.shared
            guard application.canOpenURL(url) else {
                onFailure()
                return
            }
            application.open(url, options: [:]) { opened in
                if opened {
                    call.resolve(["opened": true, "target": target.rawValue])
                } else {
                    onFailure()
                }
            }
        }
    }
}
