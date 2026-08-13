package hgh.asol.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Creates the Android notification channels before JavaScript is available.
 *
 * Sound, importance, and vibration are fixed when a channel is first created and
 * cannot be changed afterwards, so the first creation on a device must already
 * carry the final custom sound. Changing any of them later requires a new id
 * generation, which discards every per-channel preference the user has set.
 * Keep these ids synchronized with src/native-platform/notifications/types.ts
 * and notification-sound.ts.
 *
 * Creating a channel needs no POST_NOTIFICATIONS grant and posts nothing; it
 * only declares what the Android settings screen lists.
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

    /**
     * The sound every audible channel is created with.
     *
     * The URI names the resource — `android.resource://<package>/raw/<name>` —
     * instead of embedding the numeric id. A channel outlives the install that
     * created it, while a numeric resource id is regenerated on every build, so
     * a persisted numeric id can point at a different resource, or at none, after
     * an upgrade. The name is resolved by the system through
     * `Resources.getIdentifier` each time the sound is played, so it survives.
     */
    public static Uri customSoundUri(Context context) {
        // The numeric id is read here and nowhere else: it is what makes the
        // resource reachable to the Release resource shrinker, which cannot see
        // an asset addressed only by name. It is deliberately not part of the URI.
        int retainedResource = R.raw.custom_notification;
        if (retainedResource == 0) {
            throw new IllegalStateException("custom_notification is missing");
        }
        // A rename of the raw asset would silently produce a URI that resolves to
        // nothing, and the channel would be created with an unplayable sound that
        // can never be repaired. Fail loudly instead.
        String actualName = context.getResources().getResourceEntryName(retainedResource);
        if (!SOUND_RESOURCE_NAME.equals(actualName)) {
            throw new IllegalStateException(
                "custom sound resource is named " + actualName + ", expected " + SOUND_RESOURCE_NAME
            );
        }
        return Uri.parse(
            ContentResolver.SCHEME_ANDROID_RESOURCE + "://" +
            context.getPackageName() + "/raw/" + SOUND_RESOURCE_NAME
        );
    }

    /**
     * Create the complete channel set, and verify the system kept it.
     *
     * @throws IllegalStateException when a channel could not be created. The
     * caller decides what that means: startup logs it and continues, while push
     * registration refuses to hand a token to FCM for a device whose channels
     * are not in place.
     */
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

        for (NotificationChannel channel : channels) {
            if (manager.getNotificationChannel(channel.getId()) == null) {
                throw new IllegalStateException(
                    "notification channel " + channel.getId() + " was not created"
                );
            }
        }
    }

    /** The ids the application must not post to, or register for, without. */
    public static List<String> requiredChannelIds() {
        return Arrays.asList(GENERAL, ORDERS, CHAT, URGENT, UPDATES, SILENT);
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
