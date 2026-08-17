package hgh.asol.app;

import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Buffers native crash payloads until the WebView can receive them. */
final class NativeCrashStore {

    private static final List<JSONObject> pending = new ArrayList<>();

    private NativeCrashStore() {}

    static synchronized void enqueue(JSONObject payload) {
        pending.add(payload);
    }

    static synchronized List<JSONObject> drain() {
        if (pending.isEmpty()) {
            return Collections.emptyList();
        }
        List<JSONObject> copy = new ArrayList<>(pending);
        pending.clear();
        return copy;
    }
}
