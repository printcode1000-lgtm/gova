import { checkDomIdentityCoverageContract, violations } from "@asol/architecture-core";

checkDomIdentityCoverageContract();
if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`${violation.file}: ${violation.violation}`);
  }
  process.exit(1);
}
console.log("UI identity coverage contract holds.");
