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
        super.onCreate(savedInstanceState);
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
