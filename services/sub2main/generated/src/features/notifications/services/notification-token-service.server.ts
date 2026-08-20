import "server-only";

import type {
  DeleteNotificationTokenInput,
  NotificationDeliveryPreference,
  RegisteredNotificationToken,
  RegisterNotificationTokenInput,
} from "@asol/notifications-core";
import { DeleteNotificationTokenCommand } from "@asol/data-core/notifications";
import { UpsertNotificationTokenCommand } from "@asol/data-core/notifications";
import { SetNotificationPushPreferenceCommand } from "@asol/data-core/notifications";
import { ListNotificationTokensQuery } from "@asol/data-core/notifications";
import { GetNotificationPushPreferenceQuery } from "@asol/data-core/notifications";
import { GetNotificationUserIdentityQuery } from "@asol/data-core/notifications";

/**
 * A request body is untyped JSON, whatever the parameter type says. Reading `.trim()`
 * straight off a missing field threw a `TypeError`, which `mapServiceError` can only
 * report as a 500 — a malformed client payload logged as a server fault. Missing text
 * becomes an empty string here, so the checks below classify it instead: no identity
 * is `forbidden`, and a blank device id or token is its own 400 code.
 */
function trimmedText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export class NotificationTokenService {
  constructor(
    private readonly upsertToken = new UpsertNotificationTokenCommand(),
    private readonly deleteToken = new DeleteNotificationTokenCommand(),
    private readonly listTokens = new ListNotificationTokensQuery(),
    private readonly users = new GetNotificationUserIdentityQuery(),
    private readonly getPushPreferenceQuery = new GetNotificationPushPreferenceQuery(),
    private readonly setPushPreferenceCommand = new SetNotificationPushPreferenceCommand(),
  ) {}

  async register(
    input: RegisterNotificationTokenInput,
  ): Promise<RegisteredNotificationToken> {
    const uid = trimmedText(input?.uid);
    const phone = trimmedText(input?.phone);
    const token = trimmedText(input?.token);
    const deviceId = trimmedText(input?.deviceId);
    const user = await this.users.execute(uid);
    if (!user || user.phone !== phone) throw new Error("forbidden");
    if (!deviceId || deviceId.length > 200)
      throw new Error("notificationDeviceIdInvalid");
    if (token.length < 20 || token.length > 8192)
      throw new Error("notificationTokenInvalid");
    if (!["web", "android", "ios"].includes(input.platform)) {
      throw new Error("notificationPlatformInvalid");
    }
    // Apple devices issue a raw APNs token until the Firebase Messaging iOS SDK
    // is installed and a Firebase registration token afterwards. Both are valid
    // registrations for the same platform; the registry routes each one to its
    // own transport.
    const allowedProvider =
      (input.platform === "android" && input.provider === "fcm") ||
      (input.platform === "ios" &&
        (input.provider === "apns" || input.provider === "fcm")) ||
      (input.platform === "web" && input.provider === "web_push");
    if (!allowedProvider) throw new Error("notificationProviderInvalid");
    return this.upsertToken.execute({
      ...input,
      uid,
      phone,
      token,
      deviceId,
      locale: input.locale === "en" ? "en" : "ar",
    });
  }

  async remove(input: DeleteNotificationTokenInput): Promise<void> {
    const user = await this.users.execute(trimmedText(input?.uid));
    const phone = trimmedText(input?.phone);
    if (!user || !phone || user.phone !== phone) {
      throw new Error("forbidden");
    }
    return this.deleteToken.execute({ ...input, uid: user.uid });
  }

  list(uid: string): Promise<RegisteredNotificationToken[]> {
    return this.listTokens.byUid(uid);
  }

  async getPushPreference(
    uid: string,
    phone: string,
  ): Promise<NotificationDeliveryPreference> {
    const user = await this.users.execute(trimmedText(uid));
    if (!user || user.phone !== trimmedText(phone)) throw new Error("forbidden");
    return this.getPushPreferenceQuery.execute(user.uid);
  }

  /**
   * The account-wide mute switch. Never touches a registration or a token —
   * see `NotificationDeliveryPreference` — so this is safe to flip as often as
   * the user likes without re-registering any device.
   */
  async setPushPreference(
    uid: string,
    phone: string,
    pushEnabled: boolean,
  ): Promise<NotificationDeliveryPreference> {
    const user = await this.users.execute(trimmedText(uid));
    if (!user || user.phone !== trimmedText(phone)) throw new Error("forbidden");
    return this.setPushPreferenceCommand.execute(user.uid, pushEnabled);
  }
}
