package hgh.asol.app;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * Reports one SMS Sender result to the verification status endpoint.
 *
 * Separate from {@link AsolVerificationSmsWorker} because it has a different
 * reason to change: that worker owns "send exactly once", this one owns "tell the
 * server what happened". It never sends anything, so a retry here is always safe.
 */
public final class AsolVerificationSmsStatusWorker extends Worker {

    static final String INPUT_REQUEST_ID = "requestId";
    static final String INPUT_STATUS = "status";
    static final String INPUT_ERROR_CODE = "errorCode";
    static final String INPUT_DELIVERY_STATE = "deliveryState";

    public AsolVerificationSmsStatusWorker(@NonNull Context context, @NonNull WorkerParameters parameters) {
        super(context, parameters);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        String requestId = getInputData().getString(INPUT_REQUEST_ID);
        if (requestId == null || requestId.isEmpty()) return Result.failure();

        String baseUrl = AsolVerificationSmsGateway.apiBaseUrl(context);
        if (baseUrl.isEmpty()) return Result.failure();

        String status = getInputData().getString(INPUT_STATUS);
        String errorCode = getInputData().getString(INPUT_ERROR_CODE);
        String deliveryState = getInputData().getString(INPUT_DELIVERY_STATE);
        return AsolVerificationApi.reportStatus(
            baseUrl,
            requestId,
            status == null || status.isEmpty() ? "sent" : status,
            errorCode,
            deliveryState
        ) ? Result.success() : Result.retry();
    }
}
