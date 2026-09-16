package hgh.asol.app;

import android.content.Context;
import android.util.Log;

import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Recognizes the verification SMS dispatch signal and queues the local work.
 *
 * This is the only thing the push path does with such a message: no OTP, no
 * destination number, no account policy, and no WebView. The signal carries an
 * opaque challenge id, an opaque dispatch id, and a short-lived signed ticket;
 * everything that matters is fetched by {@link AsolVerificationSmsWorker} from
 * the server, over the ticket, on this device only.
 *
 * <p><b>Key names.</b> They repeat the literals in
 * {@code packages/verification-core/src/sms-dispatch-contract.ts} because Java
 * cannot import that module. The dispatch-contract parity test reads both files
 * and fails the build if they drift.
 *
 * <p><b>Duplicates.</b> Firebase may deliver the same message more than once, and
 * a cold-started process has no memory of an earlier delivery. Unique work keyed
 * by dispatch id with {@code KEEP} collapses those into one execution; the
 * persistent claim in {@link AsolVerificationSmsGateway} catches what survives a
 * reboot or a WorkManager database reset.
 */
public final class AsolVerificationSmsDispatch {

    private static final String TAG = "AsolVerificationSms";

    static final String EVENT = "verification_sms_dispatch_requested";
    static final int CONTRACT_VERSION = 1;
    static final String DATA_EVENT = "meta_verificationEvent";
    static final String DATA_VERSION = "meta_verificationVersion";
    static final String DATA_CHALLENGE_ID = "meta_verificationChallengeId";
    static final String DATA_DISPATCH_ID = "meta_verificationDispatchId";
    static final String DATA_DISPATCH_TICKET = "meta_verificationDispatchTicket";

    static final String WORK_PREFIX = "asol-verification-sms-";

    private AsolVerificationSmsDispatch() {}

    /** True when this data map is a verification dispatch signal this build understands. */
    public static boolean isDispatchSignal(Map<String, String> data) {
        if (data == null) return false;
        return EVENT.equals(trim(data.get(DATA_EVENT)));
    }

    /**
     * Enqueues the dispatch, returning false when the signal is unusable.
     *
     * A signal this build does not understand is dropped rather than guessed at:
     * a future contract version may mean different fields, and sending an SMS on
     * a guess is not a recoverable mistake.
     */
    public static boolean enqueue(Context context, Map<String, String> data) {
        if (!isDispatchSignal(data)) return false;

        int version = parseVersion(trim(data.get(DATA_VERSION)));
        if (version != CONTRACT_VERSION) {
            Log.w(TAG, "A verification dispatch signal used an unsupported contract version.");
            return false;
        }

        String challengeId = trim(data.get(DATA_CHALLENGE_ID));
        String dispatchId = trim(data.get(DATA_DISPATCH_ID));
        String dispatchTicket = trim(data.get(DATA_DISPATCH_TICKET));
        if (challengeId.isEmpty() || dispatchId.isEmpty() || dispatchTicket.isEmpty()) {
            Log.w(TAG, "A verification dispatch signal was incomplete.");
            return false;
        }

        Data input = new Data.Builder()
            .putString(AsolVerificationSmsWorker.INPUT_CHALLENGE_ID, challengeId)
            .putString(AsolVerificationSmsWorker.INPUT_DISPATCH_ID, dispatchId)
            .putString(AsolVerificationSmsWorker.INPUT_DISPATCH_TICKET, dispatchTicket)
            .build();

        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(AsolVerificationSmsWorker.class)
            .setInputData(input)
            // Redemption is an HTTP call, so there is nothing to do offline. The
            // challenge owns expiry, so a queued job that runs too late fails at
            // the server rather than sending a stale code.
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
            .addTag(WORK_PREFIX + dispatchId)
            .build();

        try {
            WorkManager.getInstance(context.getApplicationContext()).enqueueUniqueWork(
                WORK_PREFIX + dispatchId,
                // KEEP, not REPLACE: a duplicate push must not restart work that
                // may already have sent the message.
                ExistingWorkPolicy.KEEP,
                request
            );
            return true;
        } catch (RuntimeException error) {
            // Never the payload: only that queueing failed.
            Log.e(TAG, "A verification dispatch could not be queued.", error);
            return false;
        }
    }

    private static int parseVersion(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException error) {
            return -1;
        }
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
