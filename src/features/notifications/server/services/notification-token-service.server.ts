import "server-only";

import type {
  AccountDevicesResult,
  AccountDeviceSummary,
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

/**
 * Compare phone identities by digits rather than display formatting. Sessions may
 * carry `+20 10...` while the account row carries `010...`; those are the same
 * Egyptian number and must not be rejected as a different account.
 */
function normalizedIdentityPhone(value: unknown): string {
  const digits = trimmedText(value).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("20") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

function identityPhoneMatches(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizedIdentityPhone(left);
  return Boolean(
    normalizedLeft && normalizedLeft === normalizedIdentityPhone(right),
  );
}

function toAccountDeviceSummary(
  registration: RegisteredNotificationToken,
): AccountDeviceSummary {
  return {
    id: registration.id,
    deviceId: registration.deviceId,
    platform: registration.platform,
    provider: registration.provider,
    ...(registration.locale ? { locale: registration.locale } : {}),
    ...(registration.deviceLabel ? { deviceLabel: registration.deviceLabel } : {}),
    enabled: registration.enabled,
    ...(registration.lastSeenAt ? { lastSeenAt: registration.lastSeenAt } : {}),
    createdAt: registration.createdAt,
    updatedAt: registration.updatedAt,
  };
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
    if (!user || !identityPhoneMatches(user.phone, phone)) throw new Error("forbidden");
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
    if (!user || !identityPhoneMatches(user.phone, phone)) {
      throw new Error("forbidden");
    }
    return this.deleteToken.execute({ ...input, uid: user.uid });
  }

  list(uid: string): Promise<RegisteredNotificationToken[]> {
    return this.listTokens.byUid(uid);
  }

  /**
   * Every device currently registered on this account.
   *
   * The push token never leaves the server: a listing exists so a user can
   * recognise and revoke a device, and the token is a delivery credential that
   * answers neither question.
   */
  async listForAccount(identity: {
    uid: string;
    phone: string;
  }): Promise<AccountDevicesResult> {
    const user = await this.users.execute(trimmedText(identity?.uid));
    if (!user || !identityPhoneMatches(user.phone, identity?.phone)) {
      throw new Error("forbidden");
    }
    const tokens = await this.listTokens.byUid(user.uid);
    return { devices: tokens.map(toAccountDeviceSummary) };
  }

  async getPushPreference(
    uid: string,
    phone: string,
  ): Promise<NotificationDeliveryPreference> {
    const user = await this.users.execute(trimmedText(uid));
    if (!user || !identityPhoneMatches(user.phone, phone)) throw new Error("forbidden");
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
    if (!user || !identityPhoneMatches(user.phone, phone)) throw new Error("forbidden");
    return this.setPushPreferenceCommand.execute(user.uid, pushEnabled);
  }
}
