package hgh.asol.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

import java.util.ArrayList;
import java.util.List;

/**
 * Creates the Android notification channels before JavaScript is available.
 *
 * Channel sound is immutable after a channel is first created. The v3 ids are
 * therefore a deliberate migration away from any v2 channel that Android may
 * have persisted without the custom sound. Keep these ids synchronized with
 * src/native-platform/notifications/types.ts and notification-sound.ts.
 */
public final class AsolNotificationChannels {
    public static final String GENERAL = "asol_general_v3";
    public static final String ORDERS = "asol_orders_v3";
    public static final String CHAT = "asol_chat_v3";
    public static final String URGENT = "asol_urgent_v3";
    public static final String UPDATES = "asol_updates_v3";
    public static final String SILENT = "asol_silent_v3";
    public static final String SOUND_RESOURCE_NAME = "custom_notification";

    private AsolNotificationChannels() {}

    public static Uri customSoundUri(Context context) {
        // This reference is intentionally retained even though the URI uses
        // the stable resource name. It prevents shrinkResources from removing
        // the sound that FCM and Capacitor address dynamically by string.
        int retainedResource = R.raw.custom_notification;
        if (retainedResource == 0) {
            throw new IllegalStateException("custom_notification is missing");
        }
        return Uri.parse(
            ContentResolver.SCHEME_ANDROID_RESOURCE + "://" +
            context.getPackageName() + "/raw/" + SOUND_RESOURCE_NAME
        );
    }

    public static void ensureCreated(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            throw new IllegalStateException("NotificationManager is unavailable");
        }

        Uri sound = customSoundUri(context);
        AudioAttributes attributes = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build();

        List<NotificationChannel> channels = new ArrayList<>();
        channels.add(audible(GENERAL, "ASOL - الإشعارات العامة", "الإشعارات العامة من أصول", NotificationManager.IMPORTANCE_HIGH, sound, attributes));
        channels.add(audible(ORDERS, "ASOL - الطلبات", "تحديثات الطلبات والشحن والإرجاع", NotificationManager.IMPORTANCE_HIGH, sound, attributes));
        channels.add(audible(CHAT, "ASOL - المحادثات", "الرسائل والمحادثات الجديدة", NotificationManager.IMPORTANCE_HIGH, sound, attributes));
        channels.add(audible(URGENT, "ASOL - التنبيهات المهمة", "التنبيهات العاجلة والمهمة", NotificationManager.IMPORTANCE_MAX, sound, attributes));
        channels.add(audible(UPDATES, "ASOL - التحديثات", "إشعارات التحديثات العامة من أصول", NotificationManager.IMPORTANCE_HIGH, sound, attributes));

        NotificationChannel silent = new NotificationChannel(
            SILENT,
            "ASOL - بدون صوت",
            NotificationManager.IMPORTANCE_LOW
        );
        silent.setDescription("الإشعارات الداخلية غير المرئية التي تصل بدون صوت أو اهتزاز");
        silent.setSound(null, null);
        silent.enableVibration(false);
        channels.add(silent);

        manager.createNotificationChannels(channels);
    }

    private static NotificationChannel audible(
        String id,
        String name,
        String description,
        int importance,
        Uri sound,
        AudioAttributes attributes
    ) {
        NotificationChannel channel = new NotificationChannel(id, name, importance);
        channel.setDescription(description);
        channel.setSound(sound, attributes);
        channel.enableVibration(true);
        return channel;
    }
}
