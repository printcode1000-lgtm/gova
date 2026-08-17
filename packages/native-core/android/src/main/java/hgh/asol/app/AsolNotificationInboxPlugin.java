package hgh.asol.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * The bridge to the application-owned notification inbox.
 *
 * Three responsibilities, and they are separate on purpose:
 *
 * <ul>
 *   <li><b>The durable inbox</b> — {@code listPending} / {@code acknowledge} /
 *       {@code clearPending}. This is the reliable path: records were written
 *       to private storage (encrypted when AndroidKeyStore is available) the
 *       moment FCM delivered them, before any
 *       notification was posted, so they survive the tray, the Activity, and
 *       the process.</li>
 *   <li><b>The cold-start tap</b> — {@code getPendingTap} / {@code clearPendingTap}
 *       plus the {@code notificationTapped} event. A tap is a durable pointer
 *       into the inbox, so it can be read late, replayed, and verified against
 *       the signed-in user before it is honoured.</li>
 *   <li><b>The tray scan</b> — {@code getDelivered}. Kept as a secondary safety
 *       net for notifications posted by an older build of the app that had no
 *       inbox. It is no longer the recovery mechanism, because it never could
 *       be: a tapped auto-cancel notification is gone from the tray before this
 *       method can read it.</li>
 * </ul>
 *
 * Nothing here logs a title, a body, a route, metadata, or a uid.
 */
@CapacitorPlugin(name = "AsolNotificationInbox")
public class AsolNotificationInboxPlugin extends Plugin {
    private static final String TAG = "AsolNotifications";
    private static final String EVENT_TAP = "notificationTapped";

    @Override
    public void load() {
        super.load();
        // The Intent that started this process may already carry a tap. Reading
        // it here, rather than waiting for JavaScript to ask, means the pointer
        // is captured even if the WebView is still booting or is recreated.
        if (getActivity() != null) {
            AsolNotificationTapProtocol.capture(getContext(), getActivity().getIntent());
        }
    }

    /**
     * A tap that arrived while this process was already running.
     *
     * Forwarded from the host activity's onNewIntent. The event is a convenience for a
     * running session; correctness does not depend on it, because the same tap
     * is also readable through {@code getPendingTap} and the record itself is
     * still in the inbox either way.
     */
    public void onNewIntentReceived(Intent intent) {
        if (!AsolNotificationTapProtocol.capture(getContext(), intent)) return;
        JSObject event = new JSObject();
        event.put("recordId", AsolNotificationTapProtocol.pendingRecordId(getContext()));
        event.put("uid", AsolNotificationTapProtocol.pendingUid(getContext()));
        event.put("notificationId", AsolNotificationTapProtocol.pendingNotificationId(getContext()));
        notifyListeners(EVENT_TAP, event, true);
    }

    // ---- channels -----------------------------------------------------------

    /**
     * Create the channel set. Rejects when it could not be ensured, so the web
     * layer can refuse to register a device whose channels are missing rather
     * than registering for pushes it cannot present correctly.
     */
    @PluginMethod
    public void ensureChannels(PluginCall call) {
        try {
            AsolNotificationChannels.ensureCreated(getContext());
        } catch (RuntimeException error) {
            Log.e(TAG, "Notification channels could not be created.", error);
            call.reject("Notification channels could not be created.", error);
            return;
        }
        call.resolve();
    }

    // ---- durable inbox ------------------------------------------------------

    /**
     * Every pending record owned by the calling user, oldest first.
     *
     * The uid is required and is applied inside the store, not here: a record
     * belonging to another account is never returned, so an import can never
     * file one user's notification under a different one.
     */
    @PluginMethod
    public void listPending(PluginCall call) {
        String uid = call.getString("uid", "");
        JSArray records = new JSArray();
        if (uid == null || uid.trim().isEmpty()) {
            JSObject empty = new JSObject();
            empty.put("records", records);
            call.resolve(empty);
            return;
        }
        List<AsolNotificationRecord> pending =
            AsolNotificationInboxStore.listForUid(getContext(), uid);
        for (AsolNotificationRecord record : pending) {
            records.put(record.toBridgeJson());
        }
        JSObject result = new JSObject();
        result.put("records", records);
        call.resolve(result);
    }

