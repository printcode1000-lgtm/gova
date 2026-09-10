# Gova Vercel Minimal Upload Contract

## Purpose

Production Gova releases must upload only the files required to install dependencies, build the hosted frontend, and serve its runtime public assets. The full repository is not a valid Gova upload input.

The canonical implementation is `@asol/gova-deployment-core`, specifically `buildGovaDeploymentTree`. `main:deploy` must deploy the generated `.tmp-gova-build` tree, never the repository root.

## Measured baseline

The 2026-09-10 sandbox investigation measured the former repository-copy approach after the old `.vercelignore` at **141.56 MiB and about 3,790 files**. `.tools` alone contributed **120.60 MiB**.

The proven minimal-tree implementation produces **13.36 MiB and 2,243 upload files** on the same project state. This is about a **90.6% file-size reduction** before Vercel content deduplication.

The build output and Vercel build cache are not upload bytes. They are created on the build machine after the source upload.

## Proof performed

A clean copy of the generated upload tree was created in `/home/hesham/gova-sandboxes/vercel-gova/final-minimal-proof` with no pre-existing `node_modules` or `.next`.

`npm ci` completed successfully from that tree. `npm run build:vercel` then completed successfully with the hosted release inputs. The result contained 45 measured routes, no Business API or development API functions, and every measured function remained below Vercel's 250 MB function limit.
## Programmatic pruning rules

The tree builder first removes local-only and non-hosted roots such as `.tools`, `.backups`, `.agents`, `.claude`, `.secret-archive`, editor/agent metadata, native shells, release tooling, docs, service mirrors, local build output, machine environment files, and other roots proven unnecessary for hosted Gova.

It then removes all Business API trees and copies back only `/api/health`, applies the established Gova source overrides, and creates temporary workspace links inside the upload tree.

Those temporary links are important. They force TypeScript module resolution to use package exports from the isolated upload tree instead of accidentally walking upward into the developer checkout's `node_modules`.

The builder creates a TypeScript program whose roots are the surviving Next App Router modules, Gova special root entrypoints (`proxy`, middleware/instrumentation when present), `next.config.ts`, and the six hosted-build scripts. TypeScript's resolver determines the transitive local dependency graph, including type-only and package-export resolution.

Code under `src`, `packages`, and `scripts` that is outside this graph is deleted from the upload tree. Packages with no reachable source are removed as complete workspaces. `scripts` is additionally restricted to the six files used by `build:vercel`.

Package-local Android/iOS trees, package tooling scripts, test trees, README files, package tsconfigs, branding-generation assets, data-core migrations, and other proven non-hosted artifacts are removed from the generated view. The original repository is never pruned or rewritten.
## Files deliberately retained

`public/` is retained as a complete runtime contract. Many public assets are selected dynamically and therefore cannot be proven reachable by a TypeScript import graph. This includes category, pharmacy and vehicle catalog data/images, product-style JSON, MapLibre worker files, application bootstrap scripts, web-push assets, icons, and `asol-web-manifest.json`.

Root build inputs such as `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, and the generated upload `vercel.json` are retained. Reachable workspace `package.json` files are retained so `npm ci` and package exports behave exactly as they do on Vercel.

The generated `.vercelignore` is a second line of defense. It repeats local-only/test/native/tooling exclusions even though the tree builder normally removes those paths physically. This prevents accidental upload growth if copy behavior changes later.

The repository-root `.vercelignore` contains only exclusions that are safe for every repository-root Vercel target. Gova-specific exclusions belong to the generated Gova upload view so submain and sub2main cannot lose files they may require.

## Upload budget

The generated Gova tree is fail-closed above **16 MiB** or **2,400 files**. The tested baseline is 13.36 MiB and 2,243 files, leaving controlled headroom for legitimate growth while catching large local files or newly unreachable subsystems.

A budget failure is not fixed by raising the constants immediately. First reproduce the larger tree in the local Gova Vercel sandbox, run a clean `npm ci`, run `npm run build:vercel`, verify the route/artifact guards, explain the legitimate added inputs, and only then adjust the budget in the same reviewed change.
## Investigation notes and rejected shortcuts

Several smaller-looking approaches were intentionally rejected during the sandbox work. Deleting only part of branding tooling broke TypeScript imports, so the production rule removes a coherent unreachable dependency set instead of arbitrary files.

A first dependency scanner missed TypeScript `import("module").Type` references. That experiment was rejected after typecheck failed. The production implementation uses the TypeScript compiler resolver instead of the incomplete scanner.

A later directory-only pruning experiment removed implementation folders while leaving parent `server.ts` barrel files. Typecheck correctly failed on dangling exports. Directory-only pruning is therefore not the production policy.

The first compiler-based prototype also resolved a workspace package from the developer checkout above `.tmp-gova-build`. A clean `npm ci` sandbox exposed the missing `@asol/env-core/process` file. The final implementation creates temporary workspace links before graph construction, then removes and recreates those links after pruning so resolution is isolated to the upload tree.

These failures are part of the proof: no failed or partially verified exclusion was promoted to the production rules.

## Required maintenance workflow

Use `npm run test:gova-deployment-core`, `npm run typecheck`, and `npm run gova:tree` when changing the tree builder. For changes that affect pruning, workspace exports, build scripts, public assets, or the upload budget, also repeat the clean sandbox `npm ci` plus `npm run build:vercel` proof before production deployment.

Do not replace this mechanism with a repository-wide allowlist assembled by hand. The dependency graph is intentionally recomputed from the current code so a newly imported local module becomes part of the Gova upload automatically.