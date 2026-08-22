package hgh.asol.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Opens only this application's Android settings screens. */
@CapacitorPlugin(name = "AppSettings")
public class AppSettingsPlugin extends Plugin {
    private static final String TARGET_NOTIFICATIONS = "notifications";
    private static final String TARGET_APP_DETAILS = "appDetails";

    @PluginMethod
    public void open(PluginCall call) {
        try {
            launch(applicationDetailsIntent());
            call.resolve(result(TARGET_APP_DETAILS));
        } catch (Exception error) {
            call.reject("Unable to open application settings", error);
        }
    }

    /**
     * This application's notification settings screen.
     *
     * ACTION_APP_NOTIFICATION_SETTINGS is the official route and exists from
     * API 26. Below that — and on any OEM build whose Settings app does not
     * answer the intent — the closest official destination is this
     * application's details screen, which carries the notification entry.
     */
    @PluginMethod
    public void openNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                launch(intent);
                call.resolve(result(TARGET_NOTIFICATIONS));
                return;
            } catch (ActivityNotFoundException notFound) {
                // Fall through to the application details screen below.
            } catch (Exception error) {
                call.reject("Unable to open notification settings", error);
                return;
            }
        }

        try {
            launch(applicationDetailsIntent());
            call.resolve(result(TARGET_APP_DETAILS));
        } catch (Exception error) {
            call.reject("Unable to open application settings", error);
        }
    }

    private Intent applicationDetailsIntent() {
        Intent intent = new Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.fromParts("package", getContext().getPackageName(), null)
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return intent;
    }

    private void launch(Intent intent) {
        getContext().startActivity(intent);
    }

    private JSObject result(String target) {
        JSObject value = new JSObject();
        value.put("opened", true);
        value.put("target", target);
        return value;
    }
}