    /**
     * Delete records the web layer has committed to IndexedDB.
     *
     * This is the second half of the exactly-once protocol, and the ordering is
     * the whole point: the web layer saves first and acknowledges second, so a
     * storage error, a WebView crash, or a process death in between leaves the
     * record in place to be imported again. Deleting first would turn any of
     * those into a permanently lost notification.
     */
    @PluginMethod
    public void acknowledge(PluginCall call) {
        String uid = call.getString("uid", "");
        JSArray ids = call.getArray("recordIds", new JSArray());
        Set<String> recordIds = new HashSet<>();
        if (ids != null) {
            JSONArray raw = ids;
            for (int index = 0; index < raw.length(); index += 1) {
                String value = raw.optString(index, "");
                if (value != null && !value.trim().isEmpty()) recordIds.add(value.trim());
            }
        }
        int removed = AsolNotificationInboxStore.acknowledge(getContext(), uid, recordIds);
        JSObject result = new JSObject();
        result.put("acknowledged", removed);
        call.resolve(result);
    }

    /**
     * Erase every pending record on this device.
     *
     * Reserved for account deletion and the explicit "clear all local data"
     * action. Signing out must not call it: a pending notification belongs to
     * the user it was addressed to, and the correct behaviour is to keep it
     * until that user signs in again — never to hand it to the next account.
     */
    @PluginMethod
    public void clearPending(PluginCall call) {
        boolean inboxCleared = AsolNotificationInboxStore.clearAll(getContext());
        boolean tapCleared = AsolNotificationTapProtocol.clear(getContext());
        if (!inboxCleared || !tapCleared) {
            call.reject("The local notification inbox could not be cleared.");
            return;
        }
        call.resolve();
    }

    /** Pending record count, for the diagnostics screen. Carries no content. */
    @PluginMethod
    public void getPendingCount(PluginCall call) {
        JSObject result = new JSObject();
        result.put("count", AsolNotificationInboxStore.size(getContext()));
        call.resolve(result);
    }

    // ---- tap handshake ------------------------------------------------------

    /**
     * The tap this process was launched with, if it has not been handled yet.
     *
     * Read, not consumed. The web layer clears it only after the record has been
     * written to IndexedDB and marked read, so an interrupted start replays the
     * same tap instead of losing it — and a tap addressed to a user who is not
     * signed in waits rather than being applied to whoever is.
     */
    @PluginMethod
    public void getPendingTap(PluginCall call) {
        String recordId = AsolNotificationTapProtocol.pendingRecordId(getContext());
        JSObject result = new JSObject();
        result.put("recordId", recordId);
        result.put("uid", AsolNotificationTapProtocol.pendingUid(getContext()));
        result.put("notificationId", AsolNotificationTapProtocol.pendingNotificationId(getContext()));
        if (!recordId.isEmpty()) {
            AsolNotificationRecord record =
                AsolNotificationInboxStore.find(getContext(), recordId);
            if (record != null) result.put("record", record.toBridgeJson());
        }
        call.resolve(result);
    }

    @PluginMethod
    public void clearPendingTap(PluginCall call) {
        if (!AsolNotificationTapProtocol.clear(getContext())) {
            call.reject("The pending notification tap could not be cleared.");
            return;
        }
        call.resolve();
    }

    // ---- tray scan (legacy safety net) --------------------------------------

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
                // New builds persist these before posting and import them from
                // the durable inbox with their complete payload. The tray is a
                // legacy fallback only; importing both can create a second,
                // lossy item when Android truncated the notification tag.
                if (notification.extras != null
                    && notification.extras.containsKey(AsolNotificationTapProtocol.EXTRA_RECORD_ID)) {
                    continue;
                }
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
        data.put("createdAt", AsolNotificationRecord.isoTimestamp(status.getPostTime()));
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
