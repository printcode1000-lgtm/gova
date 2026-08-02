export type BundleCategory =
  | "nativeLibraries"
  | "compiledCode"
  | "webBundle"
  | "androidResources"
  | "otherAssets"
  | "manifestMetadataSigning"
  | "packagedJavaResources"
  | "featureModules"
  | "unclassified";

export interface BundleEntryDescriptor {
  name: string;
  category: BundleCategory;
  categoryPath: string[];
  compressionMethod: number;
  compressedBytes: number;
  uncompressedBytes: number;
  crc32: number;
}

export interface BundleAnalysisNode {
  id: string;
  label: string;
  compressedBytes: number;
  uncompressedBytes: number;
  entryCount: number;
  percentage: number;
  children: BundleAnalysisNode[];
}

export interface BundleDeliveryEstimate {
  abi: string;
  density?: string;
  language?: string;
  compressedBytes: number;
  noteKey: string;
}

export interface R8RemovalSummary {
  removedCodeEntries?: number;
  removedResourceEntries?: number;
  usageReportBytes?: number;
  resourcesReportBytes?: number;
  mappingBytes?: number;
}

export interface BundleAnalysis {
  schemaVersion: 2;
  sha256: string;
  artifactName: string;
  format: "apk" | "aab";
  analyzedAt: string;
  archiveBytes: number;
  totalCompressedBytes: number;
  totalUncompressedBytes: number;
  entryCount: number;
  categories: BundleAnalysisNode[];
  entries: BundleEntryDescriptor[];
  largestWebEntries: BundleEntryDescriptor[];
  deliveryEstimates?: BundleDeliveryEstimate[];
  r8?: R8RemovalSummary;
}

export type BundleDeltaState = "new" | "removed" | "grown" | "shrunk" | "unchanged";
export interface BundleAnalysisDelta {
  id: string;
  state: BundleDeltaState;
  leftCompressedBytes: number;
  rightCompressedBytes: number;
  compressedDeltaBytes: number;
  compressedDeltaPercent: number | null;
  leftUncompressedBytes: number;
  rightUncompressedBytes: number;
}

export interface BundleAnalysisComparison {
  leftSha256: string;
  rightSha256: string;
  total: BundleAnalysisDelta;
  categories: BundleAnalysisDelta[];
  files: BundleAnalysisDelta[];
}
