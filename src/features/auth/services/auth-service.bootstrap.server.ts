import 'server-only';

import { AuthService } from './auth-service.server';
import {
  createUserCommand,
  getUserByPhoneQuery,
  updateLastLoginCommand,
} from '../operations/instances';

export const authService = new AuthService(
  createUserCommand,
  updateLastLoginCommand,
  getUserByPhoneQuery
);
