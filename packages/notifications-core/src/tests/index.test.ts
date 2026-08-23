import { readFileSync, readdirSync } from 'fs';
import path from 'path';

/**
 * Contract tests for `@asol/notifications-core`.
 *
 * The package holds the notification **delivery core**: the domain vocabulary and the
 * push fan-out — FCM, APNs, Web Push — plus the grant protocol. It is the code the
 * `asol-notifications` Vercel account runs, and the only notification path that
 * deployment may reach.
 *
 * What is deliberately **not** here: the UI, hooks, preferences, badges, the native
 * inbox, and analytics. Those stayed in `src/features/notifications` because they reach
 * the theme, i18n, preferences and component layers — 50 edges into the application. A
 * package that dragged all of that in would satisfy rule 7 on paper and break it in fact.
 *
 * Also deliberately not here: **Android channel creation**. `@asol/native-core` owns
 * every Capacitor surface, including `ensureNotificationChannels` and the channel
 * constants. Rule 9 — upgrading a Capacitor plugin must touch one package.
 */

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const PACKAGE_SRC = path.join(process.cwd(), 'packages/notifications-core/src');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'tests') out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Every `@/` module this package may import. Designated layers only. Shrink, never grow. */
const DECLARED_APP_EDGES = new Set<string>([
  // Empty: server env is registered via `src/ports/server-config.ts`.
]);

/**
 * Sealed packages this one may reach, and the door it must use. The notification token reads
 * used to be three `@/modules/data-access/...` app edges; they now go through one declared door
 * on `@asol/data-core`, which is a layer-1 → layer-1 edge rather than knowledge of the app.
 * A deep path here would resolve nothing — the seal has no wildcard — but pinning the door
 * keeps a second one from appearing unnoticed.
 */
const DECLARED_PACKAGE_DOORS = new Set([
  // Resource names and the notification accent are one branding contract,
  // shared with native and Web Push instead of repeated in each transport.
  '@asol/branding-core',
  '@asol/data-core/notifications',
  '@asol/native-core',
  // Signing, not policy: the grant's envelope, constant-time comparison and rejection order are
  // held once in @asol/signed-token-core. What a grant authorises stays in this package.
  '@asol/signed-token-core',
]);

