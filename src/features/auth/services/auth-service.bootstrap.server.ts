import 'server-only';

import { AuthService } from './auth-service.server';
import {
  createUserCommand,
  getUserByPhoneQuery,
  getUserByUidQuery,
  updateLastLoginCommand,
  updateUserProfileCommand,
} from '../operations/instances';

export const authService = new AuthService(
  createUserCommand,
  updateLastLoginCommand,
  getUserByPhoneQuery,
  getUserByUidQuery,
  updateUserProfileCommand,
);
