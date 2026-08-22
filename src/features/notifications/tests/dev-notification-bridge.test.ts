import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { getNotificationsPublicUrl } from "@/core/config/public-env";

/**
 * Where the browser bridge posts a signed grant.
 *
 * Each case runs in its own process with the variable it is about set
 * explicitly, because `publicEnv` reads `process.env` once at module load and
 * freezes it. Reading whatever the machine happens to export made this file
 * pass without credentials and fail with them: a machine that has the real
 * `.env.local` sets `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL`, so the "unset" case
 * was never actually unset there. A contract test that flips on whether the
 * developer has secrets is testing the machine, not the code.
 *
 * A child process is the whole isolation mechanism: no module-cache busting, no
 * ordering between cases, and no way for one case to leak into the next.
 */
const CASE_FLAG = "--case";
const TEST_FILE = "src/features/notifications/tests/dev-notification-bridge.test.ts";
const CONFIGURED_ORIGIN = "https://asol-notifications.vercel.app";

function runCase(name: string): void {
  if (name === "unset") {
    // No configured URL and no `window`: the bridge must not invent an origin.
    // Guessing one would post grants somewhere nobody configured.
    assert.equal(
      getNotificationsPublicUrl(),
      null,
      "Without a configured URL and without window, the bridge must not guess an origin.",
    );
    return;
  }

  // Configured: that origin is used verbatim, minus a trailing slash. This is
  // the production and static/native path, and it was never covered.
  assert.equal(
    getNotificationsPublicUrl(),
    CONFIGURED_ORIGIN,
    "A configured origin must be returned without its trailing slash.",
  );
}

function runChild(name: string, notificationsUrl: string | undefined): void {
  const env = { ...process.env };
  if (notificationsUrl === undefined) delete env.NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL;
  else env.NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL = notificationsUrl;

  const result = spawnSync(
    process.execPath,
    [
      path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
      path.join(process.cwd(), TEST_FILE),
      CASE_FLAG,
      name,
    ],
    { env, encoding: "utf8" },
  );

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`dev-notification-bridge case "${name}" failed.`);
  }
}

const caseIndex = process.argv.indexOf(CASE_FLAG);
if (caseIndex !== -1) {
  runCase(process.argv[caseIndex + 1]);
} else {
  runChild("unset", undefined);
  runChild("configured", `${CONFIGURED_ORIGIN}/`);
  console.log("Dev notification bridge contract passed.");
}
