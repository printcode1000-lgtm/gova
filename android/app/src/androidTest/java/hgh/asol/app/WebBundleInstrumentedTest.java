package hgh.asol.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.res.AssetManager;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

/**
 * The web bundle as the installed package actually carries it.
 *
 * Everything else about the bundle is checked on a computer, against files in
 * the working tree. This asks the only question those checks cannot: did the
 * bundle survive the trip into the APK. A sync that silently copied nothing,
 * or resource shrinking that removed the assets, produces a package that
 * installs and launches to a blank screen — and no host-side check would
 * notice.
 */
@RunWith(AndroidJUnit4.class)
public class WebBundleInstrumentedTest {
    private static final String PUBLIC_DIRECTORY = "public";
    private static final String MANIFEST_NAME = "asol-web-manifest.json";
    /** Enough to catch a truncated or partial copy without a slow full scan. */
    private static final int SAMPLED_FILES = 25;

    @Test
    public void packagedBundleIsPresentAndComplete() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        AssetManager assets = context.getAssets();

        List<String> entries = Arrays.asList(assets.list(PUBLIC_DIRECTORY));
        assertTrue("The packaged web bundle must contain index.html", entries.contains("index.html"));
        assertTrue("The packaged web bundle must contain " + MANIFEST_NAME, entries.contains(MANIFEST_NAME));

        JSONObject manifest = new JSONObject(
            new String(readAsset(assets, PUBLIC_DIRECTORY + "/" + MANIFEST_NAME), "UTF-8")
        );

        String version = manifest.optString("version");
        assertFalse("The packaged manifest must carry a content version", version.isEmpty());
        assertFalse(
            "A diagnostic bundle skips the release audits and must never reach a device",
            manifest.optBoolean("diagnostic", false)
        );

        JSONObject files = manifest.optJSONObject("files");
        assertTrue("The packaged manifest must list its files", files != null && files.length() > 0);
        assertEquals(
            "The manifest file count must match the files it lists",
            manifest.optInt("fileCount", -1),
            files.length()
        );

        // A sample is enough: a broken sync loses everything, not one file.
        for (String relativePath : sample(files, SAMPLED_FILES)) {
            byte[] bytes = readAsset(assets, PUBLIC_DIRECTORY + "/" + relativePath);
            JSONObject entry = files.optJSONObject(relativePath);
            assertEquals(
                "Packaged asset size differs from the manifest: " + relativePath,
                entry.optLong("size", -1),
                (long) bytes.length
            );
        }
    }

    @Test
    public void packagedBundleMatchesTheShellItShipsIn() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        JSONObject manifest = new JSONObject(
            new String(readAsset(context.getAssets(), PUBLIC_DIRECTORY + "/" + MANIFEST_NAME), "UTF-8")
        );

        String installedNativeVersion = context
            .getPackageManager()
            .getPackageInfo(context.getPackageName(), 0)
            .versionName;
        String minimumNativeVersion = manifest.optString("minimumNativeVersion");

        assertFalse("The packaged manifest must declare a minimum native version", minimumNativeVersion.isEmpty());
        // The bundle inside a shell can never require a newer shell than the one
        // carrying it; that combination can only ship a feature that silently
        // does nothing on the device it was installed on.
        assertTrue(
            "Packaged bundle requires shell " + minimumNativeVersion
                + " but is installed in " + installedNativeVersion,
            compareVersions(installedNativeVersion, minimumNativeVersion) >= 0
        );
    }

    private static List<String> sample(JSONObject files, int limit) {
        List<String> paths = new ArrayList<>();
        Iterator<String> keys = files.keys();
        while (keys.hasNext() && paths.size() < limit) {
            paths.add(keys.next());
        }
        return paths;
    }

    private static byte[] readAsset(AssetManager assets, String path) throws IOException {
        try (InputStream stream = assets.open(path)) {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int read;
            while ((read = stream.read(chunk)) != -1) {
                buffer.write(chunk, 0, read);
            }
            return buffer.toByteArray();
        }
    }

    /** Component-wise, so a four-part content version orders correctly too. */
    private static int compareVersions(String left, String right) {
        String[] a = left.split("-")[0].split("\\.");
        String[] b = right.split("-")[0].split("\\.");
        for (int index = 0; index < Math.max(a.length, b.length); index += 1) {
            int difference = part(a, index) - part(b, index);
            if (difference != 0) {
                return difference;
            }
        }
        return 0;
    }

    private static int part(String[] parts, int index) {
        if (index >= parts.length) {
            return 0;
        }
        try {
            return Integer.parseInt(parts[index]);
        } catch (NumberFormatException error) {
            return 0;
        }
    }
}
