import { apiError, apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { runTracedBusinessRoute } from "@/app/api/auth/traced-route";
import {
  launchDeployConsole,
  pollDeployConsoleLog,
} from "@/modules/deploy-console/services/deploy-console-launch.server";

export const runtime = "nodejs";

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  localDevelopmentOnly: { message: "Deploy console is local development only", status: 404 },
  deployConsoleInvalidBody: { message: "Invalid request body", status: 400 },
  deployConsoleUnknownEngine: { message: "Unknown deploy engine", status: 400 },
  deployConsoleNoPhasesSelected: { message: "Select at least one phase", status: 400 },
  deployConsoleInvalidRevision: { message: "Invalid revision sha", status: 400 },
  deployConsoleNoCommands: { message: "No commands to run", status: 400 },
  deployConsoleRunActive: { message: "A deploy run is already active", status: 409 },
  deployConsoleSpawnFailed: { message: "Failed to start deploy process", status: 500 },
};

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/dev/deploy-console", async () => {
    try {
      const body = await readJsonBody(request);
      const run = launchDeployConsole(body);
      return apiSuccess({
        launched: true,
        runId: run.runId,
        status: run.status,
        engine: run.engine,
        commands: run.commands,
        summaryLines: run.summaryLines,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const mapped = ERROR_MESSAGES[code];
      if (mapped) return apiError(mapped.message, mapped.status);
      return mapServiceError(error);
    }
  });
}

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/dev/deploy-console", async () => {
    try {
      const url = new URL(request.url);
      const offset = Number(url.searchParams.get("offset") || "0");
      const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
      return apiSuccess(pollDeployConsoleLog(safeOffset));
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const mapped = ERROR_MESSAGES[code];
      if (mapped) return apiError(mapped.message, mapped.status);
      return mapServiceError(error);
    }
  });
}
