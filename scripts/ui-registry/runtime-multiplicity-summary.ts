import { runtimeMultiplicityReport } from './runtime-multiplicity-audit';

const report = runtimeMultiplicityReport();
const grouped = new Map<string, { count: number; iterator: number; reusable: number; samples: string[] }>();
for (const item of report.unresolved) {
  const key = `${item.file}#${item.component ?? 'unknown'}`;
  const current = grouped.get(key) ?? { count: 0, iterator: 0, reusable: 0, samples: [] };
  current.count += 1;
  if (item.reason === 'iterator') current.iterator += 1;
  else current.reusable += 1;
  if (current.samples.length < 8) current.samples.push(`${item.line}:${item.uid}`);
  grouped.set(key, current);
}

console.log(JSON.stringify({
  canonicalInlineDescriptors: report.canonicalInlineDescriptors,
  repeatedSourceSites: report.repeatedSourceSites,
  repeatedWithInstance: report.repeatedWithInstance,
  directIteratorSites: report.directIteratorSites,
  reusableTemplateSites: report.reusableTemplateSites,
  unresolvedCount: report.unresolved.length,
  groups: [...grouped.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
}, null, 2));
