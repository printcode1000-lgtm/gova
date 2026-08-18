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

function parseProvidedTargets(args: readonly string[]): ServiceDeployTarget[] | "all" | null {
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

  const unknown = values.filter(
    (value) =>
      value !== "main" && !ALL_SERVICE_TARGETS.includes(value as ServiceDeployTarget),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Unknown Vercel target(s): ${unknown.join(", ")}. Expected: ${ALL_SERVICE_TARGETS.join(", ")}, main (ignored — always verified), or all.`,
    );
  }

  const services = values.filter((value) => value !== "main") as ServiceDeployTarget[];
  if (services.length === 0) {
    throw new Error(
      "At least one service target is required besides main. Main (gova) is always verified after GitHub push.",
    );
  }

  return [...new Set(services)];
}

function expandSelection(selection: ServiceDeployTarget[] | "all"): ServiceDeployTarget[] {
  return selection === "all" ? [...ALL_SERVICE_TARGETS] : selection;
}

/**
 * Resolves which isolated Vercel service accounts `deploy:push` should deploy.
 * GitHub push and main (`gova`) Vercel verification are always mandatory.
 */
export async function resolveServiceDeployTargets(
  args: readonly string[],
): Promise<ServiceDeployTarget[]> {
  const provided = parseProvidedTargets(args);
  if (provided !== null) {
    const targets = expandSelection(provided);
    console.log(
      `[deploy:push] Service targets: ${targets.join(", ")}; main is always verified (from --vercel-target)`,
    );
    return targets;
  }

  if (!process.stdin.isTTY) {
    throw new Error(
      [
        "deploy:push needs a service Vercel target and there is no terminal to ask.",
        "",
        "Pass one explicitly, for example:",
        "  --vercel-target=notifications",
        "  --vercel-target=products,orders",
        "  --vercel-target=all",
        "",
        `Accepted values: ${ALL_SERVICE_TARGETS.join(", ")}, or all.`,
        "Main (gova) is always verified after GitHub push; do not pass main alone.",
      ].join("\n"),
    );
  }

  console.log("\n[deploy:push] Choose Vercel service account(s) to deploy.");
  console.log("GitHub push and main (gova) Vercel verification are always performed.\n");
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
      console.log("Not one of the choices. Answer 1–5, or press Ctrl+C to stop.");
      continue;
    }
    const targets =
      chosen.target === "all" ? [...ALL_SERVICE_TARGETS] : [chosen.target];
    console.log(
      `\n[deploy:push] Service targets: ${targets.join(", ")}; main will be verified after push.\n`,
    );
    return targets;
  }
}

export const __testables = {
  parseProvidedTargets,
  expandSelection,
};
