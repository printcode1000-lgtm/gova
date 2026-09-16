package hgh.asol.app;

import android.util.Log;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * The two verification endpoints this device calls, and nothing else.
 *
 * Kept apart from the workers because transport has its own reason to change.
 * Both calls distinguish three outcomes, which is what lets a worker decide
 * between retrying and stopping:
 *
 * <ul>
 *   <li>a body, on success;</li>
 *   <li>{@code null} on a 4xx — a refusal that retrying cannot fix; and</li>
 *   <li>an exception on transport failure or 5xx — retriable.</li>
 * </ul>
 *
 * Nothing here is logged beyond a code. The redeem response carries the OTP
 * inside the SMS body, so logging it would defeat the whole design.
 */
final class AsolVerificationApi {

    private static final String TAG = "AsolVerificationSms";
    private static final String REDEEM_PATH = "/api/verification/admin-sms/redeem";
    private static final String STATUS_PATH = "/api/verification/admin-sms/status";
    private static final int TIMEOUT_MS = 15_000;

    private AsolVerificationApi() {}

    static JSONObject redeem(String baseUrl, String dispatchId, String dispatchTicket) throws Exception {
        JSONObject body = new JSONObject();
        body.put("dispatchId", dispatchId);
        body.put("dispatchTicket", dispatchTicket);
        return postJson(baseUrl + REDEEM_PATH, body);
    }

    /** True when the status was accepted. Reporting is observability, so failure is not fatal. */
    static boolean reportStatus(
        String baseUrl,
        String requestId,
        String status,
        String errorCode,
        String deliveryState
    ) {
        try {
            JSONObject body = new JSONObject();
            body.put("requestId", requestId);
            body.put("status", status);
            if (errorCode != null && !errorCode.isEmpty()) body.put("errorCode", errorCode);
            if (deliveryState != null && !deliveryState.isEmpty()) body.put("deliveryState", deliveryState);
            return postJson(baseUrl + STATUS_PATH, body) != null;
        } catch (Exception error) {
            Log.w(TAG, "A verification dispatch status could not be reported.");
            return false;
        }
    }

    private static JSONObject postJson(String url, JSONObject body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        try {
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "application/json");
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            int code = connection.getResponseCode();
            if (code >= 400 && code < 500) return null;
            if (code >= 500) throw new IllegalStateException("verificationApiServerError");
            return new JSONObject(readBody(connection));
        } finally {
            connection.disconnect();
        }
    }

    private static String readBody(HttpURLConnection connection) throws Exception {
        StringBuilder text = new StringBuilder();
        try (InputStream stream = connection.getInputStream();
             BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) text.append(line);
        }
        return text.toString();
    }
}
