import { existsSync } from "node:fs";
import dotenv from "dotenv";

/** Loads env files used by release, deploy, and platform-truth readers. */
export function loadReleaseEnvironment(): void {
  if (existsSync(".env.local")) {
    dotenv.config({ path: ".env.local", quiet: true });
  }
  dotenv.config({ path: ".env", quiet: true });
  if (existsSync("fastlane/.env")) {
    dotenv.config({ path: "fastlane/.env", quiet: true });
  }
}
