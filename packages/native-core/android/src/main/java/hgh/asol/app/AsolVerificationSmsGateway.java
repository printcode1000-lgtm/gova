package hgh.asol.app;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Where this device's verification SMS gateway settings live.
 *
 * Two values, both app-private:
 *
 * <ul>
 *   <li>the API origin to redeem a dispatch against, written by the web layer
 *       through {@link AsolVerificationSmsPlugin} so Java never hardcodes an
 *       origin that could drift from the one the application actually calls; and</li>
 *   <li>the set of dispatch ids already handled, which is the last line of
 *       defence against one OTP becoming two SMS messages.</li>
 * </ul>
 *
 * Duplicate suppression is deliberately persistent rather than in-memory. A
 * duplicate push, a WorkManager retry, and a reboot are all cases where the
 * process that first handled the dispatch is gone, and an in-memory set would
 * have forgotten it.
 */
final class AsolVerificationSmsGateway {

    /** Unencrypted on purpose: the file holds an origin and opaque ids, no secret. */
    private static final String PREFS = "asol_verification_sms_gateway";
    private static final String KEY_API_BASE_URL = "api_base_url";
    private static final String KEY_HANDLED_PREFIX = "handled_";
    /** Handled ids older than this cannot be replayed anyway: the challenge has expired. */
    private static final long HANDLED_RETENTION_MS = 24L * 60L * 60L * 1000L;

    private AsolVerificationSmsGateway() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void setApiBaseUrl(Context context, String baseUrl) {
        String normalized = baseUrl == null ? "" : baseUrl.trim();
        while (normalized.endsWith("/")) normalized = normalized.substring(0, normalized.length() - 1);
        prefs(context).edit().putString(KEY_API_BASE_URL, normalized).apply();
    }

    static String apiBaseUrl(Context context) {
        return prefs(context).getString(KEY_API_BASE_URL, "");
    }

    /**
     * Claims a dispatch id for this process, atomically.
     *
     * Returns false when the id was already claimed, which is the signal to stop
     * before any SMS is sent. The synchronized block plus a blocking commit is
     * what makes two workers racing on the same id resolve to one winner.
     */
    static synchronized boolean claim(Context context, String dispatchId) {
        SharedPreferences store = prefs(context);
        String key = KEY_HANDLED_PREFIX + dispatchId;
        if (store.contains(key)) return false;
        pruneExpired(store);
        return store.edit().putLong(key, System.currentTimeMillis()).commit();
    }

    /** Releases a claim so a transient failure can be retried under the same id. */
    static synchronized void releaseClaim(Context context, String dispatchId) {
        prefs(context).edit().remove(KEY_HANDLED_PREFIX + dispatchId).commit();
    }

    private static void pruneExpired(SharedPreferences store) {
        long cutoff = System.currentTimeMillis() - HANDLED_RETENTION_MS;
        SharedPreferences.Editor editor = store.edit();
        boolean changed = false;
        for (String key : store.getAll().keySet()) {
            if (!key.startsWith(KEY_HANDLED_PREFIX)) continue;
            long at = store.getLong(key, 0L);
            if (at > 0L && at < cutoff) {
                editor.remove(key);
                changed = true;
            }
        }
        if (changed) editor.apply();
    }
}
