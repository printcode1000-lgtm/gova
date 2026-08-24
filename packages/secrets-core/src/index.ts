/**
 * @asol/secrets-core — the encrypted archive of everything this repository deliberately does not
 * commit.
 *
 * Six hundred lines of it lived directly in `scripts/`, where nothing gated it: the archive
 * format, the hybrid RSA + AES-256-GCM envelope, the workspace rules deciding which ignored files
 * are secrets, and the 7-Zip invocation. That code loses a project's credentials if it is wrong,
 * which is the strongest possible argument for it being a sealed package with a contract test
 * rather than a script beside the deploy helpers.
 *
 * The CLIs stay in `scripts/`: `secrets:backup`, `secrets:restore`, `secrets:key:init`. They
 * decide *when*; this decides *how*.
 */
export * from './archive/archive-workspace';
export * from './archive/archive-crypto';
export * from './archive/archive-password';
