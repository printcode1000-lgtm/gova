/**
 * Turn a failure into one short line that is safe to write to disk.
 *
 * Branch checkpoints are a durable file in the working tree's `.deploy-all/`
 * directory, and a deploy failure message is one of the most secret-rich
 * strings in the pipeline: a Vercel CLI error can echo a token argument, and a
 * database error can echo a connection URL with credentials in it. So the
 * summary is built by removal, not by trust — the first line only, truncated,
 * with every credential-shaped run of characters and every value that matches a
 * secret-named environment variable replaced before it is stored.
 */
const MAX_SUMMARY_LENGTH = 240;

const SECRET_ENV_NAME_PATTERN = /(TOKEN|SECRET|PASSWORD|PASSPHRASE|CREDENTIAL|PRIVATE_KEY|_KEY|BLOB|DSN|AUTH)/i;

const SECRET_SHAPED_PATTERNS: readonly RegExp[] = [
  /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]+:[^\s/@]+@\S+/gi,
  /\b(?:token|secret|password|passphrase|key|auth)\s*[=:]\s*\S+/gi,
  /\b[A-Za-z0-9_-]{32,}\b/g,
];

const REDACTED = "[redacted]";

/** Replace every credential-shaped or secret-named value in one string. */
export function redactSecretLikeText(text: string): string {
  let output = text;
  for (const [name, value] of Object.entries(process.env)) {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length < 8) continue;
    if (!SECRET_ENV_NAME_PATTERN.test(name)) continue;
    output = output.split(trimmed).join(REDACTED);
  }
  for (const pattern of SECRET_SHAPED_PATTERNS) {
    output = output.replace(pattern, REDACTED);
  }
  return output;
}

/** One redacted, length-bounded line describing why a branch failed. */
export function summarizeBranchError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const firstLine = redactSecretLikeText(message).split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  const collapsed = firstLine.replace(/\s+/g, " ").trim();
  return collapsed.length > MAX_SUMMARY_LENGTH
    ? `${collapsed.slice(0, MAX_SUMMARY_LENGTH - 1)}…`
    : collapsed;
}
