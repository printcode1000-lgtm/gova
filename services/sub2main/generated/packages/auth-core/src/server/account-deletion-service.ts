import { ACCOUNT_DELETION_STEP_ORDER } from '../domain/account-deletion-registry';
import { isAccountDeletionPhraseValid } from '../domain/constants';
import type { DeleteAccountInput, DeleteAccountResult } from '../domain/entities';
import type {
  AccountDeletionRepositoryPort,
  ImageDeletionPort,
} from '../ports/account-deletion.port';
import { deleteImagesWithRetry } from './delete-images-with-retry';
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

    return this.executeDeletionSteps(user.uid);
  }

  async deleteBySuperAdmin(targetUid: string): Promise<DeleteAccountResult> {
    const trimmedUid = targetUid?.trim();
    if (!trimmedUid) throw new Error('userNotFound');

    const user = await this.repository.getUser(trimmedUid);
    if (!user) throw new Error('userNotFound');
    if (isSuperAdminIdentity(user.uid, user.phone)) {
      throw new Error('accountDeletionSuperAdminForbidden');
    }

    return this.executeDeletionSteps(user.uid);
  }

  private async executeDeletionSteps(uid: string): Promise<DeleteAccountResult> {
    const stepsCompleted: string[] = [];
    let images = [] as Awaited<ReturnType<AccountDeletionRepositoryPort['collectImages']>>;

    for (const step of ACCOUNT_DELETION_STEP_ORDER) {
      switch (step) {
        case 'collect_images':
          images = await this.repository.collectImages(uid);
          stepsCompleted.push(step);
          break;
        case 'anonymize_orders':
          await this.repository.anonymizeOrders(uid);
          stepsCompleted.push(step);
          break;
        case 'delete_products':
          await this.repository.deleteProducts(uid);
          stepsCompleted.push(step);
          break;
        case 'delete_profile':
          await this.repository.deleteProfile(uid);
          stepsCompleted.push(step);
          break;
        case 'delete_main':
          await this.repository.deleteMain(uid);
          stepsCompleted.push(step);
          break;
        case 'delete_images': {
          const cleanup = await deleteImagesWithRetry(images, this.imageStorage);
          for (const failure of cleanup.failed) {
            console.error('Account image cleanup failed after retries', failure);
          }
          stepsCompleted.push(step);
          return {
            deleted: true,
            anonymizedOrderRecords: true,
            stepsCompleted,
            imagesAttempted: cleanup.attempted,
            imagesDeleted: cleanup.deleted,
            imagesFailed: cleanup.failed,
          };
        }
        default: {
          const exhaustive: never = step;
          throw new Error(`Unsupported account deletion step: ${exhaustive}`);
        }
      }
    }

    return {
      deleted: true,
      anonymizedOrderRecords: true,
      stepsCompleted,
      imagesAttempted: 0,
      imagesDeleted: 0,
      imagesFailed: [],
    };
  }
}
