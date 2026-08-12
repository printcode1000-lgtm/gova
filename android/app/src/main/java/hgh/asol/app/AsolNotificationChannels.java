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
 * Channel sound is immutable after a channel is first created. The v4 ids are
 * therefore a deliberate migration away from any older channel that Android may
 * have persisted without the custom sound. Keep these ids synchronized with
 * src/native-platform/notifications/types.ts and notification-sound.ts.
 */
public final class AsolNotificationChannels {
    public static final String GENERAL = "asol_general_v4";
    public static final String ORDERS = "asol_orders_v4";
    public static final String CHAT = "asol_chat_v4";
    public static final String URGENT = "asol_urgent_v4";
    public static final String UPDATES = "asol_updates_v4";
    public static final String SILENT = "asol_silent_v4";
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
        channels.add(audible(GENERAL, "أصول - الإشعارات العامة (نغمة مخصصة)", "الإشعارات العامة من أصول بالنغمة المخصصة", NotificationManager.IMPORTANCE_HIGH, sound, attributes));
        channels.add(audible(ORDERS, "أصول - الطلبات (نغمة مخصصة)", "تحديثات الطلبات والشحن والإرجاع بالنغمة المخصصة", NotificationManager.IMPORTANCE_HIGH, sound, attributes));
        channels.add(audible(CHAT, "أصول - المحادثات (نغمة مخصصة)", "الرسائل والمحادثات الجديدة بالنغمة المخصصة", NotificationManager.IMPORTANCE_HIGH, sound, attributes));
        channels.add(audible(URGENT, "أصول - التنبيهات العاجلة (نغمة مخصصة)", "التنبيهات العاجلة والمهمة بالنغمة المخصصة", NotificationManager.IMPORTANCE_MAX, sound, attributes));
        channels.add(audible(UPDATES, "أصول - التحديثات (نغمة مخصصة)", "إشعارات التحديثات العامة من أصول بالنغمة المخصصة", NotificationManager.IMPORTANCE_HIGH, sound, attributes));

        NotificationChannel silent = new NotificationChannel(
            SILENT,
            "أصول - إشعارات صامتة",
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
