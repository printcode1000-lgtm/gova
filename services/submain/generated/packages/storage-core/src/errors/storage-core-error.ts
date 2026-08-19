export class StorageCoreError extends Error {
  constructor(
    message: string,
    readonly code: string = 'STORAGE_ERROR',
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'StorageCoreError';
  }

  static invalidAccount(id: string): StorageCoreError {
    return new StorageCoreError(`Invalid or unknown storage account "${id}"`, 'INVALID_ACCOUNT');
  }

  static missingCredentials(account: string, missing: string[]): StorageCoreError {
    return new StorageCoreError(
      `Missing required credentials for account "${account}": ${missing.join(', ')}`,
      'MISSING_CREDENTIALS',
    );
  }

  static uploadFailed(message: string, cause?: unknown): StorageCoreError {
    return new StorageCoreError(`Storage upload failed: ${message}`, 'UPLOAD_FAILED', cause);
  }
}
