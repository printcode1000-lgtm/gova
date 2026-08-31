import { syncPeerInfoToR2, resolveLocalRole, type PeerSyncResult } from "@asol/local-agent-core";

interface ParsedArgs {
  once: boolean;
  intervalSeconds: number;
  role?: "desktop" | "laptop";
  quiet: boolean;
}

function parseCliArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    once: false,
    intervalSeconds: 3600,
    quiet: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--once") {
      result.once = true;
    } else if (arg === "--quiet" || arg === "-q") {
      result.quiet = true;
    } else if (arg === "--interval" || arg === "-i") {
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        const parsed = parseInt(next, 10);
        if (!isNaN(parsed) && parsed > 0) {
          result.intervalSeconds = parsed;
        }
        i++;
      }
    } else if (arg.startsWith("--interval=")) {
      const parsed = parseInt(arg.split("=")[1]!, 10);
      if (!isNaN(parsed) && parsed > 0) {
        result.intervalSeconds = parsed;
      }
    } else if (arg === "--role" && (args[i + 1] === "desktop" || args[i + 1] === "laptop")) {
      result.role = args[i + 1] as "desktop" | "laptop";
      i++;
    } else if (arg === "--role=desktop" || arg === "--role=laptop") {
      result.role = arg.split("=")[1] as "desktop" | "laptop";
    }
  }

  return result;
}

function formatResult(res: PeerSyncResult): string {
  const time = new Date().toLocaleTimeString();
  const status = res.changed ? "UPDATED" : "SYNCED (no changes)";
  return `[${time}] [${status}] Role: ${res.role} | Host: ${res.hostname} | LAN: ${res.lanIp} | WAN: ${res.wanIp || "(unavailable)"}`;
}

async function performSync(options: { role?: "desktop" | "laptop"; quiet: boolean }): Promise<void> {
  try {
    const result = await syncPeerInfoToR2(undefined, { role: options.role });
    if (!options.quiet) {
      console.log(formatResult(result));
    }
  } catch (error) {
    const time = new Date().toLocaleTimeString();
    console.error(`[${time}] [ERROR] Peer sync to Cloudflare R2 failed:`, error instanceof Error ? error.message : String(error));
  }
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));

  console.log("==================================================");
  console.log(" GOVA Local Agent Peer Sync (Cloudflare R2)");
  console.log("==================================================");
  console.log(`Detected role: ${args.role || resolveLocalRole()}`);
  console.log(`Mode: ${args.once ? "Single run (--once)" : `Continuous interval (${args.intervalSeconds}s / ${(args.intervalSeconds / 3600).toFixed(1)}h)`}`);
  console.log("--------------------------------------------------");

  // Run initial sync
  await performSync({ role: args.role, quiet: args.quiet });

  if (args.once) {
    return;
  }

  console.log(`Watching and refreshing device information every ${args.intervalSeconds}s. Press Ctrl+C to stop.`);

  const intervalTimer = setInterval(async () => {
    await performSync({ role: args.role, quiet: args.quiet });
  }, args.intervalSeconds * 1000);

  const cleanup = () => {
    clearInterval(intervalTimer);
    console.log("\nPeer sync stopped.");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
