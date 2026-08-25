export interface DiscoveredUserPage {
  route: string;
  sourceFile: string;
}

export interface DiscoveredPageInteractions {
  route: string;
  sourceDigest: string;
  interactionSourceCount: number;
  sourceFiles: readonly string[];
}

export interface InteractionBaselineEntry {
  sourceDigest: string;
  interactionSourceCount: number;
  eventIds: readonly string[];
}

export type InteractionBaseline = Readonly<Record<string, InteractionBaselineEntry>>;
