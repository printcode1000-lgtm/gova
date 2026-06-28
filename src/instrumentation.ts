export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureStorageProfilesValidated } = await import(
      './core/storage/profiles/storage-profile-loader.server'
    );
    ensureStorageProfilesValidated();
  }
}
