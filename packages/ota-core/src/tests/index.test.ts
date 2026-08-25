import { runAppEdgeTests } from './contract/app-edges.test';
import { runPortRegistrationTests } from './contract/port-registration.test';
import { runVersionOrderingTests } from "./version-ordering.test";
import { runContentVersionTests } from "./content-version.test";
import { runCanonicalOrderTests } from "./canonical-order.test";
import { runSignaturePayloadTests } from "./signature-payload.test";
import { runCapabilityGateTests } from "./capability-gate.test";
import { runBundleTests } from "./bundle.test";
import { runDeltaPlanTests } from "./delta-plan.test";
import { runRolloutTests } from "./rollout.test";
import { runAdoptionTests } from "./adoption.test";
import { runRevocationStateTests } from "./revocation-state.test";
import { runOtaStateTests } from "./ota-state.test";
import { runGateIntegrationTests } from "./gate.test";
import { runR2StorageTests } from "./r2-storage.test";
import { runRevocationFlowTests } from "./revocation-flow.test";
import { runRuntimeUpdateServiceTests } from "./runtime-update-service.test";
import { runRuntimeSealingTests } from "./runtime-sealing.test";
import { runPublishingExportsTests } from "./publishing-exports.test";
import { runStoreProductionTruthTests } from "./store-production-truth.test";
import { runPlatformVersionTruthTests } from "./platform-version-truth.test";
import { runNativeCompatibilityTests } from "./native-compatibility.test";
import { runR2RetryTests } from "./r2-retry.test";
import { loadOtaEnvironment } from "../publishing";

async function main(): Promise<void> {
  // Removing the legacy mirror eliminated an import-time dotenv side effect.
  // We load the environment explicitly so tests running subprocesses in temp
  // fixture directories (e.g. native compatibility dry-runs) inherit the OTA configuration.
  loadOtaEnvironment();
  console.log("\n🧪 Running @asol/ota-core Test Suites...\n");

  console.log("1. Unit Tests:");
  await runVersionOrderingTests();
  await runContentVersionTests();
  runPlatformVersionTruthTests();
  await runStoreProductionTruthTests();
  await runCanonicalOrderTests();
  await runSignaturePayloadTests();
  await runCapabilityGateTests();
  await runBundleTests();
  await runDeltaPlanTests();
  await runRolloutTests();
  await runAdoptionTests();
  await runRevocationStateTests();
  await runOtaStateTests();

  console.log("\n2. Integration Tests:");
  await runGateIntegrationTests();
  await runR2StorageTests();
  await runRevocationFlowTests();
  await runRuntimeUpdateServiceTests();
  await runNativeCompatibilityTests();
  await runR2RetryTests();

  console.log("\n3. Contract & Boundary Tests:");
  await runRuntimeSealingTests();
  await runPublishingExportsTests();
  await runAppEdgeTests();
  await runPortRegistrationTests();

  console.log("\n✅ All @asol/ota-core test suites passed!\n");
}

main().catch((error) => {
  console.error("\n❌ @asol/ota-core tests failed:", error);
  process.exit(1);
});
