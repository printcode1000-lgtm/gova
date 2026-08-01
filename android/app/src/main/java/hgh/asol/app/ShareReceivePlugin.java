package hgh.asol.app;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Bridges Android share intents into the web layer.
 *
 * Single responsibility: read ACTION_SEND / ACTION_SEND_MULTIPLE intents,
 * convert each item into a JSON payload, and hand it to JavaScript. All
 * validation, size policy, and queueing live in the TypeScript Share module —
 * this class only transports.
 *
 * Items that arrive before the WebView is ready are buffered and drained by
 * getPendingItems().
 */
@CapacitorPlugin(name = "ShareReceive")
public class ShareReceivePlugin extends Plugin {

    /** Hard cap mirrored from the TypeScript layer, enforced here too. */
    private static final long MAX_BYTES = 25L * 1024L * 1024L;

    private final List<JSObject> pending = new ArrayList<>();

    @Override
    public void load() {
        handleIntent(getActivity().getIntent());
    }

    /** Called by MainActivity when the app is already running. */
    public void onNewIntentReceived(Intent intent) {
        handleIntent(intent);
    }

    @PluginMethod
    public void getPendingItems(PluginCall call) {
        JSArray items = new JSArray();
        synchronized (pending) {
            for (JSObject item : pending) {
                items.put(item);
            }
        }
        JSObject result = new JSObject();
        result.put("items", items);
        call.resolve(result);
    }

    @PluginMethod
    public void clearPendingItems(PluginCall call) {
        synchronized (pending) {
            pending.clear();
        }
        call.resolve();
    }

    private void handleIntent(Intent intent) {
        if (intent == null) {
            return;
        }
        String action = intent.getAction();
        if (action == null) {
            return;
        }

        List<JSObject> collected = new ArrayList<>();

        if (Intent.ACTION_SEND.equals(action)) {
            JSObject item = readSingle(intent);
            if (item != null) {
                collected.add(item);
            }
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (uris != null) {
                for (Uri uri : uris) {
                    JSObject item = readUri(uri);
                    if (item != null) {
                        collected.add(item);
                    }
                }
            }
        }

        if (collected.isEmpty()) {
            return;
        }

        // Consume the intent so a configuration change cannot replay it.
        intent.setAction(null);
        intent.removeExtra(Intent.EXTRA_STREAM);
        intent.removeExtra(Intent.EXTRA_TEXT);

        if (getBridge() == null) {
            synchronized (pending) {
                pending.addAll(collected);
            }
            return;
        }

        for (JSObject item : collected) {
            notifyListeners("shareReceived", item, true);
        }
    }

    private JSObject readSingle(Intent intent) {
        Uri stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (stream != null) {
            return readUri(stream);
        }

        CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        if (text == null) {
            return null;
        }

        String value = text.toString().trim();
        if (value.isEmpty()) {
            return null;
        }

        JSObject item = new JSObject();
        boolean looksLikeUrl = value.startsWith("http://") || value.startsWith("https://");
        item.put("type", looksLikeUrl ? "url" : "text");
        item.put("value", value);
        return item;
    }

    private JSObject readUri(Uri uri) {
        if (uri == null) {
            return null;
        }

        ContentResolver resolver = getContext().getContentResolver();
        String mimeType = resolver.getType(uri);
        if (mimeType == null) {
            mimeType = "application/octet-stream";
        }

        String name = queryDisplayName(resolver, uri);

        try (InputStream input = resolver.openInputStream(uri)) {
            if (input == null) {
                return null;
            }

            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            long total = 0;
            int read;
            while ((read = input.read(chunk)) != -1) {
                total += read;
                if (total > MAX_BYTES) {
                    // Oversized payloads are dropped rather than truncated,
                    // so the web layer never receives a corrupt file.
                    return null;
                }
                buffer.write(chunk, 0, read);
            }

            JSObject item = new JSObject();
            item.put("type", "file");
            item.put("mimeType", mimeType);
            item.put("name", name);
            item.put("data", Base64.encodeToString(buffer.toByteArray(), Base64.NO_WRAP));
            return item;
        } catch (Exception error) {
            return null;
        }
    }

    private String queryDisplayName(ContentResolver resolver, Uri uri) {
        try (Cursor cursor = resolver.query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    String value = cursor.getString(index);
                    if (value != null && !value.isEmpty()) {
                        return value;
                    }
                }
            }
        } catch (Exception ignored) {
            // Fall through to the generated name below.
        }
        return "shared-" + System.currentTimeMillis();
    }
}
