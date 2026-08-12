package hgh.asol.app;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.InputStream;
import java.util.Arrays;
import java.util.List;

@RunWith(AndroidJUnit4.class)
public class NotificationSoundInstrumentedTest {
    private static final List<String> AUDIBLE_CHANNELS = Arrays.asList(
        AsolNotificationChannels.GENERAL,
        AsolNotificationChannels.ORDERS,
        AsolNotificationChannels.CHAT,
        AsolNotificationChannels.URGENT,
        AsolNotificationChannels.UPDATES
    );

    @Test
    public void everyVisibleChannelExistsAndSoundIsPackaged() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        AsolNotificationChannels.ensureCreated(context);

        try (InputStream sound = context.getResources().openRawResource(R.raw.custom_notification)) {
            assertTrue("The packaged sound must contain audio bytes", sound.available() > 1024);
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        assertNotNull(manager);
        for (String id : AUDIBLE_CHANNELS) {
            NotificationChannel channel = manager.getNotificationChannel(id);
            assertNotNull("Missing channel " + id, channel);
            assertTrue("Audible channel has low importance: " + id,
                channel.getImportance() >= NotificationManager.IMPORTANCE_DEFAULT);
        }

        NotificationChannel silent = manager.getNotificationChannel(AsolNotificationChannels.SILENT);
        assertNotNull(silent);
        assertNull(silent.getSound());
    }

    @Test
    public void postAudibleProbeForSystemInspection() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        AsolNotificationChannels.ensureCreated(context);
        assumeTrue(
            "Enable ASOL notifications in system settings before the audible probe",
            Build.VERSION.SDK_INT < 33 ||
                context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        );

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        assertNotNull(manager);
        manager.notify(
            93001,
            new NotificationCompat.Builder(context, AsolNotificationChannels.GENERAL)
                .setSmallIcon(R.drawable.ic_stat_asol_notification)
                .setContentTitle("ASOL notification sound probe")
                .setContentText("This notification must use custom_notification.mp3")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build()
        );
    }
}
