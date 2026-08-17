package hgh.asol.app;

import android.util.Log;
import org.json.JSONObject;

/** Records native crashes and forwards them to the WebView as `asol:native-crash`. */
final class NativeCrashReporter {

    private static final String TAG = "NativeCrashReporter";
    private static volatile boolean installed = false;
    private static volatile Thread.UncaughtExceptionHandler previousHandler;

    private NativeCrashReporter() {}

    static void install() {
        if (installed) {
            return;
        }
        installed = true;
        previousHandler = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(
            (thread, throwable) -> {
                try {
                    record("uncaught-exception", throwable);
                } catch (RuntimeException error) {
                    Log.e(TAG, "Failed to record uncaught exception", error);
                }
                if (previousHandler != null) {
                    previousHandler.uncaughtException(thread, throwable);
                }
            }
        );
    }

    static void record(String operation, Throwable throwable) {
        JSONObject payload = new JSONObject();
        try {
            payload.put("name", throwable.getClass().getSimpleName());
            payload.put(
                "message",
                throwable.getMessage() == null ? "Native crash" : throwable.getMessage()
            );
            payload.put("operation", operation);
            payload.put("stack", Log.getStackTraceString(throwable));
        } catch (Exception error) {
            Log.e(TAG, "Failed to build crash payload", error);
            return;
        }
        NativeCrashPlugin.dispatchPayload(payload);
    }
}
