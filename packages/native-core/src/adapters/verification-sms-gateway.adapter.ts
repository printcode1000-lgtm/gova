import { registerPlugin } from "@capacitor/core";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";

const MODULE = "AsolVerificationSms";

interface VerificationSmsPluginApi {
  configureGateway(options: { apiBaseUrl: string }): Promise<{ configured: boolean }>;
  gatewayStatus(): Promise<{ configured: boolean }>;
}

const verificationSmsPlugin = createLazyPlugin(MODULE, async () => {
  return { plugin: registerPlugin<VerificationSmsPluginApi>(MODULE) };
});

/**
 * Hands the native verification SMS gateway the API origin to redeem against.
 *
 * Only meaningful on the Super Admin's Android phone — the one device a
 * verification dispatch is ever addressed to. Elsewhere the value is stored and
 * never read, so there is nothing to gate on the caller's side beyond the
 * platform check the plugin loader already performs.
 */
export const verificationSmsGatewayAdapter = {
  async configure(apiBaseUrl: string): Promise<boolean> {
    try {
      const { plugin } = await verificationSmsPlugin.required();
      const result = await plugin.configureGateway({ apiBaseUrl });
      return result.configured;
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async isConfigured(): Promise<boolean> {
    try {
      const loaded = await verificationSmsPlugin.optional();
      if (!loaded) return false;
      return (await loaded.plugin.gatewayStatus()).configured;
    } catch {
      return false;
    }
  },
};
