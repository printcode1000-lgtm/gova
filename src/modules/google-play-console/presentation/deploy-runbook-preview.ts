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

export function deployPushPreview(
  target: string,
  flags: {
    allowEmpty: boolean;
    allowManifestDowngrade: boolean;
    allowScratchFiles: boolean;
  },
) {
  const parts = [
    `npm run deploy:push -- --vercel-target=${target}`,
    flags.allowEmpty ? "--allow-empty" : "",
    flags.allowManifestDowngrade ? "--allow-manifest-downgrade" : "",
    flags.allowScratchFiles ? "--allow-scratch-files" : "",
  ].filter(Boolean);
  return parts.join("");
}
