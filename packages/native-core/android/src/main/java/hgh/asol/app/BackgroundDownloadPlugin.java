package hgh.asol.app;

import hgh.asol.app.nativecore.R;

import android.app.DownloadManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Single responsibility: hand one signed OTA bundle to Android's durable
 * system downloader and reconnect JavaScript to that same task after restart.
 */
@CapacitorPlugin(name = "BackgroundDownload")
public class BackgroundDownloadPlugin extends Plugin {
    private static final String PREFS = "asol_ota_background_downloads";
    private static final String ACTIVE_RELEASE = "active_release";
    private static final ExecutorService HASH_EXECUTOR = Executors.newSingleThreadExecutor();
    private static final Set<String> ACTIVE_VERIFICATIONS = ConcurrentHashMap.newKeySet();

    @Override
    public void load() {
        // DownloadManager survives normal process death and reboot, but Android
        // Force Stop intentionally blocks recovery until the user relaunches ASOL.
    }

    @com.getcapacitor.PluginMethod
    public void schedule(PluginCall call) {
        String releaseId = call.getString("releaseId");
        String url = call.getString("url");
        String sha256 = call.getString("sha256");
        // `call.getLong` returns its default unless the JSON value is literally a
        // Long, and a bundle size below ~2.1 GB parses as an Integer — so it
        // answered null for every realistic release and this method rejected
        // every download. optLong coerces whatever number arrived.
        long size = call.getData().optLong("size", -1L);
        if (!validReleaseId(releaseId) || url == null || !url.startsWith("https://") ||
                sha256 == null || !sha256.matches("(?i)[a-f0-9]{64}") || size <= 0) {
            call.reject("Invalid background download request");
            return;
        }

        SharedPreferences prefs = prefs();
        String activeRelease = prefs.getString(ACTIVE_RELEASE, null);
        if (activeRelease != null && !activeRelease.equals(releaseId)) {
            clearRelease(prefs, activeRelease, true);
        }
        long existing = prefs.getLong(idKey(releaseId), -1L);
        if (existing >= 0) {
            JSObject current = snapshot(releaseId, existing);
            if (!"missing".equals(current.optString("status"))) {
                call.resolve(current);
                return;
            }
            // DownloadManager can discard a row after Force Stop or system
            // cleanup. A stale id must not prevent recovery on the next launch.
            clearRelease(prefs, releaseId, false);
        }

        File externalDownloads = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (externalDownloads == null) {
            call.reject("External app storage is unavailable");
            return;
        }
        File directory = new File(externalDownloads, "asol-ota");
        if (!directory.exists() && !directory.mkdirs()) {
            call.reject("Unable to create OTA download directory");
            return;
        }
        File destination = new File(directory, releaseId + ".zip");
        if (destination.exists()) destination.delete();

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setAllowedOverMetered(true);
        request.setAllowedOverRoaming(false);
        // AOSP reserves DOWNLOAD_WITHOUT_NOTIFICATION for platform-signed
        // apps. Use hidden mode only when an OEM granted it; otherwise retain
        // a functional system-managed download with its running notification.
        boolean canHide = getContext().checkSelfPermission(
                "android.permission.DOWNLOAD_WITHOUT_NOTIFICATION") == PackageManager.PERMISSION_GRANTED;
        request.setNotificationVisibility(canHide
                ? DownloadManager.Request.VISIBILITY_HIDDEN
                : DownloadManager.Request.VISIBILITY_VISIBLE);
        request.setDestinationUri(Uri.fromFile(destination));
        request.setTitle("ASOL update");

        try {
            DownloadManager manager = manager();
            long id = manager.enqueue(request);
            prefs.edit()
                    .putString(ACTIVE_RELEASE, releaseId)
                    .putLong(idKey(releaseId), id)
                    .putString(pathKey(releaseId), destination.getAbsolutePath())
                    .putString(hashKey(releaseId), sha256)
                    .putLong(sizeKey(releaseId), size)
                    .putString(verificationKey(releaseId), "pending")
                    .remove(errorKey(releaseId))
                    .apply();
            call.resolve(snapshot(releaseId, id));
        } catch (Exception error) {
            call.reject("Unable to schedule background download", error);
        }
    }

    @com.getcapacitor.PluginMethod
    public void status(PluginCall call) {
        String releaseId = call.getString("releaseId");
        if (!validReleaseId(releaseId)) {
            call.reject("Invalid release id");
            return;
        }
        long id = prefs().getLong(idKey(releaseId), -1L);
        if (id < 0) {
            call.resolve(missing(releaseId));
            return;
        }
        call.resolve(snapshot(releaseId, id));
    }

    @com.getcapacitor.PluginMethod
    public void remove(PluginCall call) {
        String releaseId = call.getString("releaseId");
        if (!validReleaseId(releaseId)) {
            call.reject("Invalid release id");
            return;
        }
        SharedPreferences prefs = prefs();
        long id = prefs.getLong(idKey(releaseId), -1L);
        clearRelease(prefs, releaseId, true);
        call.resolve();
    }

    private JSObject snapshot(String releaseId, long id) {
        JSObject result = new JSObject();
        result.put("id", String.valueOf(id));
        result.put("releaseId", releaseId);
        result.put("status", "missing");
        result.put("bytesDownloaded", 0);
        result.put("totalBytes", prefs().getLong(sizeKey(releaseId), 0L));
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(id);
        try (Cursor cursor = manager().query(query)) {
            if (cursor == null || !cursor.moveToFirst()) return result;
            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            long downloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            result.put("bytesDownloaded", Math.max(downloaded, 0));
            if (total > 0) result.put("totalBytes", total);
            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                applyVerificationSnapshot(releaseId, result);
            } else if (status == DownloadManager.STATUS_FAILED) {
                result.put("status", "failed");
                result.put("error", "Android DownloadManager failed the OTA transfer");
            } else if (status == DownloadManager.STATUS_RUNNING) result.put("status", "downloading");
            else result.put("status", "pending");
        }
        return result;
    }

    private JSObject missing(String releaseId) {
        JSObject result = new JSObject();
        result.put("id", "");
        result.put("releaseId", releaseId);
        result.put("status", "missing");
        result.put("bytesDownloaded", 0);
        result.put("totalBytes", 0);
        return result;
    }

    private void applyVerificationSnapshot(String releaseId, JSObject result) {
        SharedPreferences prefs = prefs();
        String verification = prefs.getString(verificationKey(releaseId), "pending");
        if ("completed".equals(verification)) {
            result.put("status", "completed");
            result.put("filePath", prefs.getString(pathKey(releaseId), null));
            return;
        }
        if ("failed".equals(verification)) {
            result.put("status", "failed");
            result.put("error", prefs.getString(errorKey(releaseId), "OTA bundle checksum mismatch"));
            return;
        }
        result.put("status", "verifying");
        if (ACTIVE_VERIFICATIONS.add(releaseId)) {
            prefs.edit().putString(verificationKey(releaseId), "verifying").apply();
            HASH_EXECUTOR.execute(() -> verifyDownloadedFile(releaseId));
        }
    }

    private void verifyDownloadedFile(String releaseId) {
        SharedPreferences prefs = prefs();
        String path = prefs.getString(pathKey(releaseId), null);
        String expectedHash = prefs.getString(hashKey(releaseId), "");
        long expectedSize = prefs.getLong(sizeKey(releaseId), -1L);
        File file = path == null ? null : new File(path);
        try {
            if (file == null || !file.isFile()) throw new IllegalStateException("Downloaded OTA bundle is missing");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long actualSize = 0;
            byte[] buffer = new byte[64 * 1024];
            try (FileInputStream input = new FileInputStream(file)) {
                int read;
                while ((read = input.read(buffer)) != -1) {
                    digest.update(buffer, 0, read);
                    actualSize += read;
                }
            }
            StringBuilder actualHash = new StringBuilder(64);
            for (byte value : digest.digest()) actualHash.append(String.format(Locale.ROOT, "%02x", value & 0xff));
            if (actualSize != expectedSize || !actualHash.toString().equalsIgnoreCase(expectedHash)) {
                throw new IllegalStateException("OTA bundle checksum mismatch");
            }
            if (prefs.contains(idKey(releaseId))) {
                prefs.edit().putString(verificationKey(releaseId), "completed").remove(errorKey(releaseId)).apply();
            }
        } catch (Exception error) {
            if (file != null) file.delete();
            if (prefs.contains(idKey(releaseId))) {
                prefs.edit().putString(verificationKey(releaseId), "failed")
                        .putString(errorKey(releaseId), error.getMessage() == null ? "OTA bundle verification failed" : error.getMessage())
                        .apply();
            }
        } finally {
            ACTIVE_VERIFICATIONS.remove(releaseId);
        }
    }

    private boolean validReleaseId(String value) {
        return value != null && value.matches("[A-Za-z0-9._-]{1,160}");
    }

    private DownloadManager manager() {
        return (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
    }

    private void clearRelease(SharedPreferences prefs, String releaseId, boolean removeDownload) {
        long id = prefs.getLong(idKey(releaseId), -1L);
        if (removeDownload && id >= 0) manager().remove(id);
        String path = prefs.getString(pathKey(releaseId), null);
        if (path != null) new File(path).delete();
        SharedPreferences.Editor editor = prefs.edit()
                .remove(idKey(releaseId)).remove(pathKey(releaseId))
                .remove(hashKey(releaseId)).remove(sizeKey(releaseId))
                .remove(verificationKey(releaseId)).remove(errorKey(releaseId));
        if (releaseId.equals(prefs.getString(ACTIVE_RELEASE, null))) editor.remove(ACTIVE_RELEASE);
        editor.apply();
    }

    private SharedPreferences prefs() { return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    private String idKey(String id) { return id + ":id"; }
    private String pathKey(String id) { return id + ":path"; }
    private String hashKey(String id) { return id + ":sha256"; }
    private String sizeKey(String id) { return id + ":size"; }
    private String verificationKey(String id) { return id + ":verification"; }
    private String errorKey(String id) { return id + ":error"; }
}
