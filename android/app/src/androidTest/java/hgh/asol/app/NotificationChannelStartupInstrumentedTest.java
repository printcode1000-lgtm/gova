package hgh.asol.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.Arrays;
import java.util.List;

/**
 * The startup contract, on a device, in the order a user meets it.
 *
 * Launch the activity without granting POST_NOTIFICATIONS and the complete
 * channel set must already exist, carrying the final custom sound. Nothing here
 * grants a permission or posts a notification: that is the point — channel
 * creation must not depend on either.
 *
 * <p><b>Run it on a clean install.</b> A channel keeps the sound, importance and
 * vibration it was first created with, so a device that still holds channels
 * from an earlier build reports that build's values and the sound assertions
 * fail with an explanation. The project's existing
 * `npm run android:device:install -- --without-permissions` does a full
 * reinstall without granting the notification permission and therefore
 * <b>erases this application's data, storage and notification channels on the
 * connected device</b>. This suite never runs it: invoke it deliberately, on a
 * device whose owner asked for it.
 */
@RunWith(AndroidJUnit4.class)
public class NotificationChannelStartupInstrumentedTest {
    private static final List<String> AUDIBLE_CHANNELS = Arrays.asList(
        AsolNotificationChannels.GENERAL,
        AsolNotificationChannels.ORDERS,
        AsolNotificationChannels.CHAT,
        AsolNotificationChannels.URGENT,
        AsolNotificationChannels.UPDATES
    );

    @Test
    public void launchingTheActivityCreatesEveryChannelWithoutPermission() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assumeTrue(
            "Notification channels exist from API 26",
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
        );

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        assertNotNull(manager);

        if (Build.VERSION.SDK_INT >= 33) {
            assumeTrue(
                "Fresh-install startup verification requires POST_NOTIFICATIONS to remain ungranted",
                context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED
            );
        }

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            assertNotNull(scenario);

            // 1. Every declared channel exists after nothing but a launch.
            for (String id : AsolNotificationChannels.requiredChannelIds()) {
                assertNotNull(
                    "Channel " + id + " does not exist after launching the activity",
                    awaitChannel(manager, id)
                );
            }

            // 2. The permission was never involved. On API 33+ this proves the
            //    channels above were created while the grant was still absent;
            //    below 33 there is no runtime permission to hold back.
            if (Build.VERSION.SDK_INT >= 33) {
                assertFalse(
                    "Launching the activity must not grant POST_NOTIFICATIONS",
                    context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        == PackageManager.PERMISSION_GRANTED
                );
            }

            // 3. Audible channels carry the stable custom-sound URI.
            Uri expected = AsolNotificationChannels.customSoundUri(context);
            for (String id : AUDIBLE_CHANNELS) {
                NotificationChannel channel = awaitChannel(manager, id);
                assertNotNull(channel);
                assertEquals(
                    "Channel " + id + " was created with the wrong sound. Sound is fixed at "
                        + "first creation; reinstall the application to re-create the channels.",
                    expected,
                    channel.getSound()
                );
                assertTrue(
                    "Audible channel " + id + " must be importance 3 or higher",
                    channel.getImportance() >= NotificationManager.IMPORTANCE_DEFAULT
                );
            }

            // 4. The silent channel is the only one without a sound.
            NotificationChannel silent =
                manager.getNotificationChannel(AsolNotificationChannels.SILENT);
            assertNotNull(silent);
            assertNull("The silent channel must have no sound", silent.getSound());
            assertFalse("The silent channel must not vibrate", silent.shouldVibrate());

            // 5. The FCM fallback channel named in the manifest is a real audible
            //    channel, or a push arriving first lands on a system channel.
            String fallback = context.getString(R.string.default_notification_channel_id);
            assertTrue(
                "The manifest default channel " + fallback + " is not an audible ASOL channel",
                AUDIBLE_CHANNELS.contains(fallback)
            );

            // 6. Creating them again changes nothing.
            AsolNotificationChannels.ensureCreated(context);
            NotificationChannel general =
                manager.getNotificationChannel(AsolNotificationChannels.GENERAL);
            assertNotNull(general);
            assertEquals("Re-creation must not alter the sound", expected, general.getSound());
        }
    }

    private NotificationChannel awaitChannel(NotificationManager manager, String id)
        throws InterruptedException {
        // Channel state is persisted asynchronously on some devices; poll the
        // observable state rather than racing its writer.
        NotificationChannel channel = null;
        for (int attempt = 0; attempt < 20; attempt += 1) {
            channel = manager.getNotificationChannel(id);
            if (channel != null && (channel.getSound() != null
                || AsolNotificationChannels.SILENT.equals(id))) {
                return channel;
            }
            Thread.sleep(100);
        }
        return channel;
    }
}
