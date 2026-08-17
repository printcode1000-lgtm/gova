import 'server-only';

import { userRepository } from '@/modules/data-access/domains/auth/repositories/user-repository';
import { CreateUserCommand } from '@/modules/data-access/domains/auth/operations/commands/create-user.command';
import { UpdateLastLoginCommand } from '@/modules/data-access/domains/auth/operations/commands/update-last-login.command';
import { UpdateUserCommand } from '@/modules/data-access/domains/auth/operations/commands/update-user.command';
import { GetUserByEmailQuery } from '@/modules/data-access/domains/auth/operations/queries/get-user-by-email.query';
import { GetUserByPhoneQuery } from '@/modules/data-access/domains/auth/operations/queries/get-user-by-phone.query';
import { GetUserByUidQuery } from '@/modules/data-access/domains/auth/operations/queries/get-user-by-uid.query';

export const createUserCommand = new CreateUserCommand(userRepository);
export const updateLastLoginCommand = new UpdateLastLoginCommand(userRepository);
export const updateUserCommand = new UpdateUserCommand(userRepository);
export const getUserByPhoneQuery = new GetUserByPhoneQuery(userRepository);
export const getUserByUidQuery = new GetUserByUidQuery(userRepository);
export const getUserByEmailQuery = new GetUserByEmailQuery(userRepository);
