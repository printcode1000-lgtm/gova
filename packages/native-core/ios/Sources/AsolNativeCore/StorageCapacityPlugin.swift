import Foundation
import Capacitor

@objc(StorageCapacityPlugin)
public class StorageCapacityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StorageCapacityPlugin"
    public let jsName = "StorageCapacity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getFreeSpace", returnType: CAPPluginReturnPromise)
    ]

    @objc public func getFreeSpace(_ call: CAPPluginCall) {
        do {
            let home = URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true)
            let values = try home.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
            guard let availableBytes = values.volumeAvailableCapacityForImportantUsage else {
                call.unavailable("Available storage is not reported by this volume")
                return
            }
            call.resolve(["availableBytes": NSNumber(value: availableBytes)])
        } catch {
            call.reject("Unable to measure available storage", nil, error)
        }
    }
}
