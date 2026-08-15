/**
 * Master test runner for @asol/native-core.
 */

console.log("Running @asol/native-core test suite...\n");

import "./contract/native-core-boundary.test";
import "./contract/capability-registry.test";
import "./contract/plugin-matrix.test";
import "./contract/native-core-ast-boundary.test";
import "./unit/share-validator.test";
import "./unit/share-queue.test";
import "./unit/schemas.test";
import "./integration/share-receive-flow.test";
import "./integration/native-core-host-behaviour.test";

console.log("\n==========================================");
console.log("All @asol/native-core tests passed successfully!");
console.log("==========================================");
