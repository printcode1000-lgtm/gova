package hgh.asol.app;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.service.notification.StatusBarNotification;

import androidx.core.app.NotificationCompat;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.Arrays;

/**
 * Notifications as the system actually accepted them.
 *
 * The sound and channel contract is asserted elsewhere; this asks whether a
 * notification the app posts genuinely reaches the shade. A channel can exist,
 * carry the right sound, and still deliver nothing — because the runtime
 * permission was never granted, because the channel was blocked, or because
 * R8 removed something the posting path needed. None of those are visible
 * anywhere except on a device.
 */
@RunWith(AndroidJUnit4.class)
public class NotificationDeliveryInstrumentedTest {
    private static final int PROBE_ID = 93002;

    @After
    public void cancelProbe() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.cancel(PROBE_ID);
        }
    }

    @Test
    public void runtimeNotificationPermissionIsDeclared() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PackageInfo info = context
            .getPackageManager()
            .getPackageInfo(context.getPackageName(), PackageManager.GET_PERMISSIONS);

        assertNotNull("The package must declare permissions", info.requestedPermissions);
        // Without the declaration, Android 13+ never even shows the prompt, and
        // every notification is dropped in silence.
        assertTrue(
            "POST_NOTIFICATIONS must be declared for Android 13 and newer",
            Arrays.asList(info.requestedPermissions).contains(Manifest.permission.POST_NOTIFICATIONS)
        );
    }

    @Test
    public void notificationsAreEnabledForThisPackage() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        assertNotNull(manager);
        assumeTrue(
            "Grant the notification permission on the device before this check",
            hasPostPermission(context)
        );
        assertTrue(
            "Notifications are switched off for this package in system settings",
            manager.areNotificationsEnabled()
        );
    }

    @Test
    public void aPostedNotificationReachesTheShade() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        AsolNotificationChannels.ensureCreated(context);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        assertNotNull(manager);
        assumeTrue(
            "Grant the notification permission on the device before this check",
            hasPostPermission(context)
        );
        assumeTrue(
            "Reading active notifications needs API 23 or newer",
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
        );

        manager.notify(
            PROBE_ID,
            new NotificationCompat.Builder(context, AsolNotificationChannels.GENERAL)
                .setSmallIcon(R.drawable.ic_stat_asol_notification)
                .setContentTitle("ASOL delivery probe")
                .setContentText("Posted by the connected-device test suite")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build()
        );

        StatusBarNotification posted = awaitPostedNotification(manager);
        assertNotNull("The posted notification never reached the shade", posted);
        Notification notification = posted.getNotification();
        assertNotNull(notification);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            assertTrue(
                "The notification was delivered on the wrong channel: " + notification.getChannelId(),
                AsolNotificationChannels.GENERAL.equals(notification.getChannelId())
            );
        }
    }

    /**
     * The shade is written asynchronously, so an immediate read can miss a
     * notification the system is about to accept. Poll the observable state
     * instead of racing its writer.
     */
    private StatusBarNotification awaitPostedNotification(NotificationManager manager)
        throws InterruptedException {
        for (int attempt = 0; attempt < 20; attempt += 1) {
            for (StatusBarNotification active : manager.getActiveNotifications()) {
                if (active.getId() == PROBE_ID) {
                    return active;
                }
            }
            Thread.sleep(100);
        }
        return null;
    }

    private static boolean hasPostPermission(Context context) {
        return Build.VERSION.SDK_INT < 33
            || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
    }
}
