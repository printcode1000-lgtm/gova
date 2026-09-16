import "server-only";

/**
 * Server-side courier for a signed grant.
 *
 * The usual courier is the browser: the main app signs a grant and the page
 * posts it to the notifications deployment. That works because a person is
 * waiting on the page. It does not work for a send the server must complete
 * whether or not anyone stays on the page — and it does not work at all for a
 * pre-authentication flow, where there is no session the native delivery path
 * could use to fetch provider credentials.
 *
 * So this posts the grant itself. Nothing about authorization changes: the
 * receiving deployment verifies the same signature over the same decision, and
 * this module holds no credential of its own. The caller supplies the origin,
 * because knowing sibling deployment addresses belongs to the application's
 * configuration layer, not to this package.
 */

const SEND_PATH = "/api/notifications/send";
const TIMEOUT_MS = 10_000;

export interface NotificationGrantCourierResult {
  delivered: boolean;
  /** Non-sensitive reason, for dispatch diagnostics. Never a payload. */
  failureCode?: "notConfigured" | "transport" | "rejected";
}

export async function postNotificationGrantToService(
  baseUrl: string,
  grant: string,
): Promise<NotificationGrantCourierResult> {
  const origin = baseUrl.replace(/\/$/, "");
  if (!origin) return { delivered: false, failureCode: "notConfigured" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${origin}${SEND_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ grant }),
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) return { delivered: false, failureCode: "rejected" };
    return { delivered: true };
  } catch {
    // The grant is short-lived and the challenge owns its own expiry, so a
    // transport failure is reported as retriable rather than retried blindly
    // here — a blind retry is how one OTP becomes two SMS messages.
    return { delivered: false, failureCode: "transport" };
  } finally {
    clearTimeout(timeout);
  }
}
