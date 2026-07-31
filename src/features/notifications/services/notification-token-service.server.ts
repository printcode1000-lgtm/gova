import "server-only";

import type {
  DeleteNotificationTokenInput,
  RegisteredNotificationToken,
  RegisterNotificationTokenInput,
} from "../domain/entities";
import { DeleteNotificationTokenCommand } from "@/modules/data-access/domains/notifications/operations/commands/delete-notification-token.command";
import { UpsertNotificationTokenCommand } from "@/modules/data-access/domains/notifications/operations/commands/upsert-notification-token.command";
import { ListNotificationTokensQuery } from "@/modules/data-access/domains/notifications/operations/queries/list-notification-tokens.query";
import { GetNotificationUserIdentityQuery } from "@/modules/data-access/domains/notifications/operations/queries/get-notification-user-identity.query";

export class NotificationTokenService {
  constructor(
    private readonly upsertToken = new UpsertNotificationTokenCommand(),
    private readonly deleteToken = new DeleteNotificationTokenCommand(),
    private readonly listTokens = new ListNotificationTokensQuery(),
    private readonly users = new GetNotificationUserIdentityQuery(),
  ) {}

  async register(
    input: RegisterNotificationTokenInput,
  ): Promise<RegisteredNotificationToken> {
    const uid = input.uid.trim();
    const phone = input.phone.trim();
    const token = input.token.trim();
    const deviceId = input.deviceId.trim();
    const user = await this.users.execute(uid);
    if (!user || user.phone !== phone) throw new Error("forbidden");
    if (!deviceId || deviceId.length > 200)
      throw new Error("notificationDeviceIdInvalid");
    if (token.length < 20 || token.length > 8192)
      throw new Error("notificationTokenInvalid");
    if (!["web", "android", "ios"].includes(input.platform)) {
      throw new Error("notificationPlatformInvalid");
    }
    const allowedProvider =
      (input.platform === "android" && input.provider === "fcm") ||
      (input.platform === "ios" && input.provider === "apns") ||
      (input.platform === "web" && input.provider === "web_push");
    if (!allowedProvider) throw new Error("notificationProviderInvalid");
    return this.upsertToken.execute({ ...input, uid, phone, token, deviceId });
  }

  async remove(input: DeleteNotificationTokenInput): Promise<void> {
    const user = await this.users.execute(input.uid.trim());
    if (!user || !input.phone || user.phone !== input.phone.trim()) {
      throw new Error("forbidden");
    }
    return this.deleteToken.execute({ ...input, uid: user.uid });
  }

  list(uid: string): Promise<RegisteredNotificationToken[]> {
    return this.listTokens.byUid(uid);
  }
}
