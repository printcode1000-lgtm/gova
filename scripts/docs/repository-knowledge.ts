import { isBuiltin } from 'module';
import { posix } from 'path';

import { CAPABILITY_PACKAGES } from '@asol/architecture-core';

import type {
  DomainRegistry,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeNodeKind,
} from './model';
import {
  immediateDirectories,
  normalizePath,
  pathExists,
  readRepoJson,
  readRepoText,
  walkFiles,
} from './fs-scan';
import { extractMarkdownFacts, searchableTokens } from './markdown';
import { collectOperationalFacts } from './operational-facts';
import {
  ARTIFACT_DEFINITIONS,
  RUNTIME_DEFINITIONS,
  artifactIdsProducedByCommand,
  runtimeIdsForCommand,
  runtimeIdsForPath,
} from './runtime-knowledge';

const REPOSITORY_SOURCE_EXTENSIONS = /\.(?:ts|tsx|js|jsx|mjs|cjs|kt|kts|java|swift|m|mm|h|rb|gradle|xml|plist|entitlements|xcconfig|pbxproj|properties)$/i;
const JS_SOURCE_EXTENSIONS = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/i;
const TEST_FILE = /(?:^|\/)(?:tests?|__tests__)\/|\.(?:test|spec)\.[cm]?[jt]sx?$/;
const IMPORT_PATTERN = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
const PROCESS_ENV_PATTERN = /\bprocess\.env\.([A-Z][A-Z0-9_]*)\b|\bprocess\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g;
const COMMAND_ENV_PATTERN = /(?:^|\s)([A-Z][A-Z0-9_]*)=/g;
const NPM_RUN_PATTERN = /\bnpm\s+run\s+([A-Za-z0-9:_-]+)/g;
const COMMAND_SOURCE_PATTERN = /(?:^|\s)(?:npx\s+tsx|tsx|node)\s+["']?([A-Za-z0-9_@./-]+\.(?:ts|tsx|js|jsx|mjs|cjs))["']?/g;

type DependencyMap = Record<string, string>;

interface PackageManifest {
  name?: string;
  exports?: Record<string, unknown> | string;
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
}

interface RootManifest extends PackageManifest {
  scripts?: Record<string, string>;
}

function nodeId(kind: KnowledgeNodeKind, identity: string): string {
  return `${kind}:${normalizePath(identity)}`;
}

function addNode(map: Map<string, KnowledgeNode>, node: KnowledgeNode): void {
  const existing = map.get(node.id);
  if (!existing) {
    map.set(node.id, { ...node, tags: [...new Set(node.tags)].sort() });
    return;
  }
  existing.tags = [...new Set([...existing.tags, ...node.tags])].sort();
  if (!existing.summary && node.summary) existing.summary = node.summary;
}

function edgeKey(edge: KnowledgeEdge): string {
  return `${edge.from}\u0000${edge.kind}\u0000${edge.to}\u0000${edge.detail ?? ''}`;
}

function routePath(file: string): string {
  const parts = normalizePath(file)
    .replace(/^src\/app\//, '')
    .split('/')
    .slice(0, -1)
    .filter((part) => !/^\(.+\)$/.test(part) && !part.startsWith('@'));
  return `/${parts.join('/')}`.replace(/\/$/, '') || '/';
}

function extractImports(content: string): string[] {
  const imports = new Set<string>();
  for (const match of content.matchAll(IMPORT_PATTERN)) {
    const value = match[1] || match[2] || match[3];
    if (value) imports.add(value);
  }
  return [...imports].sort();
}

function extractEnvironmentKeys(content: string, pattern: RegExp): string[] {
  const keys = new Set<string>();
  pattern.lastIndex = 0;
  for (const match of content.matchAll(pattern)) {
    const value = match[1] || match[2];
    if (value) keys.add(value);
  }
  return [...keys].sort();
}

function dependencyEntries(manifest: PackageManifest): Array<{ name: string; range: string; field: string }> {
  const result: Array<{ name: string; range: string; field: string }> = [];
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) result.push({ name, range, field });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name) || a.field.localeCompare(b.field));
}

