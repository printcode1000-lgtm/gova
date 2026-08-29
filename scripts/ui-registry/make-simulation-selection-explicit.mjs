import fs from 'node:fs';

function replaceOnce(source, from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, got ${count}`);
  return source.replace(from, to);
}

const registryPath = 'packages/simulation-core/src/registries/user-page-registry.ts';
let registry = fs.readFileSync(registryPath, 'utf8');
registry = replaceOnce(
  registry,
  'function listItemTarget(id: string): SimulationTarget {\n  return target("list-item", id);\n}',
  'function listItemTarget(id: string): SimulationTarget {\n  return { ...target("list-item", id), selection: "first" };\n}',
  'listItemTarget explicit first selection',
);
fs.writeFileSync(registryPath, registry);

const adapterPath = 'src/features/simulation/infrastructure/iframe-simulation-execution.port.ts';
let adapter = fs.readFileSync(adapterPath, 'utf8');
adapter = replaceOnce(
  adapter,
  'function targetLabel(target: SimulationTarget): string {\n  return `${target.simulationId}(${target.targetUid})`;\n}\n',
  'function targetLabel(target: SimulationTarget): string {\n  return `${target.simulationId}(${target.targetUid})`;\n}\n\nfunction assertTargetAddressing(target: SimulationTarget): ReturnType<typeof uiSimulationTarget> {\n  const registered = uiSimulationTarget(target.targetUid);\n  if (!registered) throw new Error(`simulationTargetNotRegistered:${targetLabel(target)}`);\n  if (target.instance !== undefined && target.selection !== undefined) {\n    throw new Error(`simulationTargetAddressingConflict:${targetLabel(target)}`);\n  }\n  if (target.instance !== undefined && !registered.repeated) {\n    throw new Error(`simulationTargetInstanceOnSingle:${targetLabel(target)}`);\n  }\n  if (target.selection !== undefined && !registered.repeated) {\n    throw new Error(`simulationTargetSelectionOnSingle:${targetLabel(target)}`);\n  }\n  if (registered.repeated && target.instance === undefined && target.selection !== "first") {\n    throw new Error(`simulationRepeatedTargetRequiresInstanceOrExplicitFirst:${targetLabel(target)}`);\n  }\n  return registered;\n}\n',
  'adapter addressing helper',
);

const oldTargetBody = `  private target(target: SimulationTarget): Element {\n    const selector = targetSelector(target);\n    const matches = this.documentNode().querySelectorAll(selector);\n    if (matches.length === 0) {\n      throw new Error(\n        target.instance !== undefined\n          ? \`simulationInteractionTargetInstanceMissing:\${targetLabel(target)} instance="\${target.instance}"\`\n          : \`simulationInteractionTargetMissing:\${targetLabel(target)}\`,\n      );\n    }\n    // An \`instance\` selector already narrows to \`[data-ui-uid][data-ui-instance]\`,\n    // so more than one match there is a real DOM bug (two rows sharing an\n    // instance id), never an intentional collection to fall back on.\n    if (target.instance !== undefined && matches.length > 1) {\n      throw new Error(\n        \`simulationInteractionTargetInstanceAmbiguous:\${targetLabel(target)} instance="\${target.instance}" matched \${matches.length} elements\`,\n      );\n    }\n    // Multiplicity is a registry fact, not a guess: a descriptor rendered once\n    // per row of a real list resolves to the first row by contract, and\n    // anything else that matches twice is an ambiguity the run must not paper\n    // over by picking one — unless the caller supplied an instance, handled above.\n    const registered = uiSimulationTarget(target.targetUid);\n    if (target.instance === undefined && matches.length > 1 && !registered?.repeated) {\n      throw new Error(\n        \`simulationInteractionTargetAmbiguous:\${targetLabel(target)} matched \${matches.length} elements\`,\n      );\n    }\n    return matches[0]!;\n  }`;
const newTargetBody = `  private target(target: SimulationTarget): Element {\n    const registered = assertTargetAddressing(target);\n    const selector = targetSelector(target);\n    const matches = this.documentNode().querySelectorAll(selector);\n    if (matches.length === 0) {\n      throw new Error(\n        target.instance !== undefined\n          ? \`simulationInteractionTargetInstanceMissing:\${targetLabel(target)} instance="\${target.instance}"\`\n          : \`simulationInteractionTargetMissing:\${targetLabel(target)}\`,\n      );\n    }\n    if (target.instance !== undefined && matches.length > 1) {\n      throw new Error(\n        \`simulationInteractionTargetInstanceAmbiguous:\${targetLabel(target)} instance="\${target.instance}" matched \${matches.length} elements\`,\n      );\n    }\n    if (target.instance === undefined && matches.length > 1 && target.selection !== "first") {\n      throw new Error(\n        \`simulationInteractionTargetAmbiguous:\${targetLabel(target)} matched \${matches.length} elements\`,\n      );\n    }\n    if (target.selection === "first" && !registered.repeated) {\n      throw new Error(\`simulationFirstSelectionRequiresRepeatedTarget:\${targetLabel(target)}\`);\n    }\n    return matches[0]!;\n  }`;
adapter = replaceOnce(adapter, oldTargetBody, newTargetBody, 'adapter target implementation');

adapter = replaceOnce(
  adapter,
  '  async waitForTarget(target: SimulationTarget, timeoutMs = TARGET_TIMEOUT_MS): Promise<void> {\n    const startedAt = Date.now();\n    const selector = targetSelector(target);',
  '  async waitForTarget(target: SimulationTarget, timeoutMs = TARGET_TIMEOUT_MS): Promise<void> {\n    assertTargetAddressing(target);\n    const startedAt = Date.now();\n    const selector = targetSelector(target);',
  'waitForTarget addressing',
);
adapter = replaceOnce(
  adapter,
  '  async hasTarget(target: SimulationTarget): Promise<boolean> {\n    try {\n      return Boolean(this.documentNode().querySelector(targetSelector(target)));',
  '  async hasTarget(target: SimulationTarget): Promise<boolean> {\n    assertTargetAddressing(target);\n    try {\n      return Boolean(this.documentNode().querySelector(targetSelector(target)));',
  'hasTarget addressing',
);
fs.writeFileSync(adapterPath, adapter);
console.log('Made repeated simulation selection explicit and removed silent first-match fallback.');
