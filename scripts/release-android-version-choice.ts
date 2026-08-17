import { createInterface } from "node:readline";

/**
 * The terminal form of the release console's Android-version dialog.
 *
 * `npm run release:android` and the "start full release" button
 * (`releaseConsole.androidPaths.release.action`) in
 * `/super-admin/google-play-store-assets?tab=build-publish` are the same command: the
 * button collects a choice, `build-command-catalog` turns it into `--native-version=…`,
 * and `build-job-runner` then spawns `npm run release:android -- <argv>`. Running the
 * script from VS Code passed no argument at all, so `cap-build` fell through to its
 * `auto` default — a third behaviour the dialog never offers and nobody asked for.
 *
 * This module closes that gap by asking the same question the dialog asks, with the same
 * two answers. The wording is taken from `releaseConsole.parameterValues.*` so the two
 * surfaces cannot drift into describing the same choice differently.
 *
 * ## Why the argument still wins
 *
 * The button's own run arrives here **with** `--native-version=…` and **without** a
 * terminal: `build-job-runner` spawns with the default `stdio: "pipe"` so it can write the
 * job log that the Jobs tab reads. Prompting unconditionally would hang that run forever
 * on input nobody can supply, with the question buried in a log file and the exclusive
 * release lock held until the job is killed by hand.
 *
 * So: an explicit argument is honoured, and a missing one is **never** guessed. Without a
 * terminal to ask, the run is refused rather than defaulted.
 */

/**
 * The two answers the dialog offers, and the flag value each maps to.
 *
 * English only. The console renders the localized labels from
 * `releaseConsole.parameterValues.*`; this terminal deliberately does not, because a
 * mixed-script line is unreadable in most shells — bidirectional text reorders around the
 * flag values and option numbers, and the result misleads about which key selects what.
 *
 * The wording is the English side of those same locale keys, so the two surfaces still say
 * the same thing.
 */
const CHOICES = [
  {
    key: "1",
    value: "current",
    label: "Rebuild with the current Android version",
    note: "Only when rebuilding the same unreleased shell.",
  },
  {
    key: "2",
    value: "next-patch",
    label: "Create a new Android patch version",
    note: "For a new Google Play candidate: versionName and versionCode move together.",
  },
] as const;

export const NATIVE_VERSION_FLAG = "--native-version=";

/** The values `cap-build` accepts. `auto` is deliberately not among them. */
const ACCEPTED = CHOICES.map((choice) => choice.value);

function readProvided(args: readonly string[]): string | null {
  const provided = args.filter((argument) => argument.startsWith(NATIVE_VERSION_FLAG));
  if (provided.length > 1) {
    throw new Error(
      "Choose exactly one Android native version action: more than one --native-version was given.",
    );
  }
  if (provided.length === 0) return null;

  const value = provided[0]!.slice(NATIVE_VERSION_FLAG.length);
  if (!ACCEPTED.includes(value as (typeof ACCEPTED)[number])) {
    throw new Error(
      `Invalid Android native version action: "${value}". ` +
        `Expected one of: ${ACCEPTED.join(", ")}.`,
    );
  }
  return value;
}

function ask(question: string): Promise<string> {
  const io = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    io.question(question, (answer) => {
      io.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Resolves the Android version action for a full release.
 *
 * Returns the value to put after `--native-version=`. Never returns a default: every
 * path here either reflects an explicit argument or an answer typed at a prompt.
 */
export async function resolveNativeVersionAction(
  args: readonly string[],
): Promise<string> {
  const provided = readProvided(args);
  if (provided !== null) {
    console.log(`Android version action: ${provided} (from --native-version)`);
    return provided;
  }

  if (!process.stdin.isTTY) {
    throw new Error(
      [
        "release:android needs an Android version action and there is no terminal to ask.",
        "",
        "Pass it explicitly:",
        ...CHOICES.map((choice) => `  --native-version=${choice.value}   ${choice.label}`),
        "",
        "It is not defaulted on purpose. A full release that silently picks its own version",
        "number is the one mistake this path exists to prevent.",
      ].join("\n"),
    );
  }

  console.log("\nAndroid version for this build\n");
  for (const choice of CHOICES) {
    console.log(`  ${choice.key}) ${choice.label}`);
    console.log(`     ${choice.note}\n`);
  }

  // Loops rather than falling back: a mistyped answer must not become a release decision.
  for (;;) {
    const answer = await ask(`Choose ${CHOICES.map((c) => c.key).join(" or ")}: `);
    const chosen = CHOICES.find(
      (choice) => choice.key === answer || choice.value === answer,
    );
    if (chosen) {
      console.log(`\nAndroid version action: ${chosen.value}\n`);
      return chosen.value;
    }
    console.log("Not one of the choices. Answer 1 or 2, or press Ctrl+C to stop.");
  }
}
