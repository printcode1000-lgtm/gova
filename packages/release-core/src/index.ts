/**
 * @asol/release-core — the shape of a release run.
 *
 * `deploy:all` pushes straight to `main` and is the only supported release path, which makes its
 * ordering, its resume state and the way it runs a child npm script the most consequential code
 * in the repository. It lived in `scripts/lib/`, outside every package gate, next to a
 * `vercel-deployment-monitor.ts` that only re-exported `@asol/vercel-deploy-core` — a second name
 * for a door that already existed.
 *
 * What stays in `scripts/` is the CLI: which phase the developer asked for, and what to print.
 * What lives here is what must not be re-derived — the phase order, what a phase depends on, how
 * a resumable run remembers where it stopped, and how a child process's output is streamed and
 * its Vercel deployment awaited.
 */
export * from './pipeline/phases';
export * from './pipeline/state';
export * from './pipeline/run-deployment-npm-script';
export * from './pipeline/push-main-branch';
