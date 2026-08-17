import Foundation
import Capacitor
import WebKit

final class NativeCrashStore {
    static let shared = NativeCrashStore()
    private var pending: [[String: String]] = []
    private let lock = NSLock()

    func enqueue(_ payload: [String: String]) {
        lock.lock()
        pending.append(payload)
        lock.unlock()
    }

    func drain() -> [[String: String]] {
        lock.lock()
        defer { lock.unlock() }
        let copy = pending
        pending.removeAll()
        return copy
    }
}

@objc(NativeCrashPlugin)
public class NativeCrashPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeCrashPlugin"
    public let jsName = "NativeCrash"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "reportTestCrash", returnType: CAPPluginReturnPromise),
    ]

    private static weak var instance: NativeCrashPlugin?

    public override func load() {
        NativeCrashPlugin.instance = self
        NativeCrashReporter.install()
        dispatchPending()
    }

    @objc func reportTestCrash(_ call: CAPPluginCall) {
        NativeCrashReporter.record(
            operation: "plugin-test",
            name: "RuntimeError",
            message: "Native crash test payload",
            stack: Thread.callStackSymbols.joined(separator: "\n")
        )
        call.resolve()
    }

    static func dispatchPayload(_ payload: [String: String]) {
        guard let plugin = instance else {
            NativeCrashStore.shared.enqueue(payload)
            return
        }
        plugin.dispatch(payload)
    }

    private func dispatchPending() {
        for payload in NativeCrashStore.shared.drain() {
            dispatch(payload)
        }
    }

    private func dispatch(_ payload: [String: String]) {
        guard let webView = bridge?.webView else {
            NativeCrashStore.shared.enqueue(payload)
            return
        }
        guard
            let data = try? JSONSerialization.data(withJSONObject: payload),
            let json = String(data: data, encoding: .utf8)
        else {
            return
        }
        let script =
            "window.dispatchEvent(new CustomEvent('asol:native-crash', { detail: \(json) }));"
        DispatchQueue.main.async {
            webView.evaluateJavaScript(script, completionHandler: nil)
        }
    }
}

enum NativeCrashReporter {
    private static var installed = false
    private static var previousHandler: (@convention(c) (NSException) -> Void)?

    static func install() {
        guard !installed else { return }
        installed = true
        previousHandler = NSGetUncaughtExceptionHandler()
        NSSetUncaughtExceptionHandler { exception in
            record(
                operation: "uncaught-exception",
                name: exception.name.rawValue,
                message: exception.reason ?? "Native crash",
                stack: exception.callStackSymbols.joined(separator: "\n")
            )
            if let previousHandler {
                previousHandler(exception)
            }
        }
    }

    static func record(operation: String, name: String, message: String, stack: String) {
        let payload: [String: String] = [
            "name": name,
            "message": message,
            "operation": operation,
            "stack": stack,
        ]
        NativeCrashPlugin.dispatchPayload(payload)
    }
}
