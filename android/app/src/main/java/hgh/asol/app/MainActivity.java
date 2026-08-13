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
     * The activity is `singleTask`, so a share arriving while ASOL is already
     * running is delivered here instead of through onCreate.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        if (getBridge() == null) {
            return;
        }
        PluginHandle handle = getBridge().getPlugin("ShareReceive");
        if (handle == null) {
            return;
        }
        Plugin instance = handle.getInstance();
        if (instance instanceof ShareReceivePlugin) {
            ((ShareReceivePlugin) instance).onNewIntentReceived(intent);
        }
    }
}
