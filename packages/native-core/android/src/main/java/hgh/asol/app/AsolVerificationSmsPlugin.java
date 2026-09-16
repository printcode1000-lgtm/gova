package hgh.asol.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Tells this device which API origin to redeem verification dispatches against.
 *
 * The origin is not compiled in on purpose. Java would then hold a second copy of
 * a value the application already configures, and the two would drift the first
 * time a deployment moved — with the failure showing up only as verification
 * SMS that silently stop. The web layer knows the origin it is actually calling,
 * so it hands that value over and Java persists it.
 *
 * Only the Super Admin's Android device ever calls this: on any other device the
 * stored origin is simply never used, because no dispatch signal is addressed
 * there.
 */
@CapacitorPlugin(name = "AsolVerificationSms")
public class AsolVerificationSmsPlugin extends Plugin {

    @PluginMethod
    public void configureGateway(PluginCall call) {
        String apiBaseUrl = call.getString("apiBaseUrl", "");
        if (apiBaseUrl == null || apiBaseUrl.trim().isEmpty()) {
            call.reject("apiBaseUrl is required");
            return;
        }
        AsolVerificationSmsGateway.setApiBaseUrl(getContext(), apiBaseUrl);
        JSObject result = new JSObject();
        result.put("configured", true);
        call.resolve(result);
    }

    /** Lets the web layer confirm the gateway is wired without exposing anything else. */
    @PluginMethod
    public void gatewayStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("configured", !AsolVerificationSmsGateway.apiBaseUrl(getContext()).isEmpty());
        call.resolve(result);
    }
}
