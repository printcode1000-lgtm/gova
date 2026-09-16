package hgh.asol.app;

import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONObject;

/**
 * Redeems one verification dispatch and asks SMS Sender to deliver the message.
 *
 * Runs without the WebView: a dispatch must complete while ASOL is backgrounded
 * or was never opened in this process. Everything it needs arrives as input data
 * or comes back from the redeem call.
 *
 * <p><b>Order.</b> Claim, redeem, broadcast, report. The claim comes first
 * because it is the only step that cannot be undone safely — an SMS already on
 * the radio cannot be recalled, so the duplicate check must win before the
 * message is built, not after.
 *
 * <p><b>What is never logged.</b> The OTP, the SMS body, the destination number,
 * the dispatch ticket, and the send authorization. Failures are logged as codes.
 */
public final class AsolVerificationSmsWorker extends Worker {

    private static final String TAG = "AsolVerificationSms";

    static final String INPUT_CHALLENGE_ID = "challengeId";
    static final String INPUT_DISPATCH_ID = "dispatchId";
    static final String INPUT_DISPATCH_TICKET = "dispatchTicket";

    static final String SMS_SENDER_PACKAGE = "com.hesham.smssender";
    static final String SMS_SENDER_RECEIVER = "com.hesham.smssender.ipc.SendSmsReceiver";
    static final String SMS_SENDER_ACTION = "com.hesham.smssender.action.SEND_SMS";

    public AsolVerificationSmsWorker(@NonNull Context context, @NonNull WorkerParameters parameters) {
        super(context, parameters);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        String dispatchId = getInputData().getString(INPUT_DISPATCH_ID);
        String dispatchTicket = getInputData().getString(INPUT_DISPATCH_TICKET);
        if (dispatchId == null || dispatchId.isEmpty() || dispatchTicket == null || dispatchTicket.isEmpty()) {
            return Result.failure();
        }

        String baseUrl = AsolVerificationSmsGateway.apiBaseUrl(context);
        if (baseUrl.isEmpty()) {
            // The web layer has never configured this device as the gateway. There
            // is nothing to retry against, and no endpoint to report to.
            Log.e(TAG, "This device has no configured verification API origin; dispatch skipped.");
            return Result.failure();
        }

        // Claimed before anything is fetched: a duplicate delivery stops here,
        // and it stops before a second message can exist.
        if (!AsolVerificationSmsGateway.claim(context, dispatchId)) {
            Log.i(TAG, "A verification dispatch was already handled on this device; ignoring the duplicate.");
            return Result.success();
        }

        JSONObject redeemed;
        try {
            redeemed = AsolVerificationApi.redeem(baseUrl, dispatchId, dispatchTicket);
        } catch (Exception error) {
            // Transport failure: the claim is released so the retry keeps the same
            // dispatch id instead of being suppressed by its own first attempt.
            AsolVerificationSmsGateway.releaseClaim(context, dispatchId);
            Log.w(TAG, "A verification dispatch could not be redeemed; it will be retried.");
            return Result.retry();
        }

        if (redeemed == null) {
            // The server refused: expired, replayed, or cancelled. The claim stays,
            // because retrying a refusal cannot succeed and must not send anything.
            Log.w(TAG, "A verification dispatch was refused by the server; no SMS was sent.");
            return Result.failure();
        }

        JSONObject payload = redeemed.optJSONObject("data");
        if (payload == null) payload = redeemed;
        String number = payload.optString("number", "");
        String message = payload.optString("message", "");
        String requestId = payload.optString("requestId", dispatchId);
        String authorization = payload.optString("authorization", "");
        String replyPackage = payload.optString("replyPackage", context.getPackageName());
        if (number.isEmpty() || message.isEmpty()) {
            Log.e(TAG, "A redeemed verification dispatch was incomplete; no SMS was sent.");
            AsolVerificationApi.reportStatus(baseUrl, requestId, "failed", "redeemedPayloadIncomplete", null);
            return Result.failure();
        }

        try {
            Intent send = new Intent(SMS_SENDER_ACTION);
            send.setClassName(SMS_SENDER_PACKAGE, SMS_SENDER_RECEIVER);
            send.putExtra("number", number);
            send.putExtra("message", message);
            // Carried for the authenticated IPC contract. The installed SMS Sender
            // ignores unknown extras, so this build works against it unchanged
            // while a future authenticated build can enforce them.
            send.putExtra("request_id", requestId);
            send.putExtra("authorization", authorization);
            send.putExtra("reply_package", replyPackage);
            context.sendBroadcast(send);
        } catch (RuntimeException error) {
            Log.e(TAG, "SMS Sender could not be invoked on this device.", error);
            AsolVerificationApi.reportStatus(baseUrl, requestId, "failed", "smsSenderUnavailable", null);
            // The code is already spent server-side, so the claim stays: a retry
            // would redeem nothing and could only confuse the dispatch record.
            return Result.failure();
        }

        // Observability only. OTP validity is decided by the server when the code
        // is verified, so a failed status report must never trigger a second SMS.
        AsolVerificationApi.reportStatus(baseUrl, requestId, "sent", null, null);
        return Result.success();
    }

}
