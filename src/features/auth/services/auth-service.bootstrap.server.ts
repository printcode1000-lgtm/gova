import 'server-only';

import { AuthService } from './auth-service.server';
import {
  createUserCommand,
  getUserByPhoneQuery,
  updateLastLoginCommand,
  updateUserProfileCommand,
} from '@/modules/data-access/domains/auth/operations/instances';
import { getProfileSpecialtiesQuery } from '@/modules/data-access/domains/profile/operations/instances';

export const authService = new AuthService(
  createUserCommand,
  updateLastLoginCommand,
  getUserByPhoneQuery,
  updateUserProfileCommand,
  getProfileSpecialtiesQuery,
);
