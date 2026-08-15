import Capacitor
import CryptoKit
import Foundation

/**
 Single responsibility: own one background URLSession bundle transfer and
 reconnect it to Capacitor after normal iOS suspension or process termination.
 */
final class AsolBackgroundDownloadCoordinator: NSObject, URLSessionDownloadDelegate {
    static let shared = AsolBackgroundDownloadCoordinator()
    static let sessionIdentifier = "hgh.asol.app.ota-background-download"
    private let defaults = UserDefaults.standard
    private var completionHandler: (() -> Void)?
    private lazy var session: URLSession = {
        let configuration = URLSessionConfiguration.background(withIdentifier: Self.sessionIdentifier)
        configuration.sessionSendsLaunchEvents = true
        configuration.isDiscretionary = false
        return URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    }()

    func attach(completionHandler: @escaping () -> Void) {
        self.completionHandler = completionHandler
        _ = session
    }

    func schedule(releaseId: String, url: URL, sha256: String, size: Int64, completion: @escaping ([String: Any]) -> Void) {
        session.getAllTasks { tasks in
            // A single bundle is the transport contract. Cancel any orphaned
            // task from another release before accepting a new one.
            tasks.filter { $0.taskDescription != releaseId }.forEach { $0.cancel() }
            if let existing = tasks.first(where: { $0.taskDescription == releaseId }) {
                completion(self.snapshot(releaseId: releaseId, task: existing))
                return
            }
            if let storedPath = self.defaults.string(forKey: self.pathKey(releaseId)), FileManager.default.fileExists(atPath: storedPath) {
                completion(self.completedSnapshot(releaseId: releaseId, path: storedPath))
                return
            }
            let task = self.session.downloadTask(with: url)
            task.taskDescription = releaseId
            self.defaults.removeObject(forKey: self.errorKey(releaseId))
            self.defaults.set("pending", forKey: self.verificationKey(releaseId))
            self.defaults.set(sha256, forKey: self.hashKey(releaseId))
            self.defaults.set(size, forKey: self.sizeKey(releaseId))
            self.defaults.set(task.taskIdentifier, forKey: self.taskKey(releaseId))
            task.resume()
            completion(self.snapshot(releaseId: releaseId, task: task))
        }
    }

    func status(releaseId: String, completion: @escaping ([String: Any]) -> Void) {
        session.getAllTasks { tasks in
            if let task = tasks.first(where: { $0.taskDescription == releaseId }) {
                completion(self.snapshot(releaseId: releaseId, task: task))
            } else if let path = self.defaults.string(forKey: self.pathKey(releaseId)), FileManager.default.fileExists(atPath: path) {
                completion(self.completedSnapshot(releaseId: releaseId, path: path))
            } else if self.defaults.string(forKey: self.verificationKey(releaseId)) == "failed" {
                completion(self.failedSnapshot(releaseId: releaseId))
            } else {
                completion(["id": "", "releaseId": releaseId, "status": "missing", "bytesDownloaded": 0, "totalBytes": 0])
            }
        }
    }

    func remove(releaseId: String, completion: @escaping () -> Void) {
        session.getAllTasks { tasks in
            tasks.filter { $0.taskDescription == releaseId }.forEach { $0.cancel() }
            if let path = self.defaults.string(forKey: self.pathKey(releaseId)) { try? FileManager.default.removeItem(atPath: path) }
            [self.pathKey(releaseId), self.hashKey(releaseId), self.sizeKey(releaseId), self.taskKey(releaseId), self.verificationKey(releaseId), self.errorKey(releaseId)].forEach { self.defaults.removeObject(forKey: $0) }
            completion()
        }
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        guard let releaseId = downloadTask.taskDescription else { return }
        defaults.set("verifying", forKey: verificationKey(releaseId))
        do {
            let expectedHash = defaults.string(forKey: hashKey(releaseId)) ?? ""
            let expectedSize = Int64(defaults.integer(forKey: sizeKey(releaseId)))
            let attributes = try FileManager.default.attributesOfItem(atPath: location.path)
            let actualSize = (attributes[.size] as? NSNumber)?.int64Value ?? -1
            let handle = try FileHandle(forReadingFrom: location)
            defer { try? handle.close() }
            var hasher = SHA256()
            while let data = try handle.read(upToCount: 64 * 1024), !data.isEmpty {
                hasher.update(data: data)
            }
            let actualHash = hasher.finalize().map { String(format: "%02x", $0) }.joined()
            guard actualSize == expectedSize && actualHash.caseInsensitiveCompare(expectedHash) == .orderedSame else {
                throw NSError(domain: "AsolOTA", code: 1, userInfo: [NSLocalizedDescriptionKey: "OTA bundle checksum mismatch"])
            }
            let root = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
                .appendingPathComponent("AsolOTA", isDirectory: true)
            try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
            let destination = root.appendingPathComponent(releaseId + ".zip")
            try? FileManager.default.removeItem(at: destination)
            try FileManager.default.moveItem(at: location, to: destination)
            defaults.set(destination.path, forKey: pathKey(releaseId))
            defaults.set("completed", forKey: verificationKey(releaseId))
            defaults.removeObject(forKey: errorKey(releaseId))
        } catch {
            try? FileManager.default.removeItem(at: location)
            defaults.set("failed", forKey: verificationKey(releaseId))
            defaults.set(error.localizedDescription, forKey: errorKey(releaseId))
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let error, let releaseId = task.taskDescription else { return }
        defaults.set("failed", forKey: verificationKey(releaseId))
        defaults.set(error.localizedDescription, forKey: errorKey(releaseId))
    }

    func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        DispatchQueue.main.async { self.completionHandler?(); self.completionHandler = nil }
    }

