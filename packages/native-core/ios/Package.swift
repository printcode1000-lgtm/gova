// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AsolNativeCore",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "AsolNativeCore",
            targets: ["AsolNativeCore"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.0")
    ],
    targets: [
        .target(
            name: "AsolNativeCore",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm")
            ],
            path: "Sources/AsolNativeCore"
        ),
        .testTarget(
            name: "AsolNativeCoreTests",
            dependencies: ["AsolNativeCore"],
            path: "Tests/AsolNativeCoreTests"
        )
    ]
)
