import 'server-only';

import { AuthService } from './auth-service.server';
import {
  createUserCommand,
  getUserByPhoneQuery,
  updateLastLoginCommand,
  updateUserProfileCommand,
} from '../operations/instances';
import { getProfileSpecialtiesQuery } from '@/features/profile/operations/instances';

export const authService = new AuthService(
  createUserCommand,
  updateLastLoginCommand,
  getUserByPhoneQuery,
  updateUserProfileCommand,
  getProfileSpecialtiesQuery,
);
