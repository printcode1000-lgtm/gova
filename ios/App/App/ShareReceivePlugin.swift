import Capacitor
import Foundation

/// Bridges content received by the Share Extension into the web layer.
///
/// Single responsibility: drain the App Group manifest the extension wrote,
/// convert each entry into a JSON payload, and deliver it to JavaScript. All
/// validation and queueing live in the TypeScript Share module.
///
/// REQUIRES manual Xcode setup (see doc: native-platform.md):
///   1. Add this file to the App target.
///   2. Enable the App Group `group.hgh.asol.app` on the App target.
///   3. Register the plugin in AppDelegate or via the Capacitor plugin list.
@objc(ShareReceivePlugin)
public class ShareReceivePlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "ShareReceivePlugin"
    public let jsName = "ShareReceive"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPendingItems", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearPendingItems", returnType: CAPPluginReturnPromise),
    ]

    /// Must match the App Group on both the app and the extension.
    private let appGroupId = "group.hgh.asol.app"
    private let inboxDirectoryName = "ShareInbox"
    private let manifestFileName = "pending.json"

    public override func load() {
        // A share that launched the app is already on disk; deliver it as soon
        // as the WebView attaches, and again whenever the app returns to the
        // foreground after the extension ran.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        deliverPending()
    }

    @objc private func handleDidBecomeActive() {
        deliverPending()
    }

    @objc func getPendingItems(_ call: CAPPluginCall) {
        call.resolve(["items": readManifest()])
    }

    @objc func clearPendingItems(_ call: CAPPluginCall) {
        clearManifest()
        call.resolve()
    }

    private func deliverPending() {
        let items = readManifest()
        guard !items.isEmpty else { return }

        for item in items {
            notifyListeners("shareReceived", data: item, retainUntilConsumed: true)
        }
        clearManifest()
    }

    /// Read the manifest and inline each file's bytes as base64.
    private func readManifest() -> [[String: Any]] {
        guard let container = containerUrl() else { return [] }

        let manifestUrl = container.appendingPathComponent(manifestFileName)
        guard let data = try? Data(contentsOf: manifestUrl),
              let entries = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            return []
        }

        let inbox = container.appendingPathComponent(inboxDirectoryName, isDirectory: true)
        var payloads: [[String: Any]] = []

        for entry in entries {
            let type = entry["type"] as? String ?? ""

            if type == "url" || type == "text" {
                guard let value = entry["value"] as? String, !value.isEmpty else { continue }
                payloads.append(["type": type, "value": value])
                continue
            }

            guard let storedName = entry["file"] as? String else { continue }
            let fileUrl = inbox.appendingPathComponent(storedName)
            guard let bytes = try? Data(contentsOf: fileUrl) else { continue }

            payloads.append([
                "type": "file",
                "name": entry["name"] as? String ?? storedName,
                "mimeType": entry["mimeType"] as? String ?? "application/octet-stream",
                "data": bytes.base64EncodedString(),
            ])
        }

        return payloads
    }

    /// Remove the manifest and every file it referenced.
    private func clearManifest() {
        guard let container = containerUrl() else { return }

        let manifestUrl = container.appendingPathComponent(manifestFileName)
        try? FileManager.default.removeItem(at: manifestUrl)

        let inbox = container.appendingPathComponent(inboxDirectoryName, isDirectory: true)
        if let contents = try? FileManager.default.contentsOfDirectory(
            at: inbox,
            includingPropertiesForKeys: nil
        ) {
            for file in contents {
                try? FileManager.default.removeItem(at: file)
            }
        }
    }

    private func containerUrl() -> URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}
