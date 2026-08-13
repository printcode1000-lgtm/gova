package hgh.asol.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registered before super.onCreate so the plugin can inspect the
        // launch intent that started this activity from the share sheet.
        registerPlugin(ShareReceivePlugin.class);
        registerPlugin(BackgroundDownloadPlugin.class);
        registerPlugin(StorageCapacityPlugin.class);
        registerPlugin(AppSettingsPlugin.class);
        registerPlugin(AsolNotificationInboxPlugin.class);
        super.onCreate(savedInstanceState);

        // A cold start from a notification tap arrives here, long before the
        // WebView exists. The pointer is read out of the launch Intent and
        // committed synchronously to app-private preferences, so it survives
        // both Activity and process recreation and can be replayed until the web
        // layer has actually written the notification to IndexedDB.
        AsolNotificationTapProtocol.capture(this, getIntent());

        // Channels are created here, at UI startup, before any permission dialog
        // and without waiting for the WebView. Creating a channel posts nothing
        // and needs no grant; it only declares what the settings screen lists.
        //
        // A failure must not keep the activity from launching, but it is not
        // swallowed either: it is logged at error level, and push initialization
        // retries the same call through AsolNotificationInbox.ensureChannels().
        // That retry is what registration waits on, so a device whose channels
        // are missing never reaches FCM.
        try {
            AsolNotificationChannels.ensureCreated(this);
        } catch (RuntimeException error) {
            Log.e(
                "AsolNotifications",
                "Notification channels could not be created at startup; "
                    + "push initialization will retry before any registration.",
                error
            );
        }
    }

    /**
     * The activity is `singleTask`, so a share or a notification tap arriving
     * while ASOL is already running is delivered here instead of through
     * onCreate.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        if (getBridge() == null) {
            // No bridge yet: the tap is still captured, so the web layer picks
            // it up through getPendingTap() once it boots.
            AsolNotificationTapProtocol.capture(this, intent);
            return;
        }
        PluginHandle shareHandle = getBridge().getPlugin("ShareReceive");
        if (shareHandle != null) {
            Plugin instance = shareHandle.getInstance();
            if (instance instanceof ShareReceivePlugin) {
                ((ShareReceivePlugin) instance).onNewIntentReceived(intent);
            }
        }

        PluginHandle inboxHandle = getBridge().getPlugin("AsolNotificationInbox");
        if (inboxHandle != null) {
            Plugin instance = inboxHandle.getInstance();
            if (instance instanceof AsolNotificationInboxPlugin) {
                ((AsolNotificationInboxPlugin) instance).onNewIntentReceived(intent);
            }
        } else {
            AsolNotificationTapProtocol.capture(this, intent);
        }
    }

    /**
     * Who presents a foreground push.
     *
     * While the activity is resumed the WebView shows the banner, with the
     * dismissed-notification check and the data-only suppression the module
     * already applies. The native push service reads this flag to stay quiet in
     * that window; posting from both would ring every foreground push twice.
     */
    @Override
    public void onResume() {
        super.onResume();
        AsolAppLifecycle.setForeground(true);
    }

    @Override
    public void onPause() {
        AsolAppLifecycle.setForeground(false);
        super.onPause();
    }
}
