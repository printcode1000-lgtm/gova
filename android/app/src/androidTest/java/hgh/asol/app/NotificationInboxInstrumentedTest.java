package hgh.asol.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.Intent;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

/**
 * The device-local notification inbox, on a real device.
 *
 * A TypeScript harness can prove that the web layer imports and acknowledges
 * correctly, but it cannot prove any of the things this file asserts: that the
 * record actually reaches application-private storage, that it is still there
 * after the Activity is destroyed and recreated, that the complete payload
 * round-trips through real encryption and real JSON, that acknowledgement is
 * scoped to one user, and that the launch Intent identifies the tapped record.
 *
 * Those are the properties the whole design rests on, and every one of them is
 * a property of Android rather than of the application's JavaScript.
 *
 * The inbox is cleared before and after each test. Nothing here installs,
 * reinstalls, or wipes application data.
 */
@RunWith(AndroidJUnit4.class)
public class NotificationInboxInstrumentedTest {
    private static final String UID = "instrumented-user-1";
    private static final String OTHER_UID = "instrumented-user-2";

    private Context context;

    @Before
    public void clearInboxBefore() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        AsolNotificationInboxStore.clearAll(context);
        AsolNotificationTapProtocol.clear(context);
    }

    @After
    public void clearInboxAfter() {
        AsolNotificationInboxStore.clearAll(context);
        AsolNotificationTapProtocol.clear(context);
    }

    // ---- enqueue ------------------------------------------------------------

    @Test
    public void aReceivedPushIsPersistedBeforeAnythingIsDisplayed() {
        assertTrue(AsolNotificationInboxStore.enqueue(context, record(UID, "ntf_1", "dedupe_1")));

        List<AsolNotificationRecord> pending =
            AsolNotificationInboxStore.listForUid(context, UID);
        assertEquals(1, pending.size());
        assertEquals("ntf_1", pending.get(0).notificationId);
        assertEquals("dedupe_1", pending.get(0).dedupeKey);
    }

    @Test
    public void aRedeliveryReplacesItsRecordInsteadOfStackingASecond() {
        AsolNotificationInboxStore.enqueue(context, record(UID, "ntf_1", "dedupe_1"));
        AsolNotificationInboxStore.enqueue(context, record(UID, "ntf_1", "dedupe_1"));

        assertEquals(
            "FCM redelivers on its own schedule; the record id is derived so it collapses",
            1,
            AsolNotificationInboxStore.listForUid(context, UID).size()
        );
    }

    // ---- payload preservation ----------------------------------------------

    @Test
    public void theCompletePayloadSurvivesStorageAndBridgeSerialization() {
        Map<String, String> data = new HashMap<>();
        data.put("uid", UID);
        data.put("notificationId", "ntf_full");
        data.put("dedupeKey", "orders.created:ord_full");
        data.put("title", "تم قبول الطلب");
        data.put("body", "تم قبول طلبك رقم ord_full");
        data.put("category", "orders");
        data.put("priority", "high");
        data.put("sound", "urgent");
        data.put("groupKey", "ord_full");
        data.put("templateId", "orders.created");
        data.put("routeHref", "/orders/ord_full");
        data.put("routeLabel", "عرض الطلب");
        data.put("createdAt", "2026-08-01T10:00:00.000Z");
        data.put("androidChannelId", AsolNotificationChannels.URGENT);
        data.put("meta_orderId", "ord_full");
        data.put("meta_source", "orders_service");

        AsolNotificationRecord built =
            AsolNotificationRecord.fromData(data, "", "", "fallback", System.currentTimeMillis());
        assertNotNull(built);
        AsolNotificationInboxStore.enqueue(context, built);

        AsolNotificationRecord loaded =
            AsolNotificationInboxStore.listForUid(context, UID).get(0);

        assertEquals("ntf_full", loaded.notificationId);
        assertEquals("orders.created:ord_full", loaded.dedupeKey);
        assertEquals("تم قبول الطلب", loaded.title);
        assertEquals("تم قبول طلبك رقم ord_full", loaded.body);
        assertEquals("orders", loaded.category);
        assertEquals("high", loaded.priority);
        assertEquals("urgent", loaded.sound);
        assertEquals("ord_full", loaded.groupKey);
        assertEquals("orders.created", loaded.templateId);
        assertEquals("/orders/ord_full", loaded.routeHref);
        assertEquals("عرض الطلب", loaded.routeLabel);
        assertEquals("2026-08-01T10:00:00.000Z", loaded.createdAt);
        assertEquals(AsolNotificationChannels.URGENT, loaded.channelId);

        // The complete original map, not a reconstruction: this is what the old
        // tray-scan inbox could not do, and why metadata used to be lost.
        assertEquals("ord_full", loaded.data.get("meta_orderId"));
        assertEquals("orders_service", loaded.data.get("meta_source"));
        assertEquals(data.size(), loaded.data.size());

        // And it survives the bridge encoding the web layer actually reads.
        assertNotNull(loaded.toBridgeJson().getJSObject("payload"));
        assertEquals(
            "ord_full",
            loaded.toBridgeJson().getJSObject("payload").getJSObject("data").getString("meta_orderId")
        );
    }

    @Test
    public void anUnknownChannelFallsBackToTheResolvedOne() {
        Map<String, String> data = new HashMap<>();
        data.put("uid", UID);
        data.put("notificationId", "ntf_channel");
        data.put("category", "chat");
        data.put("priority", "high");
        data.put("sound", "default");
        // A channel generation this build does not have. Posting to it would
        // land on a system fallback channel with the wrong sound.
        data.put("androidChannelId", "asol_chat_v99");

        AsolNotificationRecord built =
            AsolNotificationRecord.fromData(data, "", "", "fallback", System.currentTimeMillis());
        assertNotNull(built);
        assertEquals(AsolNotificationChannels.CHAT, built.channelId);
    }

    // ---- persistence across Activity recreation -----------------------------

    @Test
    public void pendingRecordsSurviveActivityRecreation() {
        AsolNotificationInboxStore.enqueue(context, record(UID, "ntf_survive", "dedupe_survive"));

        try (ActivityScenario<MainActivity> scenario =
                 ActivityScenario.launch(MainActivity.class)) {
            scenario.recreate();
        }

        List<AsolNotificationRecord> pending =
            AsolNotificationInboxStore.listForUid(context, UID);
        assertEquals(
            "the inbox must be file-backed, not held by the Activity",
            1,
            pending.size()
        );
        assertEquals("ntf_survive", pending.get(0).notificationId);
    }

    // ---- list and acknowledge ----------------------------------------------

    @Test
    public void recordsAreListedOldestFirstAndScopedToTheirOwner() throws Exception {
        AsolNotificationInboxStore.enqueue(context, record(UID, "ntf_old", "d_old"));
        Thread.sleep(5);
        AsolNotificationInboxStore.enqueue(context, record(UID, "ntf_new", "d_new"));
        AsolNotificationInboxStore.enqueue(context, record(OTHER_UID, "ntf_other", "d_other"));

        List<AsolNotificationRecord> mine = AsolNotificationInboxStore.listForUid(context, UID);
        assertEquals(2, mine.size());
        assertEquals("ntf_old", mine.get(0).notificationId);
        assertEquals("ntf_new", mine.get(1).notificationId);

        // Another account's record is never handed over, and an empty uid must
        // not act as a wildcard.
        assertEquals(1, AsolNotificationInboxStore.listForUid(context, OTHER_UID).size());
        assertEquals(0, AsolNotificationInboxStore.listForUid(context, "").size());
    }

    @Test
    public void acknowledgementRemovesOnlyTheNamedRecordsOfThatUser() {
        AsolNotificationRecord mine = record(UID, "ntf_mine", "d_mine");
        AsolNotificationRecord alsoMine = record(UID, "ntf_also", "d_also");
        AsolNotificationRecord theirs = record(OTHER_UID, "ntf_theirs", "d_theirs");
        AsolNotificationInboxStore.enqueue(context, mine);
        AsolNotificationInboxStore.enqueue(context, alsoMine);
        AsolNotificationInboxStore.enqueue(context, theirs);

        assertEquals(
            1,
            AsolNotificationInboxStore.acknowledge(
                context, UID, new HashSet<>(Collections.singletonList(mine.recordId))
            )
        );
        assertEquals(1, AsolNotificationInboxStore.listForUid(context, UID).size());

        // A signed-in user cannot retire another user's pending notification,
        // even holding its id.
        assertEquals(
            0,
            AsolNotificationInboxStore.acknowledge(
                context, UID, new HashSet<>(Collections.singletonList(theirs.recordId))
            )
        );
        assertEquals(1, AsolNotificationInboxStore.listForUid(context, OTHER_UID).size());
    }

    @Test
    public void anUnacknowledgedRecordIsStillThereForTheNextImport() {
        AsolNotificationInboxStore.enqueue(context, record(UID, "ntf_retry", "d_retry"));

        // The web layer read it and then failed to store it, so it acknowledged
        // nothing. The record must survive to be imported again.
        AsolNotificationInboxStore.listForUid(context, UID);
        AsolNotificationInboxStore.acknowledge(context, UID, new HashSet<String>());

        assertEquals(1, AsolNotificationInboxStore.listForUid(context, UID).size());
    }

    @Test
    public void clearingRemovesEverythingForEveryUser() {
        AsolNotificationInboxStore.enqueue(context, record(UID, "ntf_a", "d_a"));
        AsolNotificationInboxStore.enqueue(context, record(OTHER_UID, "ntf_b", "d_b"));

        AsolNotificationInboxStore.clearAll(context);

        assertEquals(0, AsolNotificationInboxStore.listForUid(context, UID).size());
        assertEquals(0, AsolNotificationInboxStore.listForUid(context, OTHER_UID).size());
        assertEquals(0, AsolNotificationInboxStore.size(context));
    }

    // ---- retention ----------------------------------------------------------

    @Test
    public void expiredRecordsAreDroppedBeforeTheCountLimitIsApplied() {
        long now = System.currentTimeMillis();
        List<AsolNotificationRecord> records = new ArrayList<>();
        // One stale record, and a fresh one that must not be evicted for it.
        records.add(record(UID, "ntf_stale", "d_stale", now - AsolNotificationInboxStore.MAX_AGE_MS - 1));
        records.add(record(UID, "ntf_fresh", "d_fresh", now));

        List<AsolNotificationRecord> retained =
            AsolNotificationInboxStore.applyRetention(records, now);

        assertEquals(1, retained.size());
        assertEquals("ntf_fresh", retained.get(0).notificationId);
    }

    @Test
    public void theCountLimitEvictsTheOldestAndKeepsTheNewest() {
        long now = System.currentTimeMillis();
        List<AsolNotificationRecord> records = new ArrayList<>();
        int overflow = AsolNotificationInboxStore.MAX_RECORDS + 10;
        for (int index = 0; index < overflow; index += 1) {
            records.add(record(UID, "ntf_" + index, "d_" + index, now - (overflow - index)));
        }

        List<AsolNotificationRecord> retained =
            AsolNotificationInboxStore.applyRetention(records, now);

        assertEquals(AsolNotificationInboxStore.MAX_RECORDS, retained.size());
        // Deterministic, and never at the expense of the most recent records.
        assertEquals("ntf_10", retained.get(0).notificationId);
        assertEquals("ntf_" + (overflow - 1), retained.get(retained.size() - 1).notificationId);
    }

    @Test
    public void theStoreEnforcesTheCountLimitOnDisk() {
        long now = System.currentTimeMillis();
        int overflow = AsolNotificationInboxStore.MAX_RECORDS + 5;
        for (int index = 0; index < overflow; index += 1) {
            AsolNotificationInboxStore.enqueue(
                context, record(UID, "ntf_" + index, "d_" + index, now - (overflow - index))
            );
        }

        assertEquals(
            AsolNotificationInboxStore.MAX_RECORDS,
            AsolNotificationInboxStore.listForUid(context, UID).size()
        );
    }

    // ---- the tap handshake --------------------------------------------------

    @Test
    public void theLaunchIntentIdentifiesTheTappedRecord() {
        AsolNotificationRecord tapped = record(UID, "ntf_tapped", "d_tapped");
        AsolNotificationInboxStore.enqueue(context, tapped);

        Intent launch = new Intent(context, MainActivity.class);
        launch.putExtras(tapped.toIntentExtras());

        assertTrue(AsolNotificationTapProtocol.capture(context, launch));
        assertEquals(tapped.recordId, AsolNotificationTapProtocol.pendingRecordId(context));
        assertEquals(UID, AsolNotificationTapProtocol.pendingUid(context));
        // Carried in the Intent, so the tap still identifies the notification
        // after its record has been imported and acknowledged.
        assertEquals("ntf_tapped", AsolNotificationTapProtocol.pendingNotificationId(context));

        // And the record it points at is genuinely findable.
        AsolNotificationRecord found =
            AsolNotificationInboxStore.find(context, tapped.recordId);
        assertNotNull(found);
        assertEquals("ntf_tapped", found.notificationId);
    }

    @Test
    public void aTapIsReadNotConsumedUntilItIsExplicitlyCleared() {
        AsolNotificationRecord tapped = record(UID, "ntf_tapped", "d_tapped");
        Intent launch = new Intent(context, MainActivity.class);
        launch.putExtras(tapped.toIntentExtras());
        AsolNotificationTapProtocol.capture(context, launch);

        // Read twice: an interrupted start must replay the same tap rather than
        // losing it, which is why reading does not consume.
        assertEquals(tapped.recordId, AsolNotificationTapProtocol.pendingRecordId(context));
        assertEquals(tapped.recordId, AsolNotificationTapProtocol.pendingRecordId(context));

        AsolNotificationTapProtocol.clear(context);
        assertEquals("", AsolNotificationTapProtocol.pendingRecordId(context));
    }

    @Test
    public void anIntentWithoutATapIsIgnored() {
        AsolNotificationTapProtocol.clear(context);
        assertFalse(AsolNotificationTapProtocol.capture(context, new Intent(context, MainActivity.class)));
        assertFalse(AsolNotificationTapProtocol.capture(context, null));
        assertEquals("", AsolNotificationTapProtocol.pendingRecordId(context));
    }

    @Test
    public void aColdStartTapIsCapturedBeforeAnyJavaScriptRuns() {
        AsolNotificationRecord tapped = record(UID, "ntf_cold", "d_cold");
        AsolNotificationInboxStore.enqueue(context, tapped);
        AsolNotificationTapProtocol.clear(context);

        Intent launch = new Intent(context, MainActivity.class);
        launch.putExtras(tapped.toIntentExtras());

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(launch)) {
            // MainActivity#onCreate reads the launch Intent before super.onCreate
            // has finished building the bridge, so the pointer exists no matter
            // how long the WebView takes — or whether it boots at all.
            assertEquals(tapped.recordId, AsolNotificationTapProtocol.pendingRecordId(context));
            scenario.recreate();
            assertEquals(
                "an Activity recreation must not lose the tap",
                tapped.recordId,
                AsolNotificationTapProtocol.pendingRecordId(context)
            );
        }
    }

    // ---- multiple records ---------------------------------------------------

    @Test
    public void tappingOneRecordLeavesTheOthersPendingForImport() {
        AsolNotificationRecord first = record(UID, "ntf_1", "d_1");
        AsolNotificationRecord second = record(UID, "ntf_2", "d_2");
        AsolNotificationRecord third = record(UID, "ntf_3", "d_3");
        AsolNotificationInboxStore.enqueue(context, first);
        AsolNotificationInboxStore.enqueue(context, second);
        AsolNotificationInboxStore.enqueue(context, third);

        Intent launch = new Intent(context, MainActivity.class);
        launch.putExtras(second.toIntentExtras());
        AsolNotificationTapProtocol.capture(context, launch);

        // The tap names one record; all three are still there to be imported,
        // which is what stops a tap from silently discarding the rest.
        assertEquals(second.recordId, AsolNotificationTapProtocol.pendingRecordId(context));
        assertEquals(3, AsolNotificationInboxStore.listForUid(context, UID).size());

        // The web layer imports and acknowledges every one of them.
        List<String> ids = new ArrayList<>();
        for (AsolNotificationRecord pending : AsolNotificationInboxStore.listForUid(context, UID)) {
            ids.add(pending.recordId);
        }
        assertEquals(3, AsolNotificationInboxStore.acknowledge(context, UID, new HashSet<>(ids)));
        assertEquals(0, AsolNotificationInboxStore.listForUid(context, UID).size());
    }

    @Test
    public void everyRecordGetsItsOwnStableNotificationIdentity() {
        AsolNotificationRecord first = record(UID, "ntf_1", "d_1");
        AsolNotificationRecord second = record(UID, "ntf_2", "d_2");

        assertNotEquals(first.recordId, second.recordId);
        assertNotEquals(first.systemNotificationId, second.systemNotificationId);
        // Stable: the same identity always produces the same record id, which is
        // what makes a redelivery collapse instead of duplicating.
        assertEquals(first.recordId, record(UID, "ntf_1", "d_1").recordId);
        // And scoped: the same notification for a different user is a different
        // record.
        assertNotEquals(first.recordId, record(OTHER_UID, "ntf_1", "d_1").recordId);
    }

    @Test
    public void aRecordWithNoIdentityAtAllIsRejected() {
        Map<String, String> data = new HashMap<>();
        data.put("uid", UID);
        data.put("title", "No identity");
        assertNull(AsolNotificationRecord.fromData(data, "", "", "", System.currentTimeMillis()));

        // FCM's own message id is the last fallback before that.
        assertNotNull(
            AsolNotificationRecord.fromData(data, "", "", "0:123456789", System.currentTimeMillis())
        );
    }

    @Test
    public void aRecordWithNoOwningUserIsRejected() {
        Map<String, String> data = new HashMap<>();
        data.put("notificationId", "ntf_unowned");
        data.put("dedupeKey", "d_unowned");
        data.put("title", "Unowned");

        assertNull(
            "an unowned record can never be imported without crossing accounts",
            AsolNotificationRecord.fromData(data, "", "", "fallback", System.currentTimeMillis())
        );
    }

    @Test
    public void aDataOnlySignalIsNeverDisplayedButIsStillPersisted() {
        Map<String, String> data = new HashMap<>();
        data.put("uid", UID);
        data.put("notificationId", "ntf_receipt");
        data.put("dedupeKey", "receipt:msg_1");
        data.put("meta_dataOnly", "true");
        data.put("meta_receiptStatus", "received");
        data.put("meta_targetMessageId", "msg_1");

        AsolNotificationRecord built =
            AsolNotificationRecord.fromData(data, "", "", "fallback", System.currentTimeMillis());
        assertNotNull(built);
        assertTrue("a silent signal must not ring", built.isDataOnly());
        assertTrue(AsolNotificationInboxStore.enqueue(context, built));
        assertEquals(1, AsolNotificationInboxStore.listForUid(context, UID).size());
    }

    // ---- storage location ---------------------------------------------------

    @Test
    public void theInboxLivesInApplicationPrivateStorage() {
        AsolNotificationInboxStore.enqueue(context, record(UID, "ntf_private", "d_private"));

        java.io.File directory = new java.io.File(context.getFilesDir(), "asol_notification_inbox");
        java.io.File file = new java.io.File(directory, "inbox.bin");
        assertTrue("the inbox file was not written", file.exists());
        assertTrue(
            "the inbox must be inside the application's private files directory",
            file.getAbsolutePath().startsWith(context.getFilesDir().getAbsolutePath())
        );

        // Encrypted at rest wherever the keystore can provide a key, so a raw
        // read of the file yields no notification text.
        byte[] raw = readFile(file);
        assertTrue(raw.length > 0);
        String asText = new String(raw, java.nio.charset.StandardCharsets.ISO_8859_1);
        assertFalse(
            "notification identities must not be readable in the clear",
            asText.contains("ntf_private")
        );
    }

    // ---- helpers ------------------------------------------------------------

    private static AsolNotificationRecord record(String uid, String notificationId, String dedupeKey) {
        return record(uid, notificationId, dedupeKey, System.currentTimeMillis());
    }

    private static AsolNotificationRecord record(
        String uid,
        String notificationId,
        String dedupeKey,
        long receivedAt
    ) {
        Map<String, String> data = new HashMap<>();
        data.put("uid", uid);
        data.put("notificationId", notificationId);
        data.put("dedupeKey", dedupeKey);
        data.put("title", "ASOL instrumented");
        data.put("body", "body for " + notificationId);
        data.put("category", "orders");
        data.put("priority", "high");
        data.put("sound", "default");
        data.put("routeHref", "/orders/" + notificationId);
        AsolNotificationRecord built =
            AsolNotificationRecord.fromData(data, "", "", "fallback", receivedAt);
        assertNotNull(built);
        return built;
    }

    private static byte[] readFile(java.io.File file) {
        try (java.io.FileInputStream stream = new java.io.FileInputStream(file)) {
            java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
            byte[] chunk = new byte[4096];
            int read;
            while ((read = stream.read(chunk)) != -1) buffer.write(chunk, 0, read);
            return buffer.toByteArray();
        } catch (java.io.IOException error) {
            throw new AssertionError("The inbox file could not be read", error);
        }
    }

}
