package hgh.asol.app;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Opens only this application's Android settings screen. */
@CapacitorPlugin(name = "AppSettings")
public class AppSettingsPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        try {
            Intent intent = new Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.fromParts("package", getContext().getPackageName(), null)
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to open application settings", error);
        }
    }
}
