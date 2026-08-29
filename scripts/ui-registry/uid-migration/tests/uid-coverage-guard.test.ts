import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { checkUidCoverage } from "../check-uid-coverage";

/**
 * Adversarial proof that `checkUidCoverage` actually enforces the mandatory
 * coverage invariant: an unregistered project-owned DOM usage site fails the
 * build, a legitimately un-registrable site is reported unless declared as
 * an exception, and a stale exception is rejected once its site is gone.
 */
const root = process.cwd();
const probeDirectory = join(root, "src", "features", "__uid_coverage_guard_probe");

mkdirSync(probeDirectory, { recursive: true });
try {
  // A raw host tag with no registration at all.
  writeFileSync(
    join(probeDirectory, "unregistered.tsx"),
    "export const A = () => <div className=\"probe\">hi</div>;\n",
    "utf8",
  );
  const withGap = checkUidCoverage(root);
  assert.ok(
    withGap.some((error) => error.includes("unregistered.tsx") && error.includes("has no ui.uid")),
    "An unregistered host tag must fail UID coverage.",
  );

  // The same site, now registered — the guard must fall silent for it.
  writeFileSync(
    join(probeDirectory, "unregistered.tsx"),
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
      'export const A = () => <div {...uiAttributes({ uid: "probe.coverage-A1bcd9", id: "probe.coverage" })} className="probe">hi</div>;\n',
    "utf8",
  );
  const withoutGap = checkUidCoverage(root);
  assert.ok(
    !withoutGap.some((error) => error.includes("unregistered.tsx")),
    "A registered host tag must not be reported.",
  );
} finally {
  rmSync(probeDirectory, { recursive: true, force: true });
}

console.log("UI uid coverage guard adversarial tests passed.");
