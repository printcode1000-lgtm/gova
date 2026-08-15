package hgh.asol.app;

import android.os.StatFs;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StorageCapacity")
public class StorageCapacityPlugin extends Plugin {
    @PluginMethod
    public void getFreeSpace(PluginCall call) {
        try {
            long availableBytes = new StatFs(getContext().getFilesDir().getAbsolutePath()).getAvailableBytes();
            JSObject result = new JSObject();
            result.put("availableBytes", availableBytes);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to measure available storage", error);
        }
    }
}
