import 'server-only';

import { userRepository } from '../repositories/user-repository';
import { CreateUserCommand } from './commands/create-user.command';
import { UpdateLastLoginCommand } from './commands/update-last-login.command';
import { GetUserByPhoneQuery } from './queries/get-user-by-phone.query';

export const createUserCommand = new CreateUserCommand(userRepository);
export const updateLastLoginCommand = new UpdateLastLoginCommand(userRepository);
export const getUserByPhoneQuery = new GetUserByPhoneQuery(userRepository);
