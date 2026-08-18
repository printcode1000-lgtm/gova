import { existsSync, readFileSync } from "fs";
import dotenv from "dotenv";
import path from "node:path";

import { redeployLatestProduction } from "@asol/vercel-deploy-core";

if (existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config({ path: ".env" });

async function main(): Promise<void> {
  const token = process.env.VERCEL_TOKEN || process.env.VERCEL_ACCESS_TOKEN;
  const teamId = process.env.VERCEL_ORG_ID || process.env.VERCEL_TEAM_ID;
  const projectName = process.env.VERCEL_PROJECT_NAME?.trim() || "gova";

  if (!token) {
    throw new Error("VERCEL_TOKEN or VERCEL_ACCESS_TOKEN is required in .env");
  }

  let projectId = process.env.VERCEL_PROJECT_ID?.trim() ?? "";
  const linkPath = path.join(process.cwd(), ".vercel", "project.json");
  if (!projectId && existsSync(linkPath)) {
    const link = JSON.parse(readFileSync(linkPath, "utf8")) as { projectId?: string };
    projectId = link.projectId?.trim() ?? "";
  }

  const result = await redeployLatestProduction({
    token,
    projectName,
    projectId: projectId || undefined,
    teamId,
  });

  console.log(`✅ Redeploy started: ${result.url ?? result.deploymentId ?? "ok"}`);
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});
