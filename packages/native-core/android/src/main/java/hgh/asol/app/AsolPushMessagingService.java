package hgh.asol.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * ASOL's own Firebase message handler.
 *
 * <h2>Why this class has to exist</h2>
 *
 * A message carrying a {@code notification} block is displayed by the Firebase
 * SDK itself whenever the app is backgrounded or dead, and
 * {@code onMessageReceived} is never called. That is the whole reason
 * notifications were being lost: the only code that could have recorded them
 * did not run, and by the time the app started again the evidence was a tray
 * entry — which a tapped auto-cancel notification has already removed.
 *
 * Android delivery is therefore an application-owned data-message path. The
 * server sends Android tokens a data-only message (iOS and Web Push are
 * untouched and still receive their normal alert payloads), Firebase always
 * calls this service, and this service does the two things in the order that
 * matters:
 *
 * <ol>
 *   <li><b>persist</b> the complete payload into the local, private, encrypted
 *       inbox; then</li>
 *   <li><b>display</b> it on the existing ASOL channel with the existing custom
 *       sound.</li>
 * </ol>
 *
 * Persist-before-display is not a stylistic preference. Everything after step 1
 * — posting, tapping, launching, booting the WebView — can fail or be killed,
 * and the notification is still recoverable. Nothing before step 1 can be.
 *
 * <h2>What it does not do</h2>
 *
 * It does not decide what a notification <em>means</em>, does not deduplicate,
 * and does not write anything a server can read. Storage is the WebView's job
 * and IndexedDB is the permanent home; this class only makes sure there is
 * still something to store when the WebView wakes up.
 *
 * <h2>Foreground</h2>
 *
 * While the Activity is resumed the message is persisted and forwarded to the
 * JavaScript listener, and the banner is left to the existing foreground
 * presenter. Posting here as well would show every foreground push twice.
 */
public class AsolPushMessagingService extends FirebaseMessagingService {
    private static final String TAG = "AsolNotifications";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Context context = getApplicationContext();
        long now = System.currentTimeMillis();

        AsolNotificationRecord record = null;
        try {
            Map<String, String> data = remoteMessage.getData();
            RemoteMessage.Notification alert = remoteMessage.getNotification();
            record = AsolNotificationRecord.fromData(
                data,
                alert == null ? "" : alert.getTitle(),
                alert == null ? "" : alert.getBody(),
                remoteMessage.getMessageId(),
                now
            );
        } catch (RuntimeException error) {
            // Never the payload: only that normalization failed.
            Log.e(TAG, "An inbound push could not be normalized.", error);
        }

        if (record != null) {
            boolean persisted = AsolNotificationInboxStore.enqueue(context, record);
            // Never display a background notification without its durable
            // record. A visible auto-cancel notification whose enqueue failed
            // recreates the original loss: its tap has nothing to transfer to
            // IndexedDB after the tray entry disappears.
            if (persisted && !AsolAppLifecycle.isForeground()) {
                post(context, record);
            }
        }

        // Only a genuinely foreground Activity gets the live callback. If a
        // background/dead-process message is forwarded, Capacitor retains it as
        // `lastMessage` and replays it after the next launch as though it had
        // just arrived in the foreground, which can post a second banner. The
        // durable inbox is the sole handoff for every non-foreground delivery.
        if (record != null && AsolAppLifecycle.isForeground()) {
            try {
                PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
            } catch (RuntimeException error) {
                Log.e(TAG, "The foreground push could not be forwarded to the web layer.", error);
            }
        }
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        // Token cardinality is owned by the web layer — one token per user and
        // platform — so the refreshed value is handed to the same listener the
        // Capacitor plugin would have used. The token itself is never logged.
        try {
            PushNotificationsPlugin.onNewToken(token);
        } catch (RuntimeException error) {
            Log.e(TAG, "A refreshed push token could not be forwarded.", error);
        }
    }

    /**
     * Post the notification on the ASOL channel the record resolved to.
     *
     * The channel carries the custom sound — on Android 8 and newer a channel's
     * sound is fixed at creation and cannot be overridden per notification — so
     * the sound URI is set as well only for the pre-8 devices that still read it
     * from the notification.
     */
    static void post(Context context, AsolNotificationRecord record) {
        if (record.isDataOnly()) return;

        try {
            // Channels are normally created by the Activity at startup, but a
            // push can reach a process the Activity never started, so the set is
            // ensured here too. Creating an existing channel is a no-op and
            // cannot change its sound.
            AsolNotificationChannels.ensureCreated(context);
        } catch (RuntimeException error) {
            Log.e(TAG, "Notification channels could not be ensured before posting.", error);
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;

        Intent launch = new Intent(context, MainActivity.class);
        launch.setAction(Intent.ACTION_MAIN);
        launch.addCategory(Intent.CATEGORY_LAUNCHER);
        // The Activity is singleTask: a running task is reused and the Intent
        // arrives through onNewIntent, while a dead process is launched with it.
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launch.putExtras(record.toIntentExtras());
        // A stable, opaque discriminator so the Intent is not treated as equal
        // to another record's Intent by PendingIntent's extras-blind matching.
        launch.setData(Uri.parse("asol://notification/" + record.recordId));

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Required from Android 12, and correct everywhere: nothing outside
            // this application may rewrite the record this tap refers to.
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentIntent = PendingIntent.getActivity(
            context,
            record.systemNotificationId,
            launch,
            flags
        );

        android.os.Bundle inboxIdentity = new android.os.Bundle();
        inboxIdentity.putString(AsolNotificationTapProtocol.EXTRA_RECORD_ID, record.recordId);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, record.channelId)
            .setSmallIcon(R.drawable.ic_stat_asol_notification)
            .setColor(context.getResources().getColor(R.color.notification_accent))
            .setContentTitle(record.title.isEmpty() ? "ASOL" : record.title)
            .setContentText(record.body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(record.body))
            .setPriority(toCompatPriority(record.priority))
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setWhen(record.receivedAt)
            .setShowWhen(true)
            .setAutoCancel(true)
            // Lets the legacy tray sweep recognize notifications already owned
            // by the durable inbox and skip them. Otherwise a long dedupe key,
            // truncated for the Android tag, can become a second centre item.
            .addExtras(inboxIdentity)
            .setContentIntent(contentIntent);

        if (!record.groupKey.isEmpty()) builder.setGroup(record.groupKey);

        // Below Android 8 there are no channels, so the sound must be attached
        // to the notification itself or the device plays the system default.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O && !"silent".equals(record.sound)) {
            try {
                builder.setSound(AsolNotificationChannels.customSoundUri(context));
            } catch (RuntimeException error) {
                Log.e(TAG, "The custom notification sound could not be resolved.", error);
            }
        }

        Notification notification = builder.build();
        try {
            if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return;
            // Tag plus id, both stable: a redelivery of the same message updates
            // the same tray entry instead of stacking a duplicate.
            manager.notify(record.systemTag, record.systemNotificationId, notification);
        } catch (SecurityException error) {
            // POST_NOTIFICATIONS was not granted. The record is already stored,
            // so the notification still reaches the centre at the next import.
            Log.e(TAG, "The notification could not be posted; it stays in the local inbox.", error);
        }
    }

    private static int toCompatPriority(String priority) {
        if ("critical".equals(priority)) return NotificationCompat.PRIORITY_MAX;
        if ("high".equals(priority)) return NotificationCompat.PRIORITY_HIGH;
        if ("low".equals(priority)) return NotificationCompat.PRIORITY_LOW;
        return NotificationCompat.PRIORITY_DEFAULT;
    }
}
