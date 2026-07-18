import "server-only";
import { createHash } from "node:crypto";
import { isSuperAdminIdentity } from "@/features/auth/utils/super-admin";
import { imageStorageService } from "@/features/storage/services/image-storage-service.bootstrap.server";
import { accountDeletionRepository, type AccountDeletionRepository } from "../repositories/account-deletion-repository.server";
import { ACCOUNT_DELETION_PHRASE, type DeleteAccountInput, type DeleteAccountResult } from "../types";

export class AccountDeletionService {
  constructor(private repository: AccountDeletionRepository = accountDeletionRepository) {}
  async delete(input: DeleteAccountInput): Promise<DeleteAccountResult> {
    if (!input?.uid || !input.currentPassword || input.confirmation !== ACCOUNT_DELETION_PHRASE) throw new Error("accountDeletionConfirmationInvalid");
    const user = await this.repository.getUser(input.uid);
    if (!user) throw new Error("userNotFound");
    if (isSuperAdminIdentity(user.uid, user.phone)) throw new Error("accountDeletionSuperAdminForbidden");
    const passwordHash = createHash("sha256").update(input.currentPassword).digest("hex");
    if (passwordHash !== user.password) throw new Error("invalidCurrentPassword");
    const images = await this.repository.collectImages(user.uid);
    await this.repository.anonymizeOrders(user.uid);
    await this.repository.deleteProducts(user.uid);
    await this.repository.deleteProfile(user.uid);
    await this.repository.deleteMain(user.uid);
    const unique = [...new Map(images.map((image) => [`${image.profileId}:${image.key}`, image])).values()];
    const results = await Promise.allSettled(unique.map((image) => imageStorageService.deleteImage(image.profileId, image.key)));
    for (const result of results) if (result.status === "rejected") console.error("Account image cleanup failed", result.reason);
    return { deleted: true, anonymizedOrderRecords: true };
  }
}
export const accountDeletionService = new AccountDeletionService();