async function main(): Promise<void> {
  console.log('🧪 Running @asol/notifications-core tests...\n');
  const files = sourceFiles(PACKAGE_SRC);
  assert(files.length > 15, `expected the delivery core, found ${files.length} files`);

  // ── The browser door must not reach a provider, a credential, or node ──────
  //
  // A single door would bundle google-auth-library, node:http2 and the provider SDKs into
  // the client. The split exists for the same reason ota-core and storage-core split.
  const browserGraph = new Set<string>();
  const queue = [path.join(PACKAGE_SRC, 'index.ts')];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (browserGraph.has(file)) continue;
    browserGraph.add(file);
    let content: string;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const match of content.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)) {
      const base = path.resolve(path.dirname(file), match[1]);
      for (const candidate of [base, `${base}.ts`, path.join(base, 'index.ts')]) {
        try {
          readFileSync(candidate, 'utf8');
          queue.push(candidate);
          break;
        } catch {
          /* keep looking */
        }
      }
    }
  }
  for (const file of browserGraph) {
    const name = path.basename(file);
    assert(
      !name.endsWith('.server.ts'),
      `browser door reaches a server module: ${name}. It belongs behind ./server.`,
    );
    const content = readFileSync(file, 'utf8');
    for (const banned of ['node:', 'google-auth-library', 'web-push', '@aws-sdk']) {
      assert(
        !content.includes(`from '${banned}`) && !content.includes(`from "${banned}`),
        `browser door reaches "${banned}" through ${name}`,
      );
    }
  }
  console.log(`  ✔ Browser door clean across ${browserGraph.size} reachable files.`);

  // ── App edges are pinned to designated layers ─────────────────────────────
  const found = new Set<string>();
  for (const file of files) {
    for (const match of readFileSync(file, 'utf8').matchAll(/\bfrom\s+['"](@\/[^'"]+)['"]/g)) {
      found.add(match[1]);
      assert(
        DECLARED_APP_EDGES.has(match[1]),
        `${path.basename(file)} imports "${match[1]}", which is not a declared app edge. ` +
          `Rule 7 runs both ways: this package must not grow new knowledge of the application.`,
      );
    }
  }
  const stale = [...DECLARED_APP_EDGES].filter((edge) => !found.has(edge));
  assert(
    stale.length === 0,
    `declared edges no longer imported: ${stale.join(', ')}. A budget with unspent room ` +
      'silently allows the coupling back.',
  );

  const packageDoors = new Set<string>();
  for (const file of files) {
    for (const match of readFileSync(file, 'utf8').matchAll(/\bfrom\s+['"](@asol\/[^'"]+)['"]/g)) {
      if (match[1].startsWith('@asol/notifications-core')) continue;
      packageDoors.add(match[1]);
      assert(
        DECLARED_PACKAGE_DOORS.has(match[1]),
        `${path.basename(file)} imports "${match[1]}", which is not a declared package door.`,
      );
    }
  }
  console.log(
    `  ✔ App edges pinned at ${found.size}, package doors at ${packageDoors.size}, all designated layers.`,
  );

  // ── Channel creation stays in native-core ─────────────────────────────────
  for (const file of files) {
    // Comments are stripped first: this package's own doc blocks explain why channel
    // creation lives in native-core, and a naive scan flagged that explanation as the
    // violation. The same trap caught the account-declarations purity test.
    const content = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    assert(
      !content.includes('@capacitor/'),
      `${path.basename(file)} imports Capacitor directly. Native surfaces belong to ` +
        '@asol/native-core — rule 9 keeps a plugin upgrade inside one package.',
    );
    assert(
      !/\bensureNotificationChannels\b|\bcreateChannel\b/.test(content),
      `${path.basename(file)} creates notification channels. That is native-core's job.`,
    );
  }
  console.log('  ✔ No Capacitor import and no channel creation: both belong to native-core.');

  // ── Both doors are declared and point at real modules ─────────────────────
  //
  // Checked by reading, not by importing. The server door reaches provider code that
  // wants VAPID keys and a service account at module load; importing it here would make
  // the contract test require production credentials to run, which is how a test ends up
  // skipped in CI.
  const manifest = JSON.parse(
    readFileSync(path.join(process.cwd(), 'packages/notifications-core/package.json'), 'utf8'),
  ) as { exports: Record<string, { default: string }> };
  /**
   * Four doors, each with a reason it cannot be merged into another.
   *
   * Rule 2 asks for a small, fixed set — not for one. Every door here exists because
   * merging it into `.` caused a concrete failure:
   *
   * | Door | Why it is separate |
   * | :-- | :-- |
   * | `.` | Domain vocabulary. Browser-safe, and the app's own barrel re-exports it wholesale, so it must carry no implementation object. |
   * | `./builder` | `NotificationBuilder` and the template loader. Both halves construct notifications, but putting them on `.` leaked an implementation object into the app barrel and its boundary test failed. |
   * | `./server` | Delivery and the grant protocol. Pulls `google-auth-library`, `node:http2` and the provider SDKs. |
   * | `./providers` | APNs and Web Push. They read credentials **at module load** — importing web-push calls `setVapidDetails` — so re-exporting them from `./server` made that door unopenable without a valid VAPID pair. |
   */
  const EXPECTED_DOORS = ['.', './server', './builder', './providers'];
  const doors = Object.keys(manifest.exports);
  assert(
    doors.length === EXPECTED_DOORS.length && EXPECTED_DOORS.every((d) => doors.includes(d)),
    `expected exactly ${EXPECTED_DOORS.join(', ')} — found ${doors.join(', ')}. ` +
      'Adding a door is a deliberate change to this list, not a side effect.',
  );
  assert(!doors.includes('./*'), 'a wildcard door defeats the exports seal');

  for (const [door, entry] of Object.entries(manifest.exports)) {
    const target = path.join(process.cwd(), 'packages/notifications-core', entry.default);
    const content = readFileSync(target, 'utf8');
    assert(
      /export\s/.test(content),
      `door "${door}" points at ${entry.default}, which exports nothing`,
    );
  }

  const serverDoor = readFileSync(path.join(PACKAGE_SRC, 'server.ts'), 'utf8');
  assert(
    serverDoor.includes("import 'server-only'"),
    'the server door must import server-only so a client component importing it fails the build',
  );
  console.log(`  ✔ Two doors declared, both real, server door guarded by server-only.`);

  console.log('\n✅ All @asol/notifications-core tests passed!\n');
}

main().catch((error) => {
  console.error('❌ @asol/notifications-core tests failed:', error);
  process.exit(1);
});
