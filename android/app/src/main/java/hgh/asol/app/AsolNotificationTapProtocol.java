package hgh.asol.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

/**
 * The application-owned tap handshake.
 *
 * Capacitor's push plugin recognises a tap by the presence of Firebase's own
 * {@code google.message_id} extra, which only exists when Firebase itself built
 * the notification. ASOL builds its own notification from a data message, so it
 * declares its own extras — and, more importantly, its own <em>durable</em>
 * identity: the tap carries the id of a record that is on disk, not a copy of
 * the payload that disappears with the tray entry.
 *
 * That is what makes a cold-start tap safe. The Activity may be created,
 * destroyed, and created again before JavaScript ever runs; the tap is a
 * pointer into the inbox. The pointer itself is synchronously committed to
 * application-private storage, so replaying it costs nothing and losing either
 * the retained callback or the whole process costs nothing.
 */
public final class AsolNotificationTapProtocol {
    /** Extra naming the inbox record the user tapped. */
    public static final String EXTRA_RECORD_ID = "asol_notification_record_id";
    /** Extra naming the record's owning user, so a tap cannot cross accounts. */
    public static final String EXTRA_UID = "asol_notification_uid";
    /**
     * Extra naming the stored notification the tap refers to.
     *
     * Carried in the Intent rather than looked up from the record, because the
     * record is deleted as soon as the notification reaches IndexedDB — and a
     * user can tap a tray entry long after that has happened. Without it, "mark
     * the tapped notification read" would silently do nothing in exactly the
     * case where the notification is already in the centre waiting to be read.
     */
    public static final String EXTRA_NOTIFICATION_ID = "asol_notification_id";

    private AsolNotificationTapProtocol() {}

    private static final String PREFERENCES = "asol_notification_pending_tap";
    private static final String KEY_RECORD_ID = "record_id";
    private static final String KEY_UID = "uid";
    private static final String KEY_NOTIFICATION_ID = "notification_id";

    private static SharedPreferences preferences(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    /** Record a tap from a launch or a new Intent. Ignores anything else. */
    public static synchronized boolean capture(Context context, Intent intent) {
        if (context == null || intent == null) return false;
        String recordId = intent.getStringExtra(EXTRA_RECORD_ID);
        if (recordId == null || recordId.trim().isEmpty()) return false;
        String uid = intent.getStringExtra(EXTRA_UID);
        String notificationId = intent.getStringExtra(EXTRA_NOTIFICATION_ID);
        return preferences(context)
            .edit()
            .putString(KEY_RECORD_ID, recordId.trim())
            .putString(KEY_UID, uid == null ? "" : uid.trim())
            .putString(KEY_NOTIFICATION_ID, notificationId == null ? "" : notificationId.trim())
            // A tap must be durable before onCreate/onNewIntent returns. apply()
            // is asynchronous and can lose this pointer if Android kills the
            // process while the WebView is still starting.
            .commit();
    }

    public static synchronized String pendingRecordId(Context context) {
        return preferences(context).getString(KEY_RECORD_ID, "");
    }

    public static synchronized String pendingUid(Context context) {
        return preferences(context).getString(KEY_UID, "");
    }

    public static synchronized String pendingNotificationId(Context context) {
        return preferences(context).getString(KEY_NOTIFICATION_ID, "");
    }

    /**
     * Forget the pending tap.
     *
     * Called only once the web layer has finished with it — after the record was
     * written to IndexedDB and marked read. A tap that arrives for a user who is
     * not signed in yet is left in place, so it is still there when that user's
     * session starts.
     */
    public static synchronized boolean clear(Context context) {
        if (context == null) return false;
        return preferences(context).edit().clear().commit();
    }
}
