package hgh.asol.app;

import android.content.Intent;
import android.util.Log;
import androidx.appcompat.app.AppCompatActivity;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;

/**
 * Single entry point for native Android lifecycle delegates.
 * Keeps the host BridgeActivity as a thin coordinator while encapsulating
 * startup channel setup, plugin registration, tap capture, and lifecycle events.
 */
public final class AsolNativeCore {

    private static final String TAG = "AsolNativeCore";

    private AsolNativeCore() {}

    public static void onPreCreate(BridgeActivity activity) {
        // Registered before super.onCreate so plugins can inspect the launch intent
        activity.registerPlugin(ShareReceivePlugin.class);
        activity.registerPlugin(BackgroundDownloadPlugin.class);
        activity.registerPlugin(StorageCapacityPlugin.class);
        activity.registerPlugin(AppSettingsPlugin.class);
        activity.registerPlugin(AsolNotificationInboxPlugin.class);
        activity.registerPlugin(NativeCrashPlugin.class);
        NativeCrashReporter.install();
    }

    public static void onPostCreate(AppCompatActivity activity, Intent intent) {
        // Cold start notification tap capture before WebView exists
        AsolNotificationTapProtocol.capture(activity, intent);

        // Pre-JS notification channel creation (§10.1)
        try {
            AsolNotificationChannels.ensureCreated(activity);
        } catch (RuntimeException error) {
            Log.e(
                TAG,
                "Notification channels could not be created at startup; "
                    + "push initialization will retry before any registration.",
                error
            );
        }
    }

    public static void onNewIntent(AppCompatActivity activity, Bridge bridge, Intent intent) {
        if (bridge == null) {
            AsolNotificationTapProtocol.capture(activity, intent);
            return;
        }

        PluginHandle shareHandle = bridge.getPlugin("ShareReceive");
        if (shareHandle != null) {
            Plugin instance = shareHandle.getInstance();
            if (instance instanceof ShareReceivePlugin) {
                ((ShareReceivePlugin) instance).onNewIntentReceived(intent);
            }
        }

        PluginHandle inboxHandle = bridge.getPlugin("AsolNotificationInbox");
        if (inboxHandle != null) {
            Plugin instance = inboxHandle.getInstance();
            if (instance instanceof AsolNotificationInboxPlugin) {
                ((AsolNotificationInboxPlugin) instance).onNewIntentReceived(intent);
            }
        } else {
            AsolNotificationTapProtocol.capture(activity, intent);
        }
    }

    public static void onResume() {
        AsolAppLifecycle.setForeground(true);
    }

    public static void onPause() {
        AsolAppLifecycle.setForeground(false);
    }
}
