import { assertSimulationCoverage } from "@asol/simulation-core/discovery";

const report = assertSimulationCoverage();
console.log(
  `Simulation coverage passed: ${report.pages} pages, ${report.events} events, ` +
    `${report.interactionSources} discovered interaction sources.`,
);
