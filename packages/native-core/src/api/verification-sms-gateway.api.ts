import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { verificationSmsGatewayAdapter } from "../adapters/verification-sms-gateway.adapter";
import { isAndroid } from "../adapters/platform.adapter";
import { SUBMAIN_BASE_URL } from "../domain/defaults/platform-defaults";

const MODULE = "VerificationSmsGateway";

/**
 * The Android-only half of the verification SMS gateway.
 *
 * Android-only by construction, not by policy preference: iOS has no SMS Sender
 * to invoke, and the web has no background process that could survive the page.
 * On any other platform this reports "not configured" rather than failing, so a
 * caller can wire it unconditionally.
 */
export const verificationSmsGatewayApi = {
  /**
   * Defaults to the account that owns `/api/verification/**`. The native worker
   * is not a browser transport and must not rely on the main app's redirect
   * layer to preserve a POST body while redeeming a dispatch ticket.
   */
  async configure(apiBaseUrl: string = SUBMAIN_BASE_URL): Promise<Result<boolean, NativeCoreError>> {
    if (!isAndroid()) return ok(false);
    try {
      return ok(await verificationSmsGatewayAdapter.configure(apiBaseUrl));
    } catch (error) {
      return err(toNativeCoreError(MODULE, error));
    }
  },

  async isConfigured(): Promise<boolean> {
    if (!isAndroid()) return false;
    return verificationSmsGatewayAdapter.isConfigured();
  },
};
