#!/usr/bin/env tsx
import { generateOtaSigningKeys } from "../src/publishing";

function main(): void {
  const result = generateOtaSigningKeys();
  if (!result.ok) {
    console.error(`❌ Key generation failed: ${result.error.message}`);
    process.exit(1);
  }

  console.log(`✅ OTA private key: ${result.value.privateKeyPath}`);
  console.log(`✅ OTA public key:  ${result.value.publicKeyPath}`);
  console.log("Keep the private key secret and backed up. It is ignored by Git.");
}

main();
