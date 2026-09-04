import { createInterface } from "node:readline";

/** Isolated Vercel accounts — `main` is always verified separately. */
export type ServiceDeployTarget = "notifications" | "products" | "orders" | "profiles";

export type RootAppDeployTarget = "submain" | "sub2main";

export type DeployPushTarget = ServiceDeployTarget | RootAppDeployTarget;

export const ALL_ROOT_APP_TARGETS: readonly RootAppDeployTarget[] = ["submain", "sub2main"];

export const ALL_SERVICE_TARGETS: readonly ServiceDeployTarget[] = [
  "notifications",
  "products",
  "orders",
  "profiles",
];

export const ALL_DEPLOY_PUSH_TARGETS: readonly DeployPushTarget[] = [
  ...ALL_SERVICE_TARGETS,
  ...ALL_ROOT_APP_TARGETS,
];

export const VERCEL_TARGET_FLAG = "--vercel-target=";

/**
 * The prompt offers what a run can actually do, and nothing else.
 *
 * It used to list each isolated account, because a partial selection diverted to
 * a maintenance deploy. That path is gone: `deploy:push` publishes the complete
 * set or refuses, so an account key here would be a choice that always ends in a
 * refusal. Deploy one account with its own `*:deploy` script.
 */
const CHOICES = [
  {
    key: "0",
    target: "none" as const,
    label: "Nothing — stop without committing, pushing or deploying",
  },
  {
    key: "1",
    target: "all" as const,
    label: "Publish a release: control + all six isolated accounts + main",
  },
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
): DeployPushTarget[] | "all" | "none" | null {
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
      value !== "main" && !ALL_DEPLOY_PUSH_TARGETS.includes(value as DeployPushTarget),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Unknown Vercel target(s): ${unknown.join(", ")}. Expected: ${ALL_DEPLOY_PUSH_TARGETS.join(", ")}, main, none, or all.`,
    );
  }

  const isolated = values.filter((value) => value !== "main") as DeployPushTarget[];
  if (isolated.length === 0) return "none";

  return [...new Set(isolated)];
}

function expandSelection(
  selection: DeployPushTarget[] | "all" | "none",
): DeployPushTarget[] {
  if (selection === "all") return [...ALL_DEPLOY_PUSH_TARGETS];
  if (selection === "none") return [];
  return selection;
}

function logResolvedTargets(source: string, targets: DeployPushTarget[]): void {
  if (targets.length === 0) {
    console.log(`[deploy:push] Service targets: none — nothing will be published (${source}).`);
    return;
  }
  // The release console reads this line back with
  // /\[deploy:push\] Service targets: ([^(]+)\(/, so the account list must stay
  // between the label and the first parenthesis. Extra prose goes after it.
  console.log(
    `[deploy:push] Service targets: ${targets.join(", ")} (${source}). ` +
      "Control, readiness and main follow.",
  );
}

/**
 * Resolves which isolated Vercel accounts `deploy:push` should deploy.
 *
 * The only publishing answer is the complete set. Anything else is refused by
 * the caller, so this resolves to either all six isolated accounts or an empty
 * selection that stops the run.
 */
export async function resolveServiceDeployTargets(
  args: readonly string[],
): Promise<DeployPushTarget[]> {
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
        "Pass one explicitly:",
        "  --vercel-target=all    publish a release: control + all six + main",
        "  --vercel-target=none   stop without committing, pushing or deploying",
        "",
        "Only the complete set publishes. A partial selection is refused — deploy",
        "one account with its own *:deploy script instead. See",
        "docs/07-mobile-and-release/release-commands.md.",
      ].join("\n"),
    );
  }

  console.log("\n[deploy:push] Choose what this run publishes.");
  console.log(
    "The complete set is the only publishing option: control, the six isolated\n" +
      "accounts, exact-SHA readiness, and gova.\n",
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
      console.log(
        `Not one of the choices. Answer ${CHOICES.map((choice) => choice.key).join(" or ")}, ` +
          "or press Ctrl+C to stop.",
      );
      continue;
    }
    const targets = chosen.target === "all" ? [...ALL_DEPLOY_PUSH_TARGETS] : [];
    logResolvedTargets("from prompt", targets);
    console.log("");
    return targets;
  }
}

export const __testables = {
  parseProvidedTargets,
  expandSelection,
};
