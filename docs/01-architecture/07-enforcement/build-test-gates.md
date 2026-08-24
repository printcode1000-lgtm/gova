# Generated Build/Test Gates

`package.json` is not the owner of Build/Test orchestration. It exposes only compact doors for `build`, `build:static`, and `test`.

The permanent policy lives in `scripts/generated-gates.ts`. The runner resolves selectors against the current `package.json` scripts at execution time:

- every `test:*` script is added to the `test` gate automatically, except the six composition leaf scripts because `test:compositions` owns them as one aggregate gate;
- every `test:*-core` script is added automatically to both build gates;
- fixed lifecycle operations such as branding, architecture checks, service mirror synchronization, database checks, and the final Next/static build remain explicit because order is part of their contract.

`scripts/generated-gate-contract.ts` is fail-closed. It rejects hand-written `build`, `build:static`, or `test` chains in `package.json`, rejects a separate `pretest` owner, rejects recursion, and verifies automatic test/core coverage. `architecture:check` runs the same contract as a preflight.

Adding a new ordinary `test:*` or `test:*-core` script therefore changes the generated gates automatically without editing a giant orchestration string or maintaining a second compatibility layer.
