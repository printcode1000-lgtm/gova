import 'server-only';

import './auth-core-ports.server';
import {
  AccountDeletionService,
  AuthOperationsService,
  type AuthUserRecord,
  type AuthUserRepositoryPort,
} from '@asol/auth-core/server';
import { imageStorageService } from '@/features/storage/services/image-storage-service.bootstrap.server';
import {
  createUserCommand,
  getUserByEmailQuery,
  getUserByPhoneQuery,
  getUserByUidQuery,
  updateLastLoginCommand,
  updateUserCommand,
} from '@asol/data-core/auth';
import { accountDeletionRepository } from '@asol/data-core/account-deletion';
import { getProfileSpecialtiesQuery } from '@asol/data-core/profile';

function toAuthUserRecord(user: {
  uid: string;
  phone: string;
  email?: string | null;
  password?: string;
}): AuthUserRecord {
  return {
    uid: user.uid,
    phone: user.phone,
    email: user.email ?? null,
    password: user.password ?? '',
  };
}

const authUserRepository: AuthUserRepositoryPort = {
  createUser: (user) => createUserCommand.execute(user),
  getByPhone: async (phone) => {
    const user = await getUserByPhoneQuery.execute(phone);
    return user ? toAuthUserRecord(user) : null;
  },
  getByUid: async (uid) => {
    const user = await getUserByUidQuery.execute(uid);
    return user ? toAuthUserRecord(user) : null;
  },
  getByEmail: async (email) => {
    const user = await getUserByEmailQuery.execute(email);
    return user ? toAuthUserRecord(user) : null;
  },
  update: (uid, patch) => updateUserCommand.execute(uid, patch),
  updateLastLogin: (uid) => updateLastLoginCommand.execute(uid),
};

export const authOperationsService = new AuthOperationsService(authUserRepository, {
  getProfileSpecialties: (uid) => getProfileSpecialtiesQuery.execute(uid),
});

export const accountDeletionService = new AccountDeletionService(
  accountDeletionRepository,
  {
    deleteImage: (profileId, key) =>
      imageStorageService.deleteImage(profileId, key),
  },
);
