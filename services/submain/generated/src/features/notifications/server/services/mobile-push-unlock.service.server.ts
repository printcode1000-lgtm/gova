import "server-only";

import { GetNotificationUserIdentityQuery } from "@asol/data-core/notifications";
import {
  decryptMobilePushCredentialBlob,
  isMobilePushUnlockConfigured,
  type MobilePushCredentialBundle,
} from "./mobile-push-crypto.server";
import { getOptionalMobilePushServerCredentialBlob } from "@/core/config/server-env";
import { samePhone } from "@asol/auth-core/server";

export interface MobilePushUnlockInput {
  uid: string;
  phone: string;
  credentialBlob: string;
}

export class MobilePushUnlockService {
  constructor(private readonly users = new GetNotificationUserIdentityQuery()) {}

  async unlock(input: MobilePushUnlockInput): Promise<MobilePushCredentialBundle> {
    if (!isMobilePushUnlockConfigured()) {
      throw new Error("mobilePushUnlockNotConfigured");
    }

    const blob = input.credentialBlob.trim();
    if (!blob || blob.length < 40) {
      throw new Error("mobilePushCredentialBlobInvalid");
    }

    const expected = getOptionalMobilePushServerCredentialBlob();
    if (expected && expected !== blob) {
      throw new Error("mobilePushCredentialBlobMismatch");
    }

    const uid = input.uid.trim();
    const phone = input.phone.trim();
    const user = await this.users.execute(uid);
    if (!user || !samePhone(user.phone, phone)) throw new Error("forbidden");

    return decryptMobilePushCredentialBlob(blob);
  }
}

export const mobilePushUnlockService = new MobilePushUnlockService();
