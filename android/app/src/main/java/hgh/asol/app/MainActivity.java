package hgh.asol.app;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * Thin entrypoint delegating lifecycle events, startup channel creation,
 * plugin registration, and tap protocol to packages/native-core.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        AsolNativeCore.onPreCreate(this);
        super.onCreate(savedInstanceState);
        AsolNativeCore.onPostCreate(this, getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        AsolNativeCore.onNewIntent(this, getBridge(), intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        AsolNativeCore.onResume();
    }

    @Override
    public void onPause() {
        AsolNativeCore.onPause();
        super.onPause();
    }
}
