import 'server-only';

import { userRepository } from '../repositories/user-repository';
import { CreateUserCommand } from './commands/create-user.command';
import { UpdateLastLoginCommand } from './commands/update-last-login.command';
import { UpdateUserCommand } from './commands/update-user.command';
import { GetUserByEmailQuery } from './queries/get-user-by-email.query';
import { GetUserByPhoneQuery } from './queries/get-user-by-phone.query';
import { GetUserByUidQuery } from './queries/get-user-by-uid.query';

export const createUserCommand = new CreateUserCommand(userRepository);
export const updateLastLoginCommand = new UpdateLastLoginCommand(userRepository);
export const updateUserCommand = new UpdateUserCommand(userRepository);
export const getUserByPhoneQuery = new GetUserByPhoneQuery(userRepository);
export const getUserByUidQuery = new GetUserByUidQuery(userRepository);
export const getUserByEmailQuery = new GetUserByEmailQuery(userRepository);
