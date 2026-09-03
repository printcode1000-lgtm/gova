import assert from "node:assert/strict";
import { requiredReadyComponents } from "../index";

const reports = [
  { target: "control", state: "READY", message: "ready", deploymentId: "c" },
  { target: "products", state: "READY", message: "ready", deploymentId: "p" },
] as const;
assert.equal(requiredReadyComponents({ reports, targets: ["control", "products"] }).products?.status, "passed");
assert.throws(() => requiredReadyComponents({ reports, targets: ["control", "orders"] }), /Missing Vercel deployment report/);
assert.throws(() => requiredReadyComponents({ reports: [{ target: "control", state: "ERROR", message: "bad" }], targets: ["control"] }), /control is ERROR/);
console.log("release-core readiness: complete READY evidence required; missing or failed components fail closed.");
