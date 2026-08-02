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
  tracks?: GooglePlayTrackSnapshot[];
  backups?: GooglePlayBackupDescriptor[];
  liveOtaVersion?: string;
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
  diff?: string;
}

export type GooglePlayTrackName = "internal" | "alpha" | "beta" | "production";

export interface GooglePlayReleaseNote {
  language: string;
  text: string;
}

export interface GooglePlayTrackRelease {
  name?: string;
  versionCodes?: string[];
  status?: "draft" | "inProgress" | "halted" | "completed";
  userFraction?: number;
  releaseNotes?: GooglePlayReleaseNote[];
}

export interface GooglePlayTrackSnapshot {
  track: GooglePlayTrackName;
  releases: GooglePlayTrackRelease[];
}

export interface GooglePlayTrackMutationInput {
  track: GooglePlayTrackName;
  release: GooglePlayTrackRelease;
}

export interface GooglePlayPromoteInput {
  fromTrack: GooglePlayTrackName;
  toTrack: GooglePlayTrackName;
  versionCode: string;
  releaseNotes?: GooglePlayReleaseNote[];
}

export interface GooglePlayMappingUploadInput {
  versionCode: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}

export interface GooglePlayBackupDescriptor {
  name: string;
  path: string;
  size: number;
  mtime: string;
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
