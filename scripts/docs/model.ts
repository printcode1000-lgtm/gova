export type KnowledgeNodeKind =
  | 'document'
  | 'domain'
  | 'package'
  | 'external-dependency'
  | 'feature'
  | 'route'
  | 'service'
  | 'script'
  | 'test'
  | 'config'
  | 'source'
  | 'runtime'
  | 'artifact'
  | 'command'
  | 'environment-key';

export type KnowledgeEdgeKind =
  | 'contains'
  | 'imports'
  | 'declares-dependency'
  | 'belongs-to'
  | 'references'
  | 'documents'
  | 'tests'
  | 'related-to'
  | 'affects-runtime'
  | 'targets-runtime'
  | 'produces'
  | 'consumes'
  | 'invokes'
  | 'configured-by'
  | 'uses-environment';

export interface KnowledgeNode {
  id: string;
  kind: KnowledgeNodeKind;
  name: string;
  path?: string;
  summary?: string;
  tags: string[];
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  kind: KnowledgeEdgeKind;
  detail?: string;
}

export interface KnowledgeGraph {
  version: 2;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface DomainDefinition {
  id: string;
  docsPrefix: string;
  sourcePrefixes: string[];
  readFirst: string[];
}

export interface DomainRegistry {
  version: 1;
  domains: DomainDefinition[];
}
