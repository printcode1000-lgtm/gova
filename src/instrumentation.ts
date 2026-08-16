export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureStorageProfilesValidated } = await import(
      '@asol/storage-core/server'
    );
    ensureStorageProfilesValidated();
  }
}
