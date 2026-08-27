import { spawnSync } from 'node:child_process';
import { withoutVsCodeDebuggerEnv } from './child-process-env';

const RETRAINING_PROMPT = `You are performing a **Project Intelligence Retraining Cycle**.

This is not model fine-tuning. It is a deep re-analysis, criticism, correction, consolidation, and improvement of the persistent project knowledge.

Do not modify production application code during this operation unless explicitly required for maintaining the Project Intelligence infrastructure itself.

## Phase 1 — Load current intelligence
Read:
- .agents/skills/project-intelligence/SKILL.md
- .agents/skills/project-intelligence/knowledge/INDEX.md
Then read all relevant knowledge files under:
- .agents/skills/project-intelligence/knowledge/

Understand what the Project Intelligence system currently believes about the repository.
Do NOT assume that existing knowledge is correct. Treat it as a hypothesis that must be validated.

## Phase 2 — Inspect the current repository
Analyze the current repository state:
- architecture, applications, packages, modules, services
- scripts, configuration, tests, CI/CD
- database/storage architecture, APIs, runtime boundaries
- deployment topology, dependency relationships
- project documentation, architectural rules, important execution flows

Use Git history, current changes, dependency relationships, and repository structure when useful. Do not blindly rescan irrelevant generated files or outputs.

## Phase 3 — Criticize existing knowledge
Perform an adversarial review of the current persistent knowledge. For every important existing belief, ask:
- Is this still true?
- What repository evidence proves it?
- Has the implementation changed?
- Is this description incomplete or oversimplified?
- Does another file contradict it?
- Is an architectural relationship missing?
- Is this merely an old assumption?
- Could this knowledge mislead a future agent?

Actively search for weaknesses in the existing Project Intelligence knowledge instead of merely confirming it.

## Phase 4 — Discover new knowledge
Identify durable information that is currently missing, especially:
- undocumented architectural boundaries
- hidden dependency relationships
- important runtime flows
- cross-package interactions
- ownership boundaries
- architectural invariants
- storage/write/read paths
- deployment relationships
- important scripts
- testing/guard mechanisms
- project-specific conventions
- fragile architectural areas
- technical debt
- unresolved inconsistencies

Prefer knowledge that will materially improve future agent reasoning.

## Phase 5 — Compare knowledge with reality
Classify findings into:
- Confirmed: Existing knowledge that remains correct.
- Corrected: Existing knowledge that was inaccurate or outdated.
- Expanded: Existing knowledge that was correct but incomplete.
- New: Important knowledge not previously recorded.
- Removed: Knowledge that no longer reflects the repository.
- Unresolved: Important questions for which repository evidence is insufficient or contradictory.

## Phase 6 — Improve the knowledge base
Update the files under .agents/skills/project-intelligence/knowledge/:
- INDEX.md
- architecture.md
- packages.md
- dependencies.md
- runtime-flows.md
- data-flows.md
- conventions.md
- decisions.md
- risks.md
- unresolved.md

Refactor the knowledge itself when necessary (merge duplicates, remove obsolete info, improve organization and precision).

## Phase 7 — Evaluate the intelligence system itself
Critically evaluate .agents/skills/project-intelligence/SKILL.md.
If the intelligence workflow itself can be improved, update SKILL.md.

## Phase 8 — Validate
Validate important architectural conclusions against the repository.
Run safe architectural checks synchronously with sufficient wait time:
- npm run architecture:check

Do not run deployment, release, OTA, or destructive database operations.

## Phase 9 — Consolidate
1. Remove stale knowledge and duplication.
2. Resolve contradictions where repository evidence allows.
3. Record unresolved contradictions explicitly in unresolved.md.
4. Ensure INDEX.md accurately represents the current project and provides clear navigation.

The final knowledge base must prioritize:
accuracy > depth > usefulness > compactness > quantity

## Final output
Return a concise retraining report containing:
- knowledge confirmed
- knowledge corrected
- knowledge expanded
- new discoveries
- obsolete knowledge removed
- unresolved issues
- intelligence-system improvements
- validation results
`;

export function runIntelligenceRetrain(): void {
  const args = ['--dangerously-skip-permissions', '-p', RETRAINING_PROMPT];

  // Forward any additional command-line arguments passed to the script
  const userArgs = process.argv.slice(2);
  if (userArgs.length > 0) {
    args.push(...userArgs);
  }

  const env = withoutVsCodeDebuggerEnv(process.env);

  const result = spawnSync('agy', args, {
    stdio: 'inherit',
    env,
  });

  if (result.error) {
    console.error('Failed to execute agy CLI:', result.error);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

if (require.main === module) {
  runIntelligenceRetrain();
}
