package hgh.asol.app;

import android.content.Intent;
import android.os.Bundle;

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
        // Create every notification channel before the WebView, session, or
        // push registration starts. FCM can then resolve its channel even when
        // the process is later killed, and the explicit R.raw reference keeps
        // the custom sound in resource-shrunk Release builds.
        AsolNotificationChannels.ensureCreated(this);
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
