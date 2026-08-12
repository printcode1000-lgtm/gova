package hgh.asol.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Returns Android tray notifications without dropping their tag or channel. */
@CapacitorPlugin(name = "AsolNotificationInbox")
public class AsolNotificationInboxPlugin extends Plugin {
    @PluginMethod
    public void getDelivered(PluginCall call) {
        JSArray items = new JSArray();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            JSObject result = new JSObject();
            result.put("notifications", items);
            call.resolve(result);
            return;
        }

        NotificationManager manager = getContext().getSystemService(NotificationManager.class);
        if (manager != null) {
            for (StatusBarNotification status : manager.getActiveNotifications()) {
                Notification notification = status.getNotification();
                if ((notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) continue;
                items.put(toJson(status, notification));
            }
        }
        JSObject result = new JSObject();
        result.put("notifications", items);
        call.resolve(result);
    }

    private JSObject toJson(StatusBarNotification status, Notification notification) {
        Bundle extras = notification.extras;
        String tag = clean(status.getTag());
        String channelId = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? clean(notification.getChannelId()) : "";
        String title = text(extras, Notification.EXTRA_TITLE);
        String body = text(extras, Notification.EXTRA_BIG_TEXT);
        if (body.isEmpty()) body = text(extras, Notification.EXTRA_TEXT);

        JSObject data = new JSObject();
        data.put("notificationId", tag.isEmpty() ? "android:" + status.getId() : tag);
        data.put("dedupeKey", tag.isEmpty() ? "android:" + status.getId() : tag);
        java.text.SimpleDateFormat format = new java.text.SimpleDateFormat(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US
        );
        format.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        data.put("createdAt", format.format(new java.util.Date(status.getPostTime())));
        data.put("routeHref", "/notifications");
        applyChannelSemantics(data, channelId);
        if (tag.startsWith("notification-test:")) {
            data.put("meta_notificationTest", "true");
            data.put("meta_source", "super_admin_notification_test");
            data.put("meta_notificationTestScenario", scenarioForChannel(channelId));
        }

        JSObject item = new JSObject();
        item.put("id", tag.isEmpty() ? String.valueOf(status.getId()) : tag);
        item.put("tag", tag);
        item.put("channelId", channelId);
        item.put("title", title);
        item.put("body", body);
        item.put("data", data);
        return item;
    }

    private void applyChannelSemantics(JSObject data, String channelId) {
        String category = "system";
        String priority = "normal";
        String sound = "default";
        if (AsolNotificationChannels.ORDERS.equals(channelId)) {
            category = "orders"; priority = "high";
        } else if (AsolNotificationChannels.CHAT.equals(channelId)) {
            category = "chat"; priority = "high";
        } else if (AsolNotificationChannels.URGENT.equals(channelId)) {
            priority = "critical"; sound = "urgent";
        } else if (AsolNotificationChannels.SILENT.equals(channelId)) {
            priority = "low"; sound = "silent";
        }
        data.put("category", category);
        data.put("priority", priority);
        data.put("sound", sound);
        data.put("meta_androidChannelId", channelId);
    }

    private String scenarioForChannel(String channelId) {
        if (AsolNotificationChannels.ORDERS.equals(channelId)) return "orders";
        if (AsolNotificationChannels.CHAT.equals(channelId)) return "chat";
        if (AsolNotificationChannels.UPDATES.equals(channelId)) return "updates";
        if (AsolNotificationChannels.URGENT.equals(channelId)) return "urgent";
        if (AsolNotificationChannels.SILENT.equals(channelId)) return "silent";
        return "general";
    }

    private static String text(Bundle extras, String key) {
        if (extras == null) return "";
        CharSequence value = extras.getCharSequence(key);
        return value == null ? "" : value.toString();
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
