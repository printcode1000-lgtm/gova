package hgh.asol.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.work.Data;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

/**
 * Receives SMS Sender's send result and forwards it as a dispatch status.
 *
 * The result is observability, never authority: whether an OTP is valid stays a
 * server decision made when the code is verified. Nothing here can resend, and a
 * result that never arrives changes nothing — the worker already reported that it
 * handed the message over.
 *
 * <p>The installed SMS Sender build does not emit this broadcast. The receiver is
 * declared anyway so an authenticated SMS Sender build that adds
 * {@code SEND_RESULT} starts reporting delivery state without a Gova change; until
 * then it simply never fires.
 */
public final class AsolVerificationSmsResultReceiver extends BroadcastReceiver {

    private static final String TAG = "AsolVerificationSms";

    static final String ACTION = "com.hesham.smssender.action.SEND_RESULT";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION.equals(intent.getAction())) return;
        String requestId = trim(intent.getStringExtra("request_id"));
        if (requestId.isEmpty()) return;

        Data input = new Data.Builder()
            .putString(AsolVerificationSmsStatusWorker.INPUT_REQUEST_ID, requestId)
            .putString(AsolVerificationSmsStatusWorker.INPUT_STATUS, trim(intent.getStringExtra("status")))
            .putString(AsolVerificationSmsStatusWorker.INPUT_ERROR_CODE, trim(intent.getStringExtra("error_code")))
            .putString(AsolVerificationSmsStatusWorker.INPUT_DELIVERY_STATE, trim(intent.getStringExtra("delivery_state")))
            .build();

        try {
            // Reported from a worker, not from onReceive: a broadcast receiver has
            // about ten seconds of process time and an HTTP call can outlive it.
            WorkManager.getInstance(context.getApplicationContext()).enqueue(
                new OneTimeWorkRequest.Builder(AsolVerificationSmsStatusWorker.class).setInputData(input).build()
            );
        } catch (RuntimeException error) {
            Log.w(TAG, "A verification SMS result could not be queued for reporting.");
        }
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