function externalDependencyName(specifier: string): string | undefined {
  if (!specifier || specifier.startsWith('.') || specifier.startsWith('@/') || specifier.startsWith('@asol/')) return undefined;
  if (specifier.startsWith('node:') || isBuiltin(specifier)) return undefined;
  const parts = specifier.split('/');
  const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  return name || undefined;
}

function candidateSourcePaths(base: string): string[] {
  const normalized = normalizePath(base).replace(/\/$/, '');
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  return [
    normalized,
    ...extensions.map((extension) => `${normalized}${extension}`),
    ...extensions.map((extension) => `${normalized}/index${extension}`),
  ];
}

function resolveSourceSpecifier(fromPath: string, specifier: string, knownPaths: Set<string>): string | undefined {
  if (specifier.startsWith('@/')) {
    const base = `src/${specifier.slice(2)}`;
    return candidateSourcePaths(base).find((candidate) => knownPaths.has(candidate));
  }
  if (specifier.startsWith('.')) {
    const base = posix.normalize(posix.join(posix.dirname(fromPath), specifier));
    return candidateSourcePaths(base).find((candidate) => knownPaths.has(candidate));
  }
  return undefined;
}

function ownerForPath(
  path: string,
  packages: KnowledgeNode[],
  features: KnowledgeNode[],
  services: KnowledgeNode[],
): KnowledgeNode | undefined {
  return [...packages, ...features, ...services]
    .filter((node) => node.path && (path === node.path || path.startsWith(`${node.path}/`)))
    .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))[0];
}

function documentTargetPath(docPath: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  return normalizePath(posix.normalize(posix.join(posix.dirname(docPath), target)));
}

function findNodeForMention(
  mention: string,
  nodes: KnowledgeNode[],
  packageByName: Map<string, KnowledgeNode>,
): KnowledgeNode | undefined {
  if (mention.startsWith('@asol/')) {
    const packageName = mention.split('/').slice(0, 2).join('/');
    return packageByName.get(packageName);
  }
  if (mention.startsWith('npm run ')) return nodes.find((node) => node.kind === 'command' && node.name === mention);
  if (/^[A-Z][A-Z0-9_]*$/.test(mention)) return nodes.find((node) => node.kind === 'environment-key' && node.name === mention);
  if (mention === 'out' || mention === 'out/') return nodes.find((node) => node.id === 'artifact:static-out');
  if (mention === '.next' || mention === '.next/') return nodes.find((node) => node.id === 'artifact:next-server-build');

  const exact = nodes.find((node) => node.name === mention || node.path === mention || node.id === mention);
  if (exact) return exact;

  const normalized = normalizePath(mention).replace(/\/$/, '');
  return nodes
    .filter(
      (node) =>
        node.path &&
        (node.path === normalized || node.path.startsWith(`${normalized}/`) || normalized.startsWith(`${node.path}/`)),
    )
    .sort(
      (a, b) =>
        Math.abs((a.path?.length ?? 0) - normalized.length) -
        Math.abs((b.path?.length ?? 0) - normalized.length),
    )[0];
}

function configurationPaths(): string[] {
  return [
    'package.json',
    '.env.example',
    'next.config.ts',
    'tsconfig.json',
    'eslint.config.js',
    'capacitor.config.ts',
    '.vercelignore',
    'android/gradle.properties',
    'android/app/build.gradle',
    'android/app/build.gradle.kts',
    'android/app/src/main/AndroidManifest.xml',
    'ios/App/App/Info.plist',
    'ios/App/App/App.entitlements',
  ].filter(pathExists);
}

