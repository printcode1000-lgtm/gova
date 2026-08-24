export type KnowledgeNodeKind =
  | 'document'
  | 'package'
  | 'feature'
  | 'route'
  | 'service'
  | 'script'
  | 'test'
  | 'config'
  | 'source';

export type KnowledgeEdgeKind =
  | 'contains'
  | 'imports'
  | 'belongs-to'
  | 'references'
  | 'documents'
  | 'tests'
  | 'related-to';

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
  version: 1;
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
