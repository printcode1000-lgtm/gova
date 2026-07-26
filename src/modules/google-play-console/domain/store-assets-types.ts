import type { GooglePlayConsoleEnvironment } from "./types";

export const GOOGLE_PLAY_IMAGE_TYPES = [
  "icon",
  "featureGraphic",
  "phoneScreenshots",
  "sevenInchScreenshots",
  "tenInchScreenshots",
  "tvBanner",
  "tvScreenshots",
  "wearScreenshots",
] as const;

export type GooglePlayImageType = (typeof GOOGLE_PLAY_IMAGE_TYPES)[number];

export interface GooglePlayStoreListing {
  language: string;
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  video?: string;
}

export interface GooglePlayStoreImage {
  id: string;
  url: string;
  sha1?: string;
  sha256?: string;
}

export interface GooglePlayStoreImageGroup {
  language: string;
  imageType: GooglePlayImageType;
  images: GooglePlayStoreImage[];
  error?: string;
}

export interface GooglePlayStoreAssetsSnapshot {
  environment: GooglePlayConsoleEnvironment;
  fetchedAt: string;
  packageName: string;
  defaultLanguage: string;
  details: {
    defaultLanguage?: string;
    contactWebsite?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  listings: GooglePlayStoreListing[];
  images: GooglePlayStoreImageGroup[];
  warnings: string[];
}

export interface GooglePlayStoreAssetsUpdateInput {
  details?: GooglePlayStoreAssetsSnapshot["details"];
  listings?: GooglePlayStoreListing[];
}

export interface GooglePlayStoreAssetsMutationResult {
  committed: boolean;
  editId: string;
  backupFile?: string;
  snapshot: GooglePlayStoreAssetsSnapshot;
}

export type GooglePlayFastlaneAction =
  | "aabSigned"
  | "aabUnsigned"
  | "apkSigned"
  | "apkUnsigned"
  | "publishInternal"
  | "publishProduction";

export interface GooglePlayFastlaneResult {
  action: GooglePlayFastlaneAction;
  ok: boolean;
  exitCode: number | null;
  command: string;
  durationMs: number;
  output: string;
}
