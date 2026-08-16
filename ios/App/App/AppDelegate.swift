import UIKit
import Capacitor
import AsolNativeCore
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure Firebase before native core and Capacitor plugins initialize so
        // FirebaseMessaging is ready when remote notification registration completes.
        FirebaseApp.configure()
        Messaging.messaging().delegate = self

        AsolNativeCore.shared.application(application, didFinishLaunchingWithOptions: launchOptions)
        return true
    }

    func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String, completionHandler: @escaping () -> Void) {
        if !AsolNativeCore.shared.handleEventsForBackgroundURLSession(identifier: identifier, completionHandler: completionHandler) {
            completionHandler()
        }
    }

    // Hand the raw APNs token to Firebase, then post the FCM token that Firebase
    // returns for it.
    //
    // The post has to answer registerForRemoteNotifications() rather than Firebase's
    // own timing. NativePushService.register() attaches its token listener and then
    // waits 20 seconds; Firebase, by contrast, hands back a cached token immediately
    // after configure() — before the Capacitor bridge exists, before the plugin has
    // registered its NotificationCenter observer, and before JavaScript is listening.
    // A token posted then is dropped, and the APNs token is unchanged on the next
    // register(), so didReceiveRegistrationToken never fires again and the wait times
    // out. Asking Firebase for the token here puts the post back inside the window
    // the caller is actually waiting on.
    //
    // The raw Data is deliberately never posted: Capacitor hex-encodes Data, and the
    // web layer classifies a 64-hex string as an APNs token and routes it to the
    // direct APNs transport, which is unconfigured.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        Messaging.messaging().token { token, error in
            DispatchQueue.main.async {
                if let token = token, !token.isEmpty {
                    NotificationCenter.default.post(
                        name: .capacitorDidRegisterForRemoteNotifications,
                        object: token
                    )
                } else {
                    NotificationCenter.default.post(
                        name: .capacitorDidFailToRegisterForRemoteNotifications,
                        object: error ?? NSError(
                            domain: "AsolPush",
                            code: -1,
                            userInfo: [NSLocalizedDescriptionKey: "Firebase returned no registration token."]
                        )
                    )
                }
            }
        }
    }

    // Firebase token rotation.
    //
    // This fires whenever Firebase mints a new token, including at launch with a
    // cached one. It is kept because a rotation that happens while the app is running
    // and listening should reach the web layer, but it is NOT the path register()
    // depends on — see the comment above.
    //
    // Known gap, deliberately not solved here: NativePushService.ensureListeners()
    // attaches only the received/action listeners, so there is no permanent
    // onPushToken subscriber. A rotation arriving outside a register() call is
    // therefore observed by nobody, and the server keeps the previous token until the
    // device next registers. Closing that needs a change inside the notifications
    // module and is out of scope for this task.
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken, !fcmToken.isEmpty else { return }
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: fcmToken
        )
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
