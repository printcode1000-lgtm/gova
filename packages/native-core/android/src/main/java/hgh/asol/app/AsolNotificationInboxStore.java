package hgh.asol.app;

import android.content.Context;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * The device-local notification inbox.
 *
 * <h2>What this is, and what it is deliberately not</h2>
 *
 * It is a <em>temporary handoff buffer</em>, not a notification history. The
 * permanent notification centre is IndexedDB/AsolDB inside the WebView, and
 * nothing about a notification is ever stored in Turso, on a server, or in any
 * remote inbox. This class exists for the one window in which IndexedDB cannot
 * be reached at all: a push arrives while the WebView, and usually the whole
 * process, is dead. JavaScript cannot run, so nothing can be persisted where it
 * belongs — and Android's own notification tray is not a durable substitute,
 * because a tapped auto-cancel notification leaves the tray before any code of
 * ours gets to read it.
 *
 * A record therefore lives here only from "FCM handed us a message" until "the
 * WebView confirmed it wrote the notification to IndexedDB", and is deleted at
 * that acknowledgement and at no other time.
 *
 * <h2>Where it is stored</h2>
 *
 * One file below {@link Context#getFilesDir()}, which is application-private
 * storage: no other application, and no user without root, can read it. It is
 * additionally encrypted with AES-256-GCM under a key that is generated inside
 * the AndroidKeyStore and never leaves it, so a device backup or a raw flash
 * dump yields ciphertext. Encryption is best-effort by design: a device whose
 * keystore refuses to produce a key still gets a working inbox in private
 * storage rather than losing notifications, and the degradation is recorded in
 * the file header rather than guessed at on read.
 *
 * <h2>Ownership and isolation</h2>
 *
 * Every record carries the uid the push was addressed to. Reads are always
 * filtered by uid, so a record can never be handed to a different signed-in
 * user, and a record whose owner is not currently signed in simply waits. Sign
 * out does not delete anything; only an explicit local-data wipe does.
 *
 * <h2>Retention</h2>
 *
 * Bounded and deterministic: at most {@link #MAX_RECORDS} records and at most
 * {@link #MAX_AGE_MS} of age. Expiry is applied first, then the oldest records
 * are dropped — so an eviction never removes a newer unacknowledged record in
 * order to keep an older one.
 *
 * <h2>Privacy of logs</h2>
 *
 * Nothing in this class ever logs a title, a body, a route, metadata, a token,
 * or a uid. Failures are logged as the operation that failed and nothing else.
 */
public final class AsolNotificationInboxStore {
    private static final String TAG = "AsolNotifications";

    private static final String DIRECTORY = "asol_notification_inbox";
    private static final String FILE_NAME = "inbox.bin";

    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "asol_notification_inbox_key";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;
    private static final int IV_BYTES = 12;

    /** Plain JSON in application-private storage; the keystore was unusable. */
    private static final byte FORMAT_PLAIN = 1;
    /** AES-256-GCM under an AndroidKeyStore key. The normal case. */
    private static final byte FORMAT_ENCRYPTED = 2;

    /** Hard ceiling on stored records. Documented in the notification system doc. */
    public static final int MAX_RECORDS = 200;
    /** Hard ceiling on record age: fourteen days. */
    public static final long MAX_AGE_MS = 14L * 24L * 60L * 60L * 1000L;

    /**
     * One writer at a time, process-wide.
     *
     * {@code onMessageReceived} runs on a Firebase worker thread while the
     * bridge's acknowledgement runs on the WebView thread. Without this the two
     * read-modify-write cycles interleave and an acknowledgement silently
     * deletes a message that arrived between the read and the write.
     */
    private static final Object LOCK = new Object();

    private AsolNotificationInboxStore() {}

    // ---- public API ---------------------------------------------------------

    /**
     * Persist one record, replacing any earlier record with the same id.
     *
     * Called before the system notification is posted, so a process death
     * between receipt and display still leaves the notification recoverable.
     *
     * @return true when the record is on disk.
     */
    public static boolean enqueue(Context context, AsolNotificationRecord record) {
        if (record == null || record.recordId.isEmpty()) return false;
        synchronized (LOCK) {
            try {
                // A decode/read failure must fail closed. Treating an unreadable
                // existing inbox as an empty one would overwrite every pending
                // record with only the newly arrived notification.
                List<AsolNotificationRecord> records = readStrictUnlocked(context);
                for (int index = records.size() - 1; index >= 0; index -= 1) {
                    if (records.get(index).recordId.equals(record.recordId)) {
                        records.remove(index);
                    }
                }
                records.add(record);
                writeUnlocked(context, applyRetention(records, System.currentTimeMillis()));
                return true;
            } catch (IOException | RuntimeException error) {
                // Never the payload: only that persistence failed.
                Log.e(TAG, "The notification inbox record could not be persisted.", error);
                return false;
            }
        }
    }

    /**
     * Every pending record owned by {@code uid}, oldest first.
     *
     * Oldest first because that is the order the notification centre should
     * receive them in; an empty uid returns nothing rather than everything.
     */
    public static List<AsolNotificationRecord> listForUid(Context context, String uid) {
        List<AsolNotificationRecord> owned = new ArrayList<>();
        if (uid == null || uid.trim().isEmpty()) return owned;
        String wanted = uid.trim();
        synchronized (LOCK) {
            List<AsolNotificationRecord> records = readUnlocked(context);
            List<AsolNotificationRecord> retained = applyRetention(records, System.currentTimeMillis());
            if (retained.size() != records.size()) {
                try {
                    writeUnlocked(context, retained);
                } catch (IOException | RuntimeException error) {
                    Log.e(TAG, "Expired notification inbox records could not be pruned.", error);
                }
            }
            for (AsolNotificationRecord record : retained) {
                if (wanted.equals(record.uid)) owned.add(record);
            }
        }
        Collections.sort(owned, new Comparator<AsolNotificationRecord>() {
            @Override
            public int compare(AsolNotificationRecord left, AsolNotificationRecord right) {
                return Long.compare(left.receivedAt, right.receivedAt);
            }
        });
        return owned;
    }

    /**
     * Delete records the WebView has confirmed are in IndexedDB.
     *
     * Scoped by uid as well as by id: an acknowledgement is only ever valid for
     * the user it was produced for, so a signed-in user cannot retire another
     * user's pending notification even if it could guess the id.
     *
     * @return how many records were removed.
     */
    public static int acknowledge(Context context, String uid, Set<String> recordIds) {
        if (uid == null || uid.trim().isEmpty() || recordIds == null || recordIds.isEmpty()) {
            return 0;
        }
        String owner = uid.trim();
        synchronized (LOCK) {
            List<AsolNotificationRecord> records = readUnlocked(context);
            List<AsolNotificationRecord> retained = new ArrayList<>(records.size());
            int removed = 0;
            for (AsolNotificationRecord record : records) {
                if (owner.equals(record.uid) && recordIds.contains(record.recordId)) {
                    removed += 1;
                    continue;
                }
                retained.add(record);
            }
            if (removed > 0) {
                try {
                    writeUnlocked(context, retained);
                } catch (IOException | RuntimeException error) {
                    // The records stay on disk, so the next import retries them.
                    // A duplicate import is harmless; a lost one is not.
                    Log.e(TAG, "Acknowledged notification inbox records could not be removed.", error);
                    return 0;
                }
            }
            return removed;
        }
    }

    /** Look up a single record by id, for the cold-start tap handshake. */
    public static AsolNotificationRecord find(Context context, String recordId) {
        if (recordId == null || recordId.isEmpty()) return null;
        synchronized (LOCK) {
            for (AsolNotificationRecord record : readUnlocked(context)) {
                if (record.recordId.equals(recordId)) return record;
            }
        }
        return null;
    }

    /**
     * Erase the inbox completely.
     *
     * This is what "delete my account" and "clear all local data" call. It is
     * not what sign-out calls: a pending notification belongs to the user it was
     * addressed to, and waiting for that user to sign in again is correct.
     */
    public static boolean clearAll(Context context) {
        synchronized (LOCK) {
            File file = storeFile(context);
            new AtomicFile(file).delete();
            boolean cleared =
                !file.exists()
                && !new File(file.getPath() + ".bak").exists()
                && !new File(file.getPath() + ".new").exists();
            if (!cleared) {
                Log.e(TAG, "The notification inbox file could not be deleted.");
            }
            return cleared;
        }
    }

    /** Total pending record count, for diagnostics. Carries no content. */
    public static int size(Context context) {
        synchronized (LOCK) {
            return readUnlocked(context).size();
        }
    }

    /**
     * A stable, opaque id for a record.
     *
     * Derived rather than random so the same message redelivered by FCM — which
     * Firebase does on its own schedule — replaces its earlier copy instead of
     * producing a second pending record. Hashed so the value can appear in an
     * Intent extra, a log, or a bridge payload without carrying the uid.
     */
    public static String recordId(String uid, String notificationId) {
        String material = (uid == null ? "" : uid) + "\n" + (notificationId == null ? "" : notificationId);
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(material.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte value : hash) hex.append(String.format(Locale.US, "%02x", value));
            return hex.substring(0, 32);
        } catch (GeneralSecurityException error) {
            // SHA-256 is mandated by every Android release; this cannot happen,
            // but a working inbox must not depend on that being true.
            return Integer.toHexString(material.hashCode());
        }
    }

    // ---- retention ----------------------------------------------------------

    /**
     * Age limit first, then count limit, dropping oldest.
     *
     * The order is the guarantee: trimming by count alone could discard a fresh
     * unacknowledged record while keeping stale ones, and doing it the other way
     * round would let expired records occupy the budget.
     */
    static List<AsolNotificationRecord> applyRetention(
        List<AsolNotificationRecord> records,
        long now
    ) {
        List<AsolNotificationRecord> fresh = new ArrayList<>(records.size());
        for (AsolNotificationRecord record : records) {
            if (now - record.receivedAt <= MAX_AGE_MS) fresh.add(record);
        }
        Collections.sort(fresh, new Comparator<AsolNotificationRecord>() {
            @Override
            public int compare(AsolNotificationRecord left, AsolNotificationRecord right) {
                return Long.compare(left.receivedAt, right.receivedAt);
            }
        });
        if (fresh.size() <= MAX_RECORDS) return fresh;
        return new ArrayList<>(fresh.subList(fresh.size() - MAX_RECORDS, fresh.size()));
    }

    // ---- file access --------------------------------------------------------

    private static File storeDirectory(Context context) {
        File directory = new File(context.getFilesDir(), DIRECTORY);
        if (!directory.exists() && !directory.mkdirs()) {
            Log.e(TAG, "The notification inbox directory could not be created.");
        }
        return directory;
    }

    private static File storeFile(Context context) {
        return new File(storeDirectory(context), FILE_NAME);
    }

    private static List<AsolNotificationRecord> readUnlocked(Context context) {
        try {
            return readStrictUnlocked(context);
        } catch (IOException | RuntimeException error) {
            Log.e(TAG, "The notification inbox file could not be read.", error);
            return new ArrayList<>();
        }
    }

    private static List<AsolNotificationRecord> readStrictUnlocked(Context context)
        throws IOException {
        List<AsolNotificationRecord> records = new ArrayList<>();
        File file = storeFile(context);
        // AtomicFile may need to restore its backup after a process died between
        // startWrite() and finishWrite(). Do not decide "empty" from the base
        // file alone, because the complete previous value may live in .bak.
        if (!file.exists() && !new File(file.getPath() + ".bak").exists()) return records;

        byte[] raw = readAllBytes(new AtomicFile(file));
        if (raw.length < 1) return records;

        String json;
        try {
            json = decode(raw);
        } catch (GeneralSecurityException | IOException | RuntimeException error) {
            // Unreadable content is dropped rather than retried forever. This is
            // reachable only when the keystore key was invalidated (a device
            // credential reset), in which case the ciphertext is gone for good.
            throw new IOException("The notification inbox file could not be decoded.", error);
        }

        try {
            JSONArray array = new JSONArray(json);
            for (int index = 0; index < array.length(); index += 1) {
                JSONObject item = array.optJSONObject(index);
                if (item == null) continue;
                AsolNotificationRecord record = AsolNotificationRecord.fromJson(item);
                if (record != null) records.add(record);
            }
        } catch (JSONException error) {
            throw new IOException("The notification inbox file is not valid JSON.", error);
        }
        return records;
    }

    /**
     * Replace the file atomically.
     *
     * Android's AtomicFile keeps the previous complete inbox until the new file
     * has been flushed and committed, and restores it after an interrupted write.
     */
    private static void writeUnlocked(Context context, List<AsolNotificationRecord> records)
        throws IOException {
        JSONArray array = new JSONArray();
        for (AsolNotificationRecord record : records) {
            try {
                array.put(record.toStorageJson());
            } catch (JSONException error) {
                // A record that cannot be encoded is skipped rather than taking
                // the whole file down with it. Nothing about it is logged.
                Log.e(TAG, "A notification inbox record could not be encoded.", error);
            }
        }

        byte[] encoded = encode(array.toString());
        File target = storeFile(context);
        AtomicFile atomic = new AtomicFile(target);
        FileOutputStream stream = null;
        try {
            stream = atomic.startWrite();
            stream.write(encoded);
            stream.flush();
            atomic.finishWrite(stream);
        } catch (IOException | RuntimeException error) {
            if (stream != null) atomic.failWrite(stream);
            throw error;
        }
    }

    private static byte[] readAllBytes(AtomicFile file) throws IOException {
        // openRead() performs AtomicFile's interrupted-write recovery before it
        // exposes bytes to the decoder.
        FileInputStream stream = file.openRead();
        try {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int read;
            while ((read = stream.read(chunk)) != -1) buffer.write(chunk, 0, read);
            return buffer.toByteArray();
        } finally {
            stream.close();
        }
    }

    // ---- encryption ---------------------------------------------------------

    private static byte[] encode(String json) throws IOException {
        byte[] plaintext = json.getBytes(StandardCharsets.UTF_8);
        SecretKey key = secretKeyOrNull();
        if (key == null) {
            ByteArrayOutputStream out = new ByteArrayOutputStream(plaintext.length + 1);
            out.write(FORMAT_PLAIN);
            out.write(plaintext);
            return out.toByteArray();
        }
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key);
            byte[] iv = cipher.getIV();
            byte[] ciphertext = cipher.doFinal(plaintext);
            ByteArrayOutputStream out = new ByteArrayOutputStream(1 + iv.length + ciphertext.length);
            out.write(FORMAT_ENCRYPTED);
            out.write(iv);
            out.write(ciphertext);
            return out.toByteArray();
        } catch (GeneralSecurityException error) {
            Log.e(TAG, "The notification inbox could not be encrypted; storing it privately instead.", error);
            ByteArrayOutputStream out = new ByteArrayOutputStream(plaintext.length + 1);
            out.write(FORMAT_PLAIN);
            out.write(plaintext);
            return out.toByteArray();
        }
    }

    private static String decode(byte[] raw) throws GeneralSecurityException, IOException {
        byte format = raw[0];
        if (format == FORMAT_PLAIN) {
            return new String(raw, 1, raw.length - 1, StandardCharsets.UTF_8);
        }
        if (format != FORMAT_ENCRYPTED || raw.length < 1 + IV_BYTES) {
            throw new IOException("Unrecognized notification inbox format.");
        }
        SecretKey key = secretKeyOrNull();
        if (key == null) throw new GeneralSecurityException("The inbox key is unavailable.");
        byte[] iv = new byte[IV_BYTES];
        System.arraycopy(raw, 1, iv, 0, IV_BYTES);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
        byte[] plaintext = cipher.doFinal(raw, 1 + IV_BYTES, raw.length - 1 - IV_BYTES);
        return new String(plaintext, StandardCharsets.UTF_8);
    }

    /**
     * The AES key, created on first use inside the AndroidKeyStore.
     *
     * Not user-authentication bound: the message arrives while the device may be
     * locked, and a key that cannot be used on a locked device would mean no
     * inbox at exactly the moment the inbox exists for.
     *
     * @return null when this device cannot provide one, which switches the file
     * to unencrypted application-private storage rather than losing the inbox.
     */
    private static SecretKey secretKeyOrNull() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return null;
        try {
            KeyStore keyStore = KeyStore.getInstance(KEYSTORE);
            keyStore.load(null);
            KeyStore.Entry entry = keyStore.getEntry(KEY_ALIAS, null);
            if (entry instanceof KeyStore.SecretKeyEntry) {
                return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
            }
            KeyGenerator generator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                KEYSTORE
            );
            generator.init(
                new KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .setUserAuthenticationRequired(false)
                    .build()
            );
            return generator.generateKey();
        } catch (GeneralSecurityException | IOException | RuntimeException error) {
            Log.e(TAG, "The notification inbox encryption key is unavailable.", error);
            return null;
        }
    }
}
