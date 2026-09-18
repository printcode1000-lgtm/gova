import assert from "node:assert/strict";

import {
  CloudflareControlError,
  listCloudflareAccounts,
  parseArgs,
  resolveCloudflareAccount,
  runCloudflareControl,
} from "../cloudflare-control";

const parsed = parseArgs(["r2:objects:list", "--account", "general", "--prefix=images/", "--json"]);
assert.equal(parsed.command, "r2:objects:list");
assert.equal(parsed.flags.account, "general");
assert.equal(parsed.flags.prefix, "images/");
assert.equal(parsed.flags.json, true);

const accounts = listCloudflareAccounts();
assert.equal(accounts.length >= 4, true);
assert.equal(accounts.some((account) => account.id === "ota" && account.tokenEnvVar === "ASOL_OTA_R2_API_TOKEN"), true);
assert.equal(resolveCloudflareAccount("pic1").id, "general");

async function main(): Promise<void> {
  assert.match(
    await runCloudflareControl(["help"], {}),
    /r2:analytics:verify/,
    "help must document the GraphQL Analytics permission check",
  );

  const listing = await runCloudflareControl(["accounts:list", "--json"], {
    R2_API_TOKEN: "secret-token-value",
    R2_ACCOUNT_ID: "account-id",
  });
  assert.equal(listing.includes("secret-token-value"), false);
  assert.equal(listing.includes('"token": "present"'), true);
  assert.equal(listing.includes("R2_API_TOKEN"), true);

  await assert.rejects(
    () =>
      runCloudflareControl(["r2:object:delete", "--account", "general", "--key", "x"], {
        R2_API_TOKEN: "secret-token-value",
        R2_ACCOUNT_ID: "account-id",
      }),
    (error) => error instanceof CloudflareControlError && error.message.includes("without --confirm"),
  );

  await assert.rejects(
    () =>
      runCloudflareControl(
        ["api:request", "--account", "general", "--method", "PATCH", "--path", "/accounts/{account_id}/r2/buckets/pic1"],
        {
          R2_API_TOKEN: "secret-token-value",
          R2_ACCOUNT_ID: "account-id",
        },
      ),
    (error) => error instanceof CloudflareControlError && error.message.includes("without --confirm"),
  );

  console.log("Cloudflare control CLI: account registry, secret redaction, and write confirmation guards passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
