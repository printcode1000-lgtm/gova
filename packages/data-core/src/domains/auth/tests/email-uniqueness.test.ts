import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

import type { User } from '../entities';
import { normalizeAuthEmail } from '@asol/auth-core/server';
import { CreateUserCommand } from '../operations/commands/create-user.command';
import { UpdateUserProfileCommand } from '../operations/commands/update-user-profile.command';
import type { IUserRepository } from '../repositories/user-repository.interface';
import {
  createSignedSessionToken,
  registerSessionSigningSecret,
} from '@asol/auth-core/server';

registerSessionSigningSecret(() => 'email-uniqueness-test-secret-0123456789abcdef');

class MemoryUsers implements IUserRepository {
  users: Array<Omit<User, 'id'>> = [];

  async create(user: Omit<User, 'id'>): Promise<void> {
    this.users.push({ ...user, email: normalizeAuthEmail(user.email) });
  }

  async getByPhone(phone: string): Promise<User | null> {
    return this.users.find((user) => user.phone === phone) ?? null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const normalized = normalizeAuthEmail(email);
    return this.users.find((user) => user.email === normalized) ?? null;
  }

  async getByUid(uid: string): Promise<User | null> {
    return this.users.find((user) => user.uid === uid) ?? null;
  }

  async update(uid: string, fields: Partial<User>): Promise<void> {
    const index = this.users.findIndex((user) => user.uid === uid);
    if (index >= 0) this.users[index] = { ...this.users[index], ...fields };
  }
}

function registration(uid: string, phone: string, email?: string | null): Omit<User, 'id'> {
  return { uid, phone, email, password: 'scrypt$test$test' };
}

async function rejectsWithCode(action: () => Promise<unknown>, code: string) {
  await assert.rejects(action, (error: unknown) => error instanceof Error && error.message === code);
}

async function main() {
  assert.equal(normalizeAuthEmail('  Owner@Example.COM '), 'owner@example.com');
  assert.equal(normalizeAuthEmail('   '), null);

  const users = new MemoryUsers();
  users.users.push(registration('usr_owner', '01000000000', 'owner@example.com'));
  const command = new CreateUserCommand(users);

  await rejectsWithCode(
    () => command.execute(registration('usr_other', '01100000000', ' Owner@Example.COM ')),
    'emailAlreadyRegistered',
  );
  assert.equal(users.users.length, 1, 'duplicate email must not create another account');

  await command.execute(registration('usr_no_email_1', '01200000000', null));
  await command.execute(registration('usr_no_email_2', '01500000000', null));
  assert.equal(users.users.length, 3, 'optional empty emails may be reused as NULL');

  users.users.push(registration('usr_profile', '01022222222', 'profile@example.com'));
  const sessionToken = createSignedSessionToken('usr_profile', '01022222222');
  await rejectsWithCode(
    () =>
      new UpdateUserProfileCommand(users).execute({
        uid: 'usr_profile',
        phone: '01022222222',
        email: ' OWNER@EXAMPLE.COM ',
        sessionToken,
      }),
    'emailAlreadyRegistered',
  );
  assert.equal(
    users.users.find((user) => user.uid === 'usr_profile')?.email,
    'profile@example.com',
    'profile update must preserve the old email after a conflict',
  );

  const racingUsers = new MemoryUsers();
  let firstEmailLookup = true;
  racingUsers.getByEmail = async (email: string) => {
    if (firstEmailLookup) {
      firstEmailLookup = false;
      return null;
    }
    return registration('usr_winner', '01011111111', normalizeAuthEmail(email));
  };
  racingUsers.create = async () => {
    throw new Error('UNIQUE constraint failed: users.email');
  };
  await rejectsWithCode(
    () =>
      new CreateUserCommand(racingUsers).execute(
        registration('usr_loser', '01111111111', 'race@example.com'),
      ),
    'emailAlreadyRegistered',
  );

  const database = new Database(':memory:');
  database.exec(`
    CREATE TABLE users (id integer primary key, email text);
    INSERT INTO users (email) VALUES ('  Existing@Example.COM '), (''), (NULL);
  `);
  const migration = readFileSync(
    path.join(
      process.cwd(),
      'packages/data-core/src/core/database/migrations/0011_funny_punisher.sql',
    ),
    'utf8',
  ).replaceAll('--> statement-breakpoint', '');
  database.exec(migration);
  assert.deepEqual(
    database.prepare('SELECT email FROM users ORDER BY id').all(),
    [{ email: 'existing@example.com' }, { email: null }, { email: null }],
  );
  assert.throws(
    () => database.prepare('INSERT INTO users (email) VALUES (?)').run('existing@example.com'),
    /UNIQUE constraint failed/,
  );
  database.prepare('INSERT INTO users (email) VALUES (NULL)').run();
  database.close();

  console.log('Auth email uniqueness tests passed.');
}

void main();
