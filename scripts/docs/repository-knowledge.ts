import { dirname, posix } from 'path';

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

const SOURCE_EXTENSIONS = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/;
const TEST_FILE = /(?:^|\/)(?:tests?|__tests__)\/|\.(?:test|spec)\.[cm]?[jt]sx?$/;
const IMPORT_PATTERN = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

interface PackageManifest {
  name?: string;
  exports?: Record<string, unknown> | string;
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
  const candidates = [...packages, ...features, ...services]
    .filter((node) => node.path && (path === node.path || path.startsWith(`${node.path}/`)))
    .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0));
  return candidates[0];
}

function documentTargetPath(docPath: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  return normalizePath(posix.normalize(posix.join(dirname(docPath), target)));
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
  const normalized = normalizePath(mention).replace(/\/$/, '');
  return nodes
    .filter((node) => node.path && (node.path === normalized || node.path.startsWith(`${normalized}/`) || normalized.startsWith(`${node.path}/`)))
    .sort((a, b) => Math.abs((a.path?.length ?? 0) - normalized.length) - Math.abs((b.path?.length ?? 0) - normalized.length))[0];
}

export function buildRepositoryKnowledgeGraph(): KnowledgeGraph {
  const nodes = new Map<string, KnowledgeNode>();
  const edges = new Map<string, KnowledgeEdge>();
  const addEdge = (edge: KnowledgeEdge): void => {
    if (edge.from === edge.to) return;
    edges.set(edgeKey(edge), edge);
  };

  const packageNodes: KnowledgeNode[] = [];
  const packageByName = new Map<string, KnowledgeNode>();
  for (const packagePath of immediateDirectories('packages')) {
    const manifestPath = `${packagePath}/package.json`;
    if (!pathExists(manifestPath)) continue;
    const manifest = readRepoJson<PackageManifest>(manifestPath);
    const name = manifest.name || packagePath.split('/').at(-1) || packagePath;
    const exportsList = typeof manifest.exports === 'object' && manifest.exports ? Object.keys(manifest.exports) : [];
    const node: KnowledgeNode = {
      id: nodeId('package', name),
      kind: 'package',
      name,
      path: packagePath,
      summary: exportsList.length ? `Public exports: ${exportsList.sort().join(', ')}` : undefined,
      tags: searchableTokens(name, packagePath, ...exportsList),
    };
    addNode(nodes, node);
    packageNodes.push(node);
    packageByName.set(name, node);
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

  const codeFiles = ['src', 'packages', 'services', 'scripts']
    .flatMap((root) => walkFiles(root, (path) => SOURCE_EXTENSIONS.test(path)))
    .filter((path, index, all) => all.indexOf(path) === index)
    .sort();
  const knownCodePaths = new Set(codeFiles);
  const sourceNodeByPath = new Map<string, KnowledgeNode>();

  for (const path of codeFiles) {
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
    if (owner) addEdge({ from: node.id, to: owner.id, kind: 'belongs-to' });
    if (isTest && owner) addEdge({ from: node.id, to: owner.id, kind: 'tests' });
  }

  const routeFiles = codeFiles.filter((path) => /^src\/app\/.+\/(?:page|route)\.[cm]?[jt]sx?$/.test(path) || /^src\/app\/(?:page|route)\.[cm]?[jt]sx?$/.test(path));
  for (const path of routeFiles) {
    const route = routePath(path);
    const routeNode: KnowledgeNode = {
      id: nodeId('route', `${route}:${path.endsWith('/route.ts') || /\/route\.[cm]?[jt]sx?$/.test(path) ? 'handler' : 'page'}`),
      kind: 'route',
      name: route,
      path,
      tags: searchableTokens(route, path),
    };
    addNode(nodes, routeNode);
    const source = sourceNodeByPath.get(path);
    if (source) addEdge({ from: routeNode.id, to: source.id, kind: 'contains' });
    const owner = ownerForPath(path, packageNodes, featureNodes, serviceNodes);
    if (owner) addEdge({ from: routeNode.id, to: owner.id, kind: 'belongs-to' });
  }

  for (const path of codeFiles) {
    const from = sourceNodeByPath.get(path);
    if (!from) continue;
    for (const specifier of extractImports(readRepoText(path))) {
      if (specifier.startsWith('@asol/')) {
        const packageName = specifier.split('/').slice(0, 2).join('/');
        const target = packageByName.get(packageName);
        if (target) addEdge({ from: from.id, to: target.id, kind: 'imports', detail: specifier });
        continue;
      }
      const resolved = resolveSourceSpecifier(path, specifier, knownCodePaths);
      const target = resolved ? sourceNodeByPath.get(resolved) : undefined;
      if (target) addEdge({ from: from.id, to: target.id, kind: 'imports', detail: specifier });
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

  const configPaths = [
    'package.json',
    '.env.example',
    'next.config.ts',
    'tsconfig.json',
    'eslint.config.js',
    'capacitor.config.ts',
    '.vercelignore',
  ].filter(pathExists);
  for (const path of configPaths) {
    addNode(nodes, {
      id: nodeId('config', path),
      kind: 'config',
      name: path,
      path,
      tags: searchableTokens(path),
    });
  }

  const registryPath = 'docs/09-agent-knowledge/domain-registry.json';
  if (pathExists(registryPath)) {
    const registry = readRepoJson<DomainRegistry>(registryPath);
    for (const domain of registry.domains) {
      const anchor = documentNodeByPath.get(domain.readFirst[0]) || documentNodeByPath.get(`${domain.docsPrefix}README.md`);
      if (!anchor) continue;
      for (const sourcePrefix of domain.sourcePrefixes) {
        for (const target of allNodes()) {
          if (!target.path) continue;
          const matches = target.path === sourcePrefix || target.path.startsWith(sourcePrefix.endsWith('/') ? sourcePrefix : `${sourcePrefix}/`);
          if (matches && target.kind !== 'document') addEdge({ from: anchor.id, to: target.id, kind: 'documents', detail: sourcePrefix });
        }
      }
      for (const readFirst of domain.readFirst.slice(1)) {
        const target = documentNodeByPath.get(readFirst);
        if (target) addEdge({ from: anchor.id, to: target.id, kind: 'related-to', detail: domain.id });
      }
    }
  }

  return {
    version: 1,
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => edgeKey(a).localeCompare(edgeKey(b))),
  };
}
