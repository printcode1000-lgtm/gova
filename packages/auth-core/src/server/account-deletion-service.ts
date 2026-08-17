import { isAccountDeletionPhraseValid } from '../domain/constants';
import type { DeleteAccountInput, DeleteAccountResult } from '../domain/entities';
import type {
  AccountDeletionRepositoryPort,
  ImageDeletionPort,
} from '../ports/account-deletion.port';
import { assertSessionMatchesUid } from './session-auth';
import { isSuperAdminIdentity } from './super-admin';
import { verifyPassword } from './password';

export class AccountDeletionService {
  constructor(
    private repository: AccountDeletionRepositoryPort,
    private imageStorage: ImageDeletionPort,
  ) {}

  async delete(input: DeleteAccountInput): Promise<DeleteAccountResult> {
    if (!input?.uid?.trim()) throw new Error('accountDeletionConfirmationInvalid');
    if (!input.currentPassword?.trim()) throw new Error('invalidCurrentPassword');
    if (!isAccountDeletionPhraseValid(input.confirmation)) {
      throw new Error('accountDeletionConfirmationInvalid');
    }

    assertSessionMatchesUid(input.sessionToken, input.uid);

    const user = await this.repository.getUser(input.uid);
    if (!user) throw new Error('userNotFound');
    if (isSuperAdminIdentity(user.uid, user.phone)) {
      throw new Error('accountDeletionSuperAdminForbidden');
    }

    const passwordValid = await verifyPassword(input.currentPassword, user.password);
    if (!passwordValid) throw new Error('invalidCurrentPassword');

    const images = await this.repository.collectImages(user.uid);
    await this.repository.anonymizeOrders(user.uid);
    await this.repository.deleteProducts(user.uid);
    await this.repository.deleteProfile(user.uid);
    await this.repository.deleteMain(user.uid);

    const unique = [
      ...new Map(images.map((image) => [`${image.profileId}:${image.key}`, image])).values(),
    ];
    const results = await Promise.allSettled(
      unique.map((image) => this.imageStorage.deleteImage(image.profileId, image.key)),
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Account image cleanup failed', result.reason);
      }
    }

    return { deleted: true, anonymizedOrderRecords: true };
  }
}
