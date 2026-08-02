package hgh.asol.app;

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

/**
 * Single responsibility: hand one signed OTA bundle to Android's durable
 * system downloader and reconnect JavaScript to that same task after restart.
 */
@CapacitorPlugin(name = "BackgroundDownload")
public class BackgroundDownloadPlugin extends Plugin {
    private static final String PREFS = "asol_ota_background_downloads";
    private static final String ACTIVE_RELEASE = "active_release";

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
        Long size = call.getLong("size");
        if (!validReleaseId(releaseId) || url == null || !url.startsWith("https://") ||
                sha256 == null || !sha256.matches("(?i)[a-f0-9]{64}") || size == null || size <= 0) {
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
                result.put("status", "completed");
                result.put("filePath", prefs().getString(pathKey(releaseId), null));
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
                .remove(hashKey(releaseId)).remove(sizeKey(releaseId));
        if (releaseId.equals(prefs.getString(ACTIVE_RELEASE, null))) editor.remove(ACTIVE_RELEASE);
        editor.apply();
    }

    private SharedPreferences prefs() { return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    private String idKey(String id) { return id + ":id"; }
    private String pathKey(String id) { return id + ":path"; }
    private String hashKey(String id) { return id + ":sha256"; }
    private String sizeKey(String id) { return id + ":size"; }
}