export function buildRepositoryKnowledgeGraph(): KnowledgeGraph {
  const nodes = new Map<string, KnowledgeNode>();
  const edges = new Map<string, KnowledgeEdge>();
  const addEdge = (edge: KnowledgeEdge): void => {
    if (edge.from === edge.to) return;
    edges.set(edgeKey(edge), edge);
  };

  const runtimeById = new Map<string, KnowledgeNode>();
  for (const runtime of RUNTIME_DEFINITIONS) {
    const node: KnowledgeNode = {
      id: nodeId('runtime', runtime.id),
      kind: 'runtime',
      name: runtime.name,
      summary: runtime.summary,
      tags: searchableTokens(runtime.id, runtime.name, runtime.summary, ...runtime.tags),
    };
    addNode(nodes, node);
    runtimeById.set(runtime.id, node);
  }

  const artifactById = new Map<string, KnowledgeNode>();
  for (const artifact of ARTIFACT_DEFINITIONS) {
    const node: KnowledgeNode = {
      id: nodeId('artifact', artifact.id),
      kind: 'artifact',
      name: artifact.name,
      path: artifact.path,
      summary: artifact.summary,
      tags: searchableTokens(artifact.id, artifact.name, artifact.path, artifact.summary),
    };
    addNode(nodes, node);
    artifactById.set(artifact.id, node);
  }

  const externalDependencyByName = new Map<string, KnowledgeNode>();
  const ensureExternalDependency = (name: string, range?: string): KnowledgeNode => {
    const existing = externalDependencyByName.get(name);
    if (existing) {
      if (range) existing.tags = [...new Set([...existing.tags, range.toLowerCase()])].sort();
      return existing;
    }
    const node: KnowledgeNode = {
      id: nodeId('external-dependency', name),
      kind: 'external-dependency',
      name,
      summary: range ? `Declared dependency range observed: ${range}` : 'External package imported by repository source',
      tags: searchableTokens(name, range, 'external dependency npm package'),
    };
    addNode(nodes, node);
    externalDependencyByName.set(name, node);
    return node;
  };

  const capabilityByName = new Map(CAPABILITY_PACKAGES.map((item) => [item.name, item]));
  const packageNodes: KnowledgeNode[] = [];
  const packageByName = new Map<string, KnowledgeNode>();
  const packageManifestByPath = new Map<string, PackageManifest>();
  for (const packagePath of immediateDirectories('packages')) {
    const manifestPath = `${packagePath}/package.json`;
    if (!pathExists(manifestPath)) continue;
    const manifest = readRepoJson<PackageManifest>(manifestPath);
    packageManifestByPath.set(packagePath, manifest);
    const name = manifest.name || packagePath.split('/').at(-1) || packagePath;
    const exportsList = typeof manifest.exports === 'object' && manifest.exports ? Object.keys(manifest.exports) : [];
    const capability = capabilityByName.get(name);
    const summaryParts = [
      capability?.owns,
      capability ? `Layer: ${capability.layer}` : undefined,
      exportsList.length ? `Public exports: ${exportsList.sort().join(', ')}` : undefined,
    ].filter((value): value is string => Boolean(value));
    const node: KnowledgeNode = {
      id: nodeId('package', name),
      kind: 'package',
      name,
      path: packagePath,
      summary: summaryParts.join('; ') || undefined,
      tags: searchableTokens(
        name,
        packagePath,
        capability?.owns,
        capability?.layer,
        ...(capability?.vendorModules ?? []),
        ...exportsList,
      ),
    };
    addNode(nodes, node);
    packageNodes.push(node);
    packageByName.set(name, node);
  }

  for (const packageNode of packageNodes) {
    const manifest = packageNode.path ? packageManifestByPath.get(packageNode.path) : undefined;
    if (!manifest) continue;
    for (const dependency of dependencyEntries(manifest)) {
      const internal = packageByName.get(dependency.name);
      const target = internal ?? ensureExternalDependency(dependency.name, dependency.range);
      addEdge({
        from: packageNode.id,
        to: target.id,
        kind: 'declares-dependency',
        detail: `${dependency.field}:${dependency.range}`,
      });
    }
  }

  const featureNodes = immediateDirectories('src/features').map((featurePath) => {
    const name = featurePath.split('/').at(-1) || featurePath;
    const node: KnowledgeNode = {
      id: nodeId('feature', name),
      kind: 'feature',
      name,
      path: featurePath,
      tags: searchableTokens(name, featurePath),
    };
    addNode(nodes, node);
    return node;
  });

  const serviceNodes = immediateDirectories('services').map((servicePath) => {
    const name = servicePath.split('/').at(-1) || servicePath;
    const node: KnowledgeNode = {
      id: nodeId('service', name),
      kind: 'service',
      name,
      path: servicePath,
      tags: searchableTokens(name, servicePath),
    };
    addNode(nodes, node);
    return node;
  });

  const sourceRoots = ['src', 'packages', 'services', 'scripts', 'android', 'ios', 'fastlane'];
  const sourceFiles = sourceRoots
    .flatMap((root) => walkFiles(root, (path) => REPOSITORY_SOURCE_EXTENSIONS.test(path)))
    .filter((path, index, all) => all.indexOf(path) === index)
    .sort();
  const knownCodePaths = new Set(sourceFiles.filter((path) => JS_SOURCE_EXTENSIONS.test(path)));
  const sourceNodeByPath = new Map<string, KnowledgeNode>();
  const ownerBySourcePath = new Map<string, KnowledgeNode>();
  const sourceContentByPath = new Map<string, string>();

  for (const path of sourceFiles) {
    const content = readRepoText(path);
    sourceContentByPath.set(path, content);
    const isTest = TEST_FILE.test(path);
    const kind: KnowledgeNodeKind = isTest ? 'test' : path.startsWith('scripts/') ? 'script' : 'source';
    const node: KnowledgeNode = {
      id: nodeId(kind, path),
      kind,
      name: path.split('/').at(-1) || path,
      path,
      tags: searchableTokens(path),
    };
    addNode(nodes, node);
    sourceNodeByPath.set(path, node);
    const owner = ownerForPath(path, packageNodes, featureNodes, serviceNodes);
    if (owner) {
      ownerBySourcePath.set(path, owner);
      addEdge({ from: node.id, to: owner.id, kind: 'belongs-to' });
      if (isTest) addEdge({ from: node.id, to: owner.id, kind: 'tests' });
    }
    for (const runtimeId of runtimeIdsForPath(path, content)) {
      const runtime = runtimeById.get(runtimeId);
      if (runtime) addEdge({ from: node.id, to: runtime.id, kind: 'affects-runtime' });
    }
  }

  const routeFiles = sourceFiles.filter(
    (path) => /^src\/app\/.+\/(?:page|route)\.[cm]?[jt]sx?$/.test(path) || /^src\/app\/(?:page|route)\.[cm]?[jt]sx?$/.test(path),
  );
  const routeNodeByPath = new Map<string, KnowledgeNode>();
  for (const path of routeFiles) {
    const route = routePath(path);
    const handler = /\/route\.[cm]?[jt]sx?$/.test(path) || /^src\/app\/route\.[cm]?[jt]sx?$/.test(path);
    const routeNode: KnowledgeNode = {
      id: nodeId('route', `${route}:${handler ? 'handler' : 'page'}`),
      kind: 'route',
      name: route,
      path,
      summary: handler ? 'App Router request handler' : 'App Router page',
      tags: searchableTokens(route, path, handler ? 'handler api' : 'page'),
    };
    addNode(nodes, routeNode);
    routeNodeByPath.set(path, routeNode);
    const source = sourceNodeByPath.get(path);
    if (source) addEdge({ from: routeNode.id, to: source.id, kind: 'contains' });
    for (const runtimeId of runtimeIdsForPath(path, sourceContentByPath.get(path) ?? '')) {
      const runtime = runtimeById.get(runtimeId);
      if (runtime) addEdge({ from: routeNode.id, to: runtime.id, kind: 'affects-runtime' });
    }
  }

  for (const path of sourceFiles) {
    if (!JS_SOURCE_EXTENSIONS.test(path)) continue;
    const from = sourceNodeByPath.get(path);
    if (!from) continue;
    const fromOwner = ownerBySourcePath.get(path);
    for (const specifier of extractImports(sourceContentByPath.get(path) ?? '')) {
      if (specifier.startsWith('@asol/')) {
        const packageName = specifier.split('/').slice(0, 2).join('/');
        const target = packageByName.get(packageName);
        if (!target) continue;
        addEdge({ from: from.id, to: target.id, kind: 'imports', detail: specifier });
        if (fromOwner && fromOwner.id !== target.id) addEdge({ from: fromOwner.id, to: target.id, kind: 'imports' });
        if (from.kind === 'test') addEdge({ from: from.id, to: target.id, kind: 'tests' });
        continue;
      }

      const resolved = resolveSourceSpecifier(path, specifier, knownCodePaths);
      const target = resolved ? sourceNodeByPath.get(resolved) : undefined;
      if (target) {
        addEdge({ from: from.id, to: target.id, kind: 'imports', detail: specifier });
        const targetOwner = resolved ? ownerBySourcePath.get(resolved) : undefined;
        if (fromOwner && targetOwner && fromOwner.id !== targetOwner.id) addEdge({ from: fromOwner.id, to: targetOwner.id, kind: 'imports' });
        if (from.kind === 'test') addEdge({ from: from.id, to: targetOwner?.id ?? target.id, kind: 'tests' });
        continue;
      }

      const dependencyName = externalDependencyName(specifier);
      if (!dependencyName) continue;
      const dependency = ensureExternalDependency(dependencyName);
      addEdge({ from: from.id, to: dependency.id, kind: 'imports', detail: specifier });
      if (fromOwner) addEdge({ from: fromOwner.id, to: dependency.id, kind: 'imports' });
      if (from.kind === 'test') addEdge({ from: from.id, to: dependency.id, kind: 'tests' });
    }
  }

  const writeGatewayNames = new Set(['@asol/page-save-core', '@asol/data-core', '@asol/storage-core']);
  for (const [path, routeNode] of routeNodeByPath) {
    const source = sourceNodeByPath.get(path);
    if (!source) continue;
    const importedOwnerIds = new Set<string>();
    const writeGatewayIds = new Set<string>();
    const frontier = [source.id];
    const visited = new Set<string>(frontier);
    for (let depth = 0; depth < 4 && frontier.length; depth += 1) {
      const current = frontier.splice(0, frontier.length);
      for (const fromId of current) {
        for (const edge of edges.values()) {
          if (edge.from !== fromId || edge.kind !== 'imports') continue;
          const direct = nodes.get(edge.to);
          if (!direct) continue;
          if (['package', 'feature', 'service'].includes(direct.kind)) importedOwnerIds.add(direct.id);
          if (direct.path) {
            const owner = ownerBySourcePath.get(direct.path);
            if (owner) importedOwnerIds.add(owner.id);
          }
          if (writeGatewayNames.has(direct.name) || [...writeGatewayNames].some((name) => edge.detail?.startsWith(name))) {
            writeGatewayIds.add(direct.id);
          }
          if (!visited.has(direct.id) && depth < 3) {
            visited.add(direct.id);
            frontier.push(direct.id);
          }
        }
      }
    }
    for (const ownerId of importedOwnerIds) addEdge({ from: routeNode.id, to: ownerId, kind: 'related-to', detail: 'route source dependency' });
    for (const gatewayId of writeGatewayIds) {
      addEdge({ from: routeNode.id, to: gatewayId, kind: 'related-to', detail: 'route write gateway' });
    }
  }

  const configNodeByPath = new Map<string, KnowledgeNode>();
  for (const path of configurationPaths()) {
    const node: KnowledgeNode = {
      id: nodeId('config', path),
      kind: 'config',
      name: path,
      path,
      tags: searchableTokens(path),
    };
    addNode(nodes, node);
    configNodeByPath.set(path, node);
  }

  const rootManifest = readRepoJson<RootManifest>('package.json');
  const rootManifestNode = configNodeByPath.get('package.json');
  if (rootManifestNode) {
    for (const dependency of dependencyEntries(rootManifest)) {
      const internal = packageByName.get(dependency.name);
      const target = internal ?? ensureExternalDependency(dependency.name, dependency.range);
      addEdge({
        from: rootManifestNode.id,
        to: target.id,
        kind: 'declares-dependency',
        detail: `${dependency.field}:${dependency.range}`,
      });
    }
  }

  const environmentNodeByName = new Map<string, KnowledgeNode>();
  const ensureEnvironmentNode = (key: string): KnowledgeNode => {
    const existing = environmentNodeByName.get(key);
    if (existing) return existing;
    const node: KnowledgeNode = {
      id: nodeId('environment-key', key),
      kind: 'environment-key',
      name: key,
      summary: key.startsWith('NEXT_PUBLIC_') ? 'Client-visible environment key name' : 'Server/tooling environment key name',
      tags: searchableTokens(key, key.startsWith('NEXT_PUBLIC_') ? 'public client environment' : 'server tooling environment'),
    };
    addNode(nodes, node);
    environmentNodeByName.set(key, node);
    return node;
  };

  const operationalFacts = collectOperationalFacts();
  const envConfig = configNodeByPath.get('.env.example');
  for (const key of operationalFacts.environmentKeys) {
    const environment = ensureEnvironmentNode(key);
    if (envConfig) addEdge({ from: envConfig.id, to: environment.id, kind: 'contains' });
  }
  for (const [path, source] of sourceNodeByPath) {
    for (const key of extractEnvironmentKeys(sourceContentByPath.get(path) ?? '', PROCESS_ENV_PATTERN)) {
      const environment = ensureEnvironmentNode(key);
      addEdge({ from: source.id, to: environment.id, kind: 'uses-environment' });
    }
  }

  const commandByName = new Map<string, KnowledgeNode>();
  for (const [name] of Object.entries(rootManifest.scripts ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const node: KnowledgeNode = {
      id: nodeId('command', name),
      kind: 'command',
      name: `npm run ${name}`,
      summary: 'Root package script; implementation is available in package.json and generated operational text redacts environment assignment values.',
      tags: searchableTokens(name, `npm run ${name}`),
    };
    addNode(nodes, node);
    commandByName.set(name, node);
  }

  for (const [name, command] of Object.entries(rootManifest.scripts ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const from = commandByName.get(name);
    if (!from) continue;

    NPM_RUN_PATTERN.lastIndex = 0;
    for (const match of command.matchAll(NPM_RUN_PATTERN)) {
      const target = commandByName.get(match[1]);
      if (target) addEdge({ from: from.id, to: target.id, kind: 'invokes' });
    }

    COMMAND_SOURCE_PATTERN.lastIndex = 0;
    for (const match of command.matchAll(COMMAND_SOURCE_PATTERN)) {
      const sourcePath = normalizePath(match[1].replace(/^\.\//, ''));
      const target = sourceNodeByPath.get(sourcePath);
      if (target) addEdge({ from: from.id, to: target.id, kind: 'invokes' });
    }

    for (const key of extractEnvironmentKeys(command, COMMAND_ENV_PATTERN)) {
      const environment = ensureEnvironmentNode(key);
      addEdge({ from: from.id, to: environment.id, kind: 'uses-environment' });
    }
    for (const runtimeId of runtimeIdsForCommand(name)) {
      const runtime = runtimeById.get(runtimeId);
      if (runtime) addEdge({ from: from.id, to: runtime.id, kind: 'targets-runtime' });
    }
    for (const artifactId of artifactIdsProducedByCommand(name)) {
      const artifact = artifactById.get(artifactId);
      if (artifact) addEdge({ from: from.id, to: artifact.id, kind: 'produces' });
    }
  }

  for (const definition of RUNTIME_DEFINITIONS) {
    const runtime = runtimeById.get(definition.id);
    if (!runtime) continue;
    for (const configPath of definition.configPaths) {
      const config = configNodeByPath.get(configPath);
      if (config) addEdge({ from: runtime.id, to: config.id, kind: 'configured-by' });
    }
    for (const commandName of definition.commandNames) {
      const command = commandByName.get(commandName);
      if (command) addEdge({ from: command.id, to: runtime.id, kind: 'targets-runtime' });
    }
  }
  for (const artifactDefinition of ARTIFACT_DEFINITIONS) {
    const artifact = artifactById.get(artifactDefinition.id);
    if (!artifact) continue;
    for (const runtimeId of artifactDefinition.runtimeConsumers) {
      const runtime = runtimeById.get(runtimeId);
      if (runtime) addEdge({ from: runtime.id, to: artifact.id, kind: 'consumes' });
    }
  }

  const documentFiles = walkFiles('docs', (path) => path.endsWith('.md'));
  const documentNodeByPath = new Map<string, KnowledgeNode>();
  const documentFacts = new Map<string, ReturnType<typeof extractMarkdownFacts>>();
  for (const path of documentFiles) {
    const facts = extractMarkdownFacts(readRepoText(path), path.split('/').at(-1) || path);
    const node: KnowledgeNode = {
      id: nodeId('document', path),
      kind: 'document',
      name: facts.title,
      path,
      summary: facts.summary || undefined,
      tags: searchableTokens(path, facts.title, facts.summary, ...facts.mentions),
    };
    addNode(nodes, node);
    documentNodeByPath.set(path, node);
    documentFacts.set(path, facts);
  }

  const registryPath = 'docs/09-agent-knowledge/domain-registry.json';
  if (pathExists(registryPath)) {
    const registry = readRepoJson<DomainRegistry>(registryPath);
    for (const domain of registry.domains) {
      const domainNode: KnowledgeNode = {
        id: nodeId('domain', domain.id),
        kind: 'domain',
        name: domain.id,
        path: domain.docsPrefix,
        summary: `Documentation domain for ${domain.docsPrefix}`,
        tags: searchableTokens(domain.id, domain.docsPrefix, ...domain.sourcePrefixes),
      };
      addNode(nodes, domainNode);

      for (const document of documentNodeByPath.values()) {
        if (document.path?.startsWith(domain.docsPrefix)) addEdge({ from: document.id, to: domainNode.id, kind: 'belongs-to' });
      }
      for (const readFirst of domain.readFirst) {
        const document = documentNodeByPath.get(readFirst);
        if (document) addEdge({ from: domainNode.id, to: document.id, kind: 'contains', detail: 'read-first' });
      }
      for (const sourcePrefix of domain.sourcePrefixes) {
        for (const target of nodes.values()) {
          if (!target.path || target.kind === 'document' || target.kind === 'domain') continue;
          const matches = target.path === sourcePrefix || target.path.startsWith(sourcePrefix.endsWith('/') ? sourcePrefix : `${sourcePrefix}/`);
          if (matches) addEdge({ from: domainNode.id, to: target.id, kind: 'documents', detail: sourcePrefix });
        }
      }
    }
  }

  const allNodes = () => [...nodes.values()];
  for (const [path, docNode] of documentNodeByPath) {
    const facts = documentFacts.get(path);
    if (!facts) continue;
    for (const link of facts.links) {
      const targetPath = documentTargetPath(path, link);
      const targetDoc = documentNodeByPath.get(targetPath) || documentNodeByPath.get(`${targetPath}/README.md`);
      if (targetDoc) addEdge({ from: docNode.id, to: targetDoc.id, kind: 'references', detail: link });
    }
    for (const mention of facts.mentions) {
      const target = findNodeForMention(mention, allNodes(), packageByName);
      if (target) addEdge({ from: docNode.id, to: target.id, kind: 'references', detail: mention });
    }
  }

  const runtimeContract = documentNodeByPath.get('docs/09-agent-knowledge/runtime-contract.md');
  if (runtimeContract) {
    for (const runtime of runtimeById.values()) addEdge({ from: runtimeContract.id, to: runtime.id, kind: 'documents', detail: 'project runtime contract' });
    for (const artifact of artifactById.values()) addEdge({ from: runtimeContract.id, to: artifact.id, kind: 'documents', detail: 'runtime artifact topology' });
  }

  return {
    version: 2,
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => edgeKey(a).localeCompare(edgeKey(b))),
  };
}
