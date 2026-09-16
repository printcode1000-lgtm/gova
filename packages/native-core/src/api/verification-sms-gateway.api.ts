import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { verificationSmsGatewayAdapter } from "../adapters/verification-sms-gateway.adapter";
import { isAndroid } from "../adapters/platform.adapter";
import { API_BASE_URL } from "../domain/defaults/platform-defaults";

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
   * Defaults to the canonical native API origin, which is the same constant a
   * native bundle already addresses application data with. A caller only passes a
   * value to point a test build somewhere else, so no consumer has to learn the
   * origin in order to wire the gateway.
   */
  async configure(apiBaseUrl: string = API_BASE_URL): Promise<Result<boolean, NativeCoreError>> {
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
