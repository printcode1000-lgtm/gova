import { assertSingleLocalEnvSource } from "@asol/env-core/process";

assertSingleLocalEnvSource(process.cwd());
console.log("Environment source contract passed: .env.local is the only local application/release env file.");
