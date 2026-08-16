import type { BuiltInStorageAccountId } from './account-registry.types';

export type StorageAccountId = BuiltInStorageAccountId | (string & {});
