import { uiSimulationTargets } from "@asol/ui-registry-core";
import { USER_PAGE_REGISTRY } from "@asol/simulation-core";

/**
 * The simulation coverage report: every registered target, and what refers to it.
 *
 * One table answers the questions an operator actually asks — which control is
 * this, on which page, how is it exercised, what may be typed into it, and
 * which scenario depends on it — without opening a browser or reading JSX.
 */
interface ReportRow {
  route: string;
  uid: string;
  id: string;
  interaction: string;
  valueContract: string;
  simulationId: string;
  scenarios: string;
}

const scenariosByUid = new Map<string, string[]>();
for (const page of USER_PAGE_REGISTRY) {
  for (const interaction of page.interactions) {
    const targets = [
      ...interaction.actions.flatMap((action) => (action.type === "wait" ? [] : [action.target])),
      ...(interaction.unavailableWhen ? [interaction.unavailableWhen.target] : []),
    ];
    for (const target of targets) {
      const reference = `${page.id}:${interaction.id}`;
      const current = scenariosByUid.get(target.targetUid) ?? [];
      if (!current.includes(reference)) {
        scenariosByUid.set(target.targetUid, [...current, reference]);
      }
    }
  }
}

const rows: ReportRow[] = uiSimulationTargets().map((target) => ({
  route: target.routes[0] ?? "(no route)",
  uid: target.uid,
  id: target.id,
  interaction: target.interaction?.type ?? (target.simulationKind === "state" ? "presence" : "—"),
  valueContract: target.interaction?.valueContract ?? "—",
  simulationId: target.simulationId ?? "—",
  scenarios: (scenariosByUid.get(target.uid) ?? []).join(" ") || "(none)",
}));

const headers: Array<[keyof ReportRow, string]> = [
  ["route", "ROUTE"],
  ["uid", "UID"],
  ["id", "SEMANTIC ID"],
  ["interaction", "INTERACTION"],
  ["valueContract", "VALUE CONTRACT"],
  ["simulationId", "SIMULATION ID"],
  ["scenarios", "SCENARIOS"],
];
const widths = headers.map(([key, label]) =>
  Math.max(label.length, ...rows.map((row) => String(row[key]).length)),
);

function line(values: string[]): string {
  return values.map((value, index) => value.padEnd(widths[index]!)).join("  ").trimEnd();
}

console.log(line(headers.map(([, label]) => label)));
console.log(line(widths.map((width) => "-".repeat(width))));
for (const row of rows.sort((left, right) => left.uid.localeCompare(right.uid))) {
  console.log(line(headers.map(([key]) => String(row[key]))));
}

const referenced = rows.filter((row) => row.scenarios !== "(none)").length;
console.log(
  `\n${rows.length} registered simulation targets, ${referenced} referenced by a scenario, ` +
    `${rows.length - referenced} registered but not yet exercised.`,
);
