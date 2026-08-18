import { createInterface } from "node:readline";

/** Isolated Vercel service accounts — `main` is always verified separately. */
export type ServiceDeployTarget = "notifications" | "products" | "orders" | "profiles";

export const ALL_SERVICE_TARGETS: readonly ServiceDeployTarget[] = [
  "notifications",
  "products",
  "orders",
  "profiles",
];

export const VERCEL_TARGET_FLAG = "--vercel-target=";

const CHOICES = [
  {
    key: "0",
    target: "none" as const,
    label: "GitHub + main only (no service account deploys)",
  },
  { key: "1", target: "notifications" as const, label: "Notifications (asol-notifications)" },
  { key: "2", target: "products" as const, label: "Products (asol-products)" },
  { key: "3", target: "orders" as const, label: "Orders (asol-orders)" },
  { key: "4", target: "profiles" as const, label: "Profiles (asol-profiles)" },
  { key: "5", target: "all" as const, label: "All four service accounts" },
] as const;

function ask(question: string): Promise<string> {
  const io = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    io.question(question, (answer) => {
      io.close();
      resolve(answer.trim());
    });
  });
}

function parseProvidedTargets(
  args: readonly string[],
): ServiceDeployTarget[] | "all" | "none" | null {
  const provided = args.filter((argument) => argument.startsWith(VERCEL_TARGET_FLAG));
  if (provided.length === 0) return null;

  const values = provided.flatMap((argument) =>
    argument
      .slice(VERCEL_TARGET_FLAG.length)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  if (values.length === 0) {
    throw new Error("--vercel-target was given without a value.");
  }

  if (values.includes("all")) {
    if (values.length > 1) {
      throw new Error("Pass --vercel-target=all alone, not with other targets.");
    }
    return "all";
  }

  if (values.includes("none")) {
    if (values.length > 1) {
      throw new Error("Pass --vercel-target=none alone, not with other targets.");
    }
    return "none";
  }

  const unknown = values.filter(
    (value) =>
      value !== "main" && !ALL_SERVICE_TARGETS.includes(value as ServiceDeployTarget),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Unknown Vercel target(s): ${unknown.join(", ")}. Expected: ${ALL_SERVICE_TARGETS.join(", ")}, main, none, or all.`,
    );
  }

  const services = values.filter((value) => value !== "main") as ServiceDeployTarget[];
  if (services.length === 0) return "none";

  return [...new Set(services)];
}

function expandSelection(
  selection: ServiceDeployTarget[] | "all" | "none",
): ServiceDeployTarget[] {
  if (selection === "all") return [...ALL_SERVICE_TARGETS];
  if (selection === "none") return [];
  return selection;
}

function logResolvedTargets(source: string, targets: ServiceDeployTarget[]): void {
  if (targets.length === 0) {
    console.log(
      `[deploy:push] Service targets: none — secrets backup, GitHub push, and main verification only (${source}).`,
    );
    return;
  }
  console.log(
    `[deploy:push] Service targets: ${targets.join(", ")}; main is always verified (${source}).`,
  );
}

/**
 * Resolves which isolated Vercel service accounts `deploy:push` should deploy.
 * An empty result means GitHub push + main verification only.
 * `secrets:backup` is always run by the caller before publish steps.
 */
export async function resolveServiceDeployTargets(
  args: readonly string[],
): Promise<ServiceDeployTarget[]> {
  const provided = parseProvidedTargets(args);
  if (provided !== null) {
    const targets = expandSelection(provided);
    logResolvedTargets("from --vercel-target", targets);
    return targets;
  }

  if (!process.stdin.isTTY) {
    throw new Error(
      [
        "deploy:push needs a deployment scope and there is no terminal to ask.",
        "",
        "Pass one explicitly, for example:",
        "  --vercel-target=main          GitHub + main only",
        "  --vercel-target=none          same as main",
        "  --vercel-target=notifications",
        "  --vercel-target=all",
        "",
        `Service values: ${ALL_SERVICE_TARGETS.join(", ")}, all, main, or none.`,
        "secrets:backup, GitHub push, and main Vercel verification always run.",
      ].join("\n"),
    );
  }

  console.log("\n[deploy:push] Choose Vercel service account(s) to deploy.");
  console.log(
    "secrets:backup, GitHub push, and main (gova) Vercel verification are always performed.\n",
  );
  for (const choice of CHOICES) {
    console.log(`  ${choice.key}) ${choice.label}`);
  }
  console.log("");

  for (;;) {
    const answer = await ask(`Choose ${CHOICES.map((choice) => choice.key).join(", ")}: `);
    const chosen = CHOICES.find(
      (choice) => choice.key === answer || choice.target === answer,
    );
    if (!chosen) {
      console.log("Not one of the choices. Answer 0–5, or press Ctrl+C to stop.");
      continue;
    }
    const targets =
      chosen.target === "all"
        ? [...ALL_SERVICE_TARGETS]
        : chosen.target === "none"
          ? []
          : [chosen.target];
    logResolvedTargets("from prompt", targets);
    console.log("");
    return targets;
  }
}

export const __testables = {
  parseProvidedTargets,
  expandSelection,
};
