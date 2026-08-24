import { promptHidden } from "./archive-crypto";

/**
 * Cursor Cloud / non-interactive restore reads this env var instead of a TTY prompt.
 * Set it in Cloud Agents → Secrets; never commit the value.
 */
export const SECRET_ARCHIVE_PASSWORD_ENV_VAR = "ASOL_SECRET_ARCHIVE_PASSWORD";

/**
 * Resolves the PKCS#8 private-key password for archive decrypt / restore.
 * Prefers `ASOL_SECRET_ARCHIVE_PASSWORD` when set; otherwise prompts on a real TTY.
 */
export async function resolveArchivePassword(label: string): Promise<string> {
  const fromEnv = process.env[SECRET_ARCHIVE_PASSWORD_ENV_VAR]?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      `A real interactive terminal is required for the private-key password, or set ${SECRET_ARCHIVE_PASSWORD_ENV_VAR} for non-interactive restore (Cloud Agents → Secrets).`,
    );
  }

  return promptHidden(label);
}