    private func snapshot(releaseId: String, task: URLSessionTask) -> [String: Any] {
        let state: String
        switch task.state {
        case .running: state = "downloading"
        case .suspended: state = "pending"
        case .completed:
            let verification = defaults.string(forKey: verificationKey(releaseId))
            if verification == "completed" { state = "completed" }
            else if verification == "failed" { state = "failed" }
            else { state = "verifying" }
        default: state = "failed"
        }
        var value: [String: Any] = [
            "id": String(task.taskIdentifier), "releaseId": releaseId, "status": state,
            "bytesDownloaded": max(task.countOfBytesReceived, 0),
            "totalBytes": task.countOfBytesExpectedToReceive > 0 ? task.countOfBytesExpectedToReceive : defaults.object(forKey: sizeKey(releaseId)) as? Int64 ?? 0,
        ]
        if let path = defaults.string(forKey: pathKey(releaseId)) { value["filePath"] = path }
        if let error = defaults.string(forKey: errorKey(releaseId)) { value["error"] = error }
        return value
    }

    private func completedSnapshot(releaseId: String, path: String) -> [String: Any] {
        let attributes = try? FileManager.default.attributesOfItem(atPath: path)
        let size = (attributes?[.size] as? NSNumber)?.int64Value ?? 0
        let expected = defaults.object(forKey: sizeKey(releaseId)) == nil
            ? size
            : Int64(defaults.integer(forKey: sizeKey(releaseId)))
        let verification = defaults.string(forKey: verificationKey(releaseId))
        if verification == "failed" { return failedSnapshot(releaseId: releaseId) }
        if verification != "completed" {
            return ["id": String(defaults.integer(forKey: taskKey(releaseId))), "releaseId": releaseId, "status": "verifying", "bytesDownloaded": size, "totalBytes": expected]
        }
        return ["id": String(defaults.integer(forKey: taskKey(releaseId))), "releaseId": releaseId, "status": "completed", "bytesDownloaded": size, "totalBytes": expected, "filePath": path]
    }

    private func failedSnapshot(releaseId: String) -> [String: Any] {
        return ["id": String(defaults.integer(forKey: taskKey(releaseId))), "releaseId": releaseId, "status": "failed", "bytesDownloaded": 0, "totalBytes": defaults.integer(forKey: sizeKey(releaseId)), "error": defaults.string(forKey: errorKey(releaseId)) ?? "OTA bundle verification failed"]
    }

    private func pathKey(_ id: String) -> String { "asol.ota.\(id).path" }
    private func hashKey(_ id: String) -> String { "asol.ota.\(id).sha256" }
    private func sizeKey(_ id: String) -> String { "asol.ota.\(id).size" }
    private func taskKey(_ id: String) -> String { "asol.ota.\(id).task" }
    private func errorKey(_ id: String) -> String { "asol.ota.\(id).error" }
    private func verificationKey(_ id: String) -> String { "asol.ota.\(id).verification" }
}

@objc(BackgroundDownloadPlugin)
public class BackgroundDownloadPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BackgroundDownloadPlugin"
    public let jsName = "BackgroundDownload"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
    ]

    @objc func schedule(_ call: CAPPluginCall) {
        guard let releaseId = call.getString("releaseId"), releaseId.range(of: "^[A-Za-z0-9._-]{1,160}$", options: .regularExpression) != nil,
              let urlString = call.getString("url"), let url = URL(string: urlString), url.scheme == "https",
              let sha256 = call.getString("sha256"), sha256.range(of: "^[a-fA-F0-9]{64}$", options: .regularExpression) != nil,
              let size = call.getInt("size"), size > 0 else { call.reject("Invalid background download request"); return }
        AsolBackgroundDownloadCoordinator.shared.schedule(releaseId: releaseId, url: url, sha256: sha256, size: Int64(size)) { call.resolve($0) }
    }

    @objc func status(_ call: CAPPluginCall) {
        guard let releaseId = call.getString("releaseId"), releaseId.range(of: "^[A-Za-z0-9._-]{1,160}$", options: .regularExpression) != nil else { call.reject("Invalid release id"); return }
        AsolBackgroundDownloadCoordinator.shared.status(releaseId: releaseId) { call.resolve($0) }
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let releaseId = call.getString("releaseId"), releaseId.range(of: "^[A-Za-z0-9._-]{1,160}$", options: .regularExpression) != nil else { call.reject("Invalid release id"); return }
        AsolBackgroundDownloadCoordinator.shared.remove(releaseId: releaseId) { call.resolve() }
    }
}
