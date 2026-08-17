package hgh.asol.app;

import com.getcapacitor.Bridge;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

@CapacitorPlugin(name = "NativeCrash")
public class NativeCrashPlugin extends Plugin {

    private static NativeCrashPlugin instance;

    @Override
    public void load() {
        instance = this;
        NativeCrashReporter.install();
        dispatchPending();
    }

    @PluginMethod
    public void reportTestCrash(PluginCall call) {
        NativeCrashReporter.record(
            "plugin-test",
            new RuntimeException("Native crash test payload")
        );
        call.resolve();
    }

    static void dispatchPayload(JSONObject payload) {
        NativeCrashPlugin plugin = instance;
        if (plugin == null) {
            NativeCrashStore.enqueue(payload);
            return;
        }
        plugin.dispatch(payload);
    }

    private void dispatchPending() {
        for (JSONObject payload : NativeCrashStore.drain()) {
            dispatch(payload);
        }
    }

    private void dispatch(JSONObject payload) {
        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) {
            NativeCrashStore.enqueue(payload);
            return;
        }
        String script =
            "window.dispatchEvent(new CustomEvent('asol:native-crash', { detail: "
                + payload.toString()
                + " }));";
        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(script, null));
    }
}
