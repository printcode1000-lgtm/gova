import MobileCoreServices
import Social
import UIKit
import UniformTypeIdentifiers

/// Receives content from the iOS share sheet and hands it to the main app.
///
/// Single responsibility: read the extension's input items, copy each payload
/// into the shared App Group container, and record a manifest the main app
/// drains on launch. It performs no validation beyond a size cap and never
/// uploads anything — the TypeScript Share module owns that policy.
///
/// REQUIRES manual Xcode setup (see doc: native-platform.md):
///   1. Add a "Share Extension" target named `ShareExtension`.
///   2. Enable the App Group `group.hgh.asol.app` on BOTH the app and the
///      extension targets.
///   3. Replace the generated ShareViewController.swift with this file.
class ShareViewController: UIViewController {

    /// Must match the App Group configured on both targets.
    private let appGroupId = "group.hgh.asol.app"

    /// Mirrors MAX_RECEIVED_BYTES in the TypeScript Share module.
    private let maxBytes = 25 * 1024 * 1024

    private let inboxDirectoryName = "ShareInbox"
    private let manifestFileName = "pending.json"

    override func viewDidLoad() {
        super.viewDidLoad()
        handleInputItems()
    }

    private func handleInputItems() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        let group = DispatchGroup()
        var collected: [[String: Any]] = []
        let lock = NSLock()

        for item in items {
            for provider in item.attachments ?? [] {
                group.enter()
                load(provider: provider) { payload in
                    if let payload {
                        lock.lock()
                        collected.append(payload)
                        lock.unlock()
                    }
                    group.leave()
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            self?.persist(collected)
            self?.openHostApp()
            self?.finish()
        }
    }

    private func load(
        provider: NSItemProvider,
        completion: @escaping ([String: Any]?) -> Void
    ) {
        if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { value, _ in
                guard let url = value as? URL else { return completion(nil) }
                completion(["type": "url", "value": url.absoluteString])
            }
            return
        }

        if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { value, _ in
                guard let text = value as? String else { return completion(nil) }
                completion(["type": "text", "value": text])
            }
            return
        }

        // Everything else is treated as a file-backed payload.
        let fileTypes = [
            UTType.image.identifier,
            UTType.pdf.identifier,
            UTType.item.identifier,
        ]

        guard let matched = fileTypes.first(where: provider.hasItemConformingToTypeIdentifier) else {
            return completion(nil)
        }

        provider.loadItem(forTypeIdentifier: matched, options: nil) { [weak self] value, _ in
            guard let self else { return completion(nil) }

            var data: Data?
            var fileName = "shared-\(Int(Date().timeIntervalSince1970))"
            var mimeType = "application/octet-stream"

            if let url = value as? URL {
                data = try? Data(contentsOf: url)
                fileName = url.lastPathComponent
                mimeType = self.mimeType(for: url.pathExtension)
            } else if let image = value as? UIImage {
                data = image.jpegData(compressionQuality: 0.9)
                fileName += ".jpg"
                mimeType = "image/jpeg"
            } else if let raw = value as? Data {
                data = raw
            }

            guard let payload = data, payload.count > 0, payload.count <= self.maxBytes else {
                return completion(nil)
            }

            guard let storedName = self.writeToInbox(data: payload, fileName: fileName) else {
                return completion(nil)
            }

            completion([
                "type": "file",
                "name": fileName,
                "mimeType": mimeType,
                "file": storedName,
            ])
        }
    }

    /// Persist bytes into the App Group container shared with the main app.
    private func writeToInbox(data: Data, fileName: String) -> String? {
        guard let container = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
            return nil
        }

        let inbox = container.appendingPathComponent(inboxDirectoryName, isDirectory: true)
        try? FileManager.default.createDirectory(at: inbox, withIntermediateDirectories: true)

        let unique = "\(Int(Date().timeIntervalSince1970 * 1000))-\(UUID().uuidString)-\(fileName)"
        let target = inbox.appendingPathComponent(unique)

        do {
            try data.write(to: target, options: .atomic)
            return unique
        } catch {
            return nil
        }
    }

    /// Append the collected payloads to the manifest the main app reads.
    private func persist(_ items: [[String: Any]]) {
        guard !items.isEmpty,
              let container = FileManager.default
                .containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
            return
        }

        let manifestUrl = container.appendingPathComponent(manifestFileName)
        var existing: [[String: Any]] = []

        if let data = try? Data(contentsOf: manifestUrl),
           let decoded = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            existing = decoded
        }

        existing.append(contentsOf: items)

        if let encoded = try? JSONSerialization.data(withJSONObject: existing) {
            try? encoded.write(to: manifestUrl, options: .atomic)
        }
    }

    /// Bring the main app forward so it can drain the manifest immediately.
    private func openHostApp() {
        guard let url = URL(string: "asol://share") else { return }
        var responder: UIResponder? = self
        while let current = responder {
            if let application = current as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = current.next
        }
    }

    private func mimeType(for pathExtension: String) -> String {
        guard let type = UTType(filenameExtension: pathExtension),
              let mime = type.preferredMIMEType else {
            return "application/octet-stream"
        }
        return mime
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
}
