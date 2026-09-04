import { deployAllScenarioArg } from "./deploy-runbook-copy";

export function deployAllPreview(
  scenario: string,
  selected: Set<string>,
  flags: {
    continueOnError: boolean;
    skipPreflight: boolean;
    allowEmpty: boolean;
    allowManifestDowngrade: boolean;
    allowScratchFiles: boolean;
  },
) {
  const parts = [
    `npm run deploy:all -- ${deployAllScenarioArg(scenario)}`,
    `--runbook-branches=${[...selected].join(",")}`,
    flags.continueOnError ? "--continue-on-error" : "",
    flags.skipPreflight ? "--skip-preflight" : "",
    flags.allowEmpty ? "--allow-empty" : "",
    flags.allowManifestDowngrade ? "--allow-manifest-downgrade" : "",
    flags.allowScratchFiles ? "--allow-scratch-files" : "",
  ].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * `deploy:push:fast` is pinned to `--fast --vercel-target=all`, so there is no
 * target to preview. `--fast` also returns before the scratch-file and
 * manifest-downgrade refusals, so showing those flags would promise a check the
 * run does not perform; `--allow-empty` reaches the commit and is kept.
 */
export function deployPushPreview(flags: { allowEmpty: boolean }) {
  const parts = [
    "npm run deploy:push:fast",
    flags.allowEmpty ? "-- --allow-empty" : "",
  ].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
