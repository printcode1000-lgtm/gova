import "server-only";

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { GoogleAuth } from "google-auth-library";

import {
  assertGooglePlayConsoleAllowed,
  googlePlayFastlaneEnvironment,
  googlePlayConsoleEnvironment,
  resolveGooglePlayConsoleConfig,
} from "../domain/development-guard.server";
import {
  GOOGLE_PLAY_IMAGE_TYPES,
  type GooglePlayBackupDescriptor,
  type GooglePlayFastlaneAction,
  type GooglePlayFastlaneResult,
  type GooglePlayImageType,
  type GooglePlayMappingUploadInput,
  type GooglePlayPromoteInput,
  type GooglePlayStoreAssetsMutationResult,
  type GooglePlayStoreAssetsSnapshot,
  type GooglePlayStoreAssetsUpdateInput,
  type GooglePlayStoreImageGroup,
  type GooglePlayStoreListing,
  type GooglePlayTrackMutationInput,
  type GooglePlayTrackName,
  type GooglePlayTrackSnapshot,
} from "../domain/store-assets-types";
import { readImageDimensions, validateGooglePlayImage } from "../domain/image-validation";
import { resolveGooglePlayCredentials } from "./google-play-credentials.server";

const ANDROID_PUBLISHER_SCOPE =
  "https://www.googleapis.com/auth/androidpublisher";
const API_ROOT = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const UPLOAD_ROOT =
  "https://androidpublisher.googleapis.com/upload/androidpublisher/v3";
const BACKUP_DIR = path.join(process.cwd(), ".backups", "google-play-store-assets");
const TRACKS: GooglePlayTrackName[] = ["internal", "alpha", "beta", "production"];

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function asListing(input: unknown): GooglePlayStoreListing {
  const item = input as GooglePlayStoreListing;
  return {
    language: item.language,
    title: item.title ?? "",
    shortDescription: item.shortDescription ?? "",
    fullDescription: item.fullDescription ?? "",
    video: item.video ?? "",
  };
}

export class GooglePlayStoreAssetsService {
  async snapshot(): Promise<GooglePlayStoreAssetsSnapshot> {
    return this.withEdit(async ({ client, packageName, editId }) => {
      return this.readSnapshot(client, packageName, editId);
    });
  }

  async updateText(
    input: GooglePlayStoreAssetsUpdateInput,
  ): Promise<GooglePlayStoreAssetsMutationResult> {
    return this.withEdit(async ({ client, packageName, editId }) => {
      const before = await this.readSnapshot(client, packageName, editId);
      const backupFile = await this.writeBackup(before);
      const diff = JSON.stringify({ before: before.listings, after: input.listings ?? [] }, null, 2);

      if (input.details) {
        await client.request({
          method: "PUT",
          url: `${API_ROOT}/applications/${packageName}/edits/${editId}/details`,
          data: input.details,
        });
      }

      for (const listing of input.listings ?? []) {
        if (!listing.language) continue;
        await client.request({
          method: "PUT",
          url: `${API_ROOT}/applications/${packageName}/edits/${editId}/listings/${encodeURIComponent(listing.language)}`,
          data: listing,
        });
      }

      await this.commit(client, packageName, editId);
      return {
        committed: true,
        editId,
        backupFile,
        snapshot: await this.snapshot(),
        diff,
      };
    }, false);
  }

  async uploadImage(input: {
    language: string;
    imageType: GooglePlayImageType;
    fileName: string;
    contentType: string;
    buffer: Buffer;
  }): Promise<GooglePlayStoreAssetsMutationResult> {
    return this.withEdit(async ({ client, packageName, editId }) => {
      const currentImages = await this.readImagesForType(
        client,
        packageName,
        editId,
        input.language,
        input.imageType,
      );
      const dimensions = readImageDimensions(input.buffer);
      if (!dimensions) throw new Error("تعذر قراءة أبعاد الصورة / Could not read image dimensions.");
      const validation = validateGooglePlayImage({
        imageType: input.imageType,
        contentType: input.contentType,
        size: input.buffer.byteLength,
        dimensions,
        existingCount: currentImages.length,
      });
      if (!validation.ok) throw new Error(validation.message);
      const before = await this.readSnapshot(client, packageName, editId);
      const backupFile = await this.writeBackup(before);
      await client.request({
        method: "POST",
        url:
          `${UPLOAD_ROOT}/applications/${packageName}/edits/${editId}` +
          `/listings/${encodeURIComponent(input.language)}` +
          `/${encodeURIComponent(input.imageType)}?uploadType=media`,
        headers: {
          "Content-Type": input.contentType || "application/octet-stream",
          "X-Goog-Upload-File-Name": input.fileName,
        },
        data: input.buffer,
      });
      await this.commit(client, packageName, editId);
      return { committed: true, editId, backupFile, snapshot: await this.snapshot() };
    }, false);
  }

  async deleteImage(input: {
    language: string;
    imageType: GooglePlayImageType;
    imageId: string;
  }): Promise<GooglePlayStoreAssetsMutationResult> {
    return this.withEdit(async ({ client, packageName, editId }) => {
      const before = await this.readSnapshot(client, packageName, editId);
      const backupFile = await this.writeBackup(before);
      await client.request({
        method: "DELETE",
        url:
          `${API_ROOT}/applications/${packageName}/edits/${editId}` +
          `/listings/${encodeURIComponent(input.language)}` +
          `/${encodeURIComponent(input.imageType)}/${encodeURIComponent(input.imageId)}`,
      });
      await this.commit(client, packageName, editId);
      return { committed: true, editId, backupFile, snapshot: await this.snapshot() };
    }, false);
  }

  async deleteListing(language: string): Promise<GooglePlayStoreAssetsMutationResult> {
    return this.withEdit(async ({ client, packageName, editId }) => {
      const before = await this.readSnapshot(client, packageName, editId);
      const backupFile = await this.writeBackup(before);
      await client.request({
        method: "DELETE",
        url: `${API_ROOT}/applications/${packageName}/edits/${editId}/listings/${encodeURIComponent(language)}`,
      });
      await this.commit(client, packageName, editId);
      return { committed: true, editId, backupFile, snapshot: await this.snapshot() };
    }, false);
  }

  async listBackups(): Promise<GooglePlayBackupDescriptor[]> {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const files = (await fs.readdir(BACKUP_DIR)).filter((file) => file.endsWith(".json"));
    const items = await Promise.all(files.map(async (file) => {
      const fullPath = path.join(BACKUP_DIR, file);
      const stat = await fs.stat(fullPath);
      return {
        name: file,
        path: path.relative(process.cwd(), fullPath).replace(/\\/g, "/"),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      };
    }));
    return items.sort((left, right) => right.mtime.localeCompare(left.mtime));
  }

  async restoreBackup(name: string): Promise<GooglePlayStoreAssetsMutationResult> {
    const safeName = path.basename(name);
    const snapshot = JSON.parse(await fs.readFile(path.join(BACKUP_DIR, safeName), "utf8")) as GooglePlayStoreAssetsSnapshot;
    return this.updateText({ details: snapshot.details, listings: snapshot.listings });
  }

  async updateTrack(input: GooglePlayTrackMutationInput): Promise<GooglePlayStoreAssetsMutationResult> {
    return this.withEdit(async ({ client, packageName, editId }) => {
      const before = await this.readSnapshot(client, packageName, editId);
      const backupFile = await this.writeBackup(before);
      await client.request({
        method: "PUT",
        url: `${API_ROOT}/applications/${packageName}/edits/${editId}/tracks/${encodeURIComponent(input.track)}`,
        data: { track: input.track, releases: [input.release] },
      });
      await this.commit(client, packageName, editId);
      return { committed: true, editId, backupFile, snapshot: await this.snapshot() };
    }, false);
  }

  async promoteRelease(input: GooglePlayPromoteInput): Promise<GooglePlayStoreAssetsMutationResult> {
    const source = await this.snapshot();
    const sourceTrack = source.tracks?.find((track) => track.track === input.fromTrack);
    const sourceRelease = sourceTrack?.releases.find((release) =>
      release.versionCodes?.map(String).includes(String(input.versionCode)),
    );
    if (!sourceRelease) throw new Error("googlePlayReleaseNotFoundForPromotion");
    return this.updateTrack({
      track: input.toTrack,
      release: {
        ...sourceRelease,
        versionCodes: [String(input.versionCode)],
        status: input.toTrack === "production" ? "inProgress" : "completed",
        releaseNotes: input.releaseNotes ?? sourceRelease.releaseNotes,
      },
    });
  }

  async uploadMapping(input: GooglePlayMappingUploadInput): Promise<GooglePlayStoreAssetsMutationResult> {
    return this.withEdit(async ({ client, packageName, editId }) => {
      const before = await this.readSnapshot(client, packageName, editId);
      const backupFile = await this.writeBackup(before);
      await client.request({
        method: "POST",
        url:
          `${UPLOAD_ROOT}/applications/${packageName}/edits/${editId}` +
          `/deobfuscationfiles/${encodeURIComponent(String(input.versionCode))}/proguard?uploadType=media`,
        headers: { "Content-Type": input.contentType || "text/plain" },
        data: input.buffer,
      });
      await this.commit(client, packageName, editId);
      return { committed: true, editId, backupFile, snapshot: await this.snapshot() };
    }, false);
  }

  runFastlaneAction(
    action: GooglePlayFastlaneAction,
    confirmation?: string,
  ): GooglePlayFastlaneResult {
    assertGooglePlayConsoleAllowed();
    const scripts: Record<GooglePlayFastlaneAction, string> = {
      aabSigned: "fastlane:android:aab:signed",
      aabUnsigned: "fastlane:android:aab:unsigned",
      apkSigned: "fastlane:android:apk:signed",
      apkUnsigned: "fastlane:android:apk:unsigned",
      publishInternal: "fastlane:android:internal",
      publishProduction: "fastlane:android:production",
    };

    if (action === "publishProduction" && confirmation !== "PUBLISH_PRODUCTION") {
      throw new Error("googlePlayProductionConfirmationRequired");
    }

    const startedAt = Date.now();
    const result = spawnSync("npm", ["run", scripts[action]], {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: process.platform === "win32",
      env: googlePlayFastlaneEnvironment(),
      timeout: 1000 * 60 * 45,
    });

    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.slice(-20000);
    return {
      action,
      ok: result.status === 0,
      exitCode: result.status,
      command: `npm run ${scripts[action]}`,
      durationMs: Date.now() - startedAt,
      output,
    };
  }

  private async withEdit<T>(
    operation: (context: {
      client: Awaited<ReturnType<GoogleAuth["getClient"]>>;
      packageName: string;
      editId: string;
    }) => Promise<T>,
    deleteAfter = true,
  ): Promise<T> {
    assertGooglePlayConsoleAllowed();
    const config = resolveGooglePlayConsoleConfig();
    const credentials = await resolveGooglePlayCredentials();
    if (!credentials.credentials) throw new Error("googlePlayConsoleCredentialsMissing");
    const auth = new GoogleAuth({
      credentials: credentials.credentials,
      scopes: [ANDROID_PUBLISHER_SCOPE],
    });
    const client = await auth.getClient();
    const packageName = encodeURIComponent(config.packageName);
    const edit = await client.request<{ id?: string }>({
      method: "POST",
      url: `${API_ROOT}/applications/${packageName}/edits`,
    });
    const editId = edit.data.id;
    if (!editId) throw new Error("googlePlayEditMissing");

    try {
      return await operation({ client, packageName, editId: encodeURIComponent(editId) });
    } finally {
      if (deleteAfter) {
        await client
          .request({
            method: "DELETE",
            url: `${API_ROOT}/applications/${packageName}/edits/${encodeURIComponent(editId)}`,
          })
          .catch((deleteError) => {
            console.warn("[GooglePlayAssets] Failed to delete temporary edit.", deleteError);
          });
      }
    }
  }

  private async readSnapshot(
    client: Awaited<ReturnType<GoogleAuth["getClient"]>>,
    packageName: string,
    editId: string,
  ): Promise<GooglePlayStoreAssetsSnapshot> {
    const warnings: string[] = [];
    const details = await client
      .request<GooglePlayStoreAssetsSnapshot["details"]>({
        url: `${API_ROOT}/applications/${packageName}/edits/${editId}/details`,
      })
      .then((response) => response.data)
      .catch((error) => {
        warnings.push(`details: ${asErrorMessage(error)}`);
        return {} as GooglePlayStoreAssetsSnapshot["details"];
      });
    const listings = await client
      .request<{ listings?: unknown[] }>({
        url: `${API_ROOT}/applications/${packageName}/edits/${editId}/listings`,
      })
      .then((response) => (response.data.listings ?? []).map(asListing))
      .catch((error) => {
        warnings.push(`listings: ${asErrorMessage(error)}`);
        return [] as GooglePlayStoreListing[];
      });
    const languages = Array.from(
      new Set([
        details.defaultLanguage || "ar",
        ...listings.map((listing) => listing.language),
      ]),
    ).filter(Boolean);
    const images: GooglePlayStoreImageGroup[] = [];

    for (const language of languages) {
      for (const imageType of GOOGLE_PLAY_IMAGE_TYPES) {
        try {
          const response = await client.request<{ images?: GooglePlayStoreImageGroup["images"] }>({
            url:
              `${API_ROOT}/applications/${packageName}/edits/${editId}` +
              `/listings/${encodeURIComponent(language)}/${encodeURIComponent(imageType)}`,
          });
          images.push({
            language,
            imageType,
            images: response.data.images ?? [],
          });
        } catch (error) {
          images.push({
            language,
            imageType,
            images: [],
            error: asErrorMessage(error),
          });
        }
      }
    }
    const tracks: GooglePlayTrackSnapshot[] = [];
    for (const track of TRACKS) {
      try {
        const response = await client.request<{ releases?: GooglePlayTrackSnapshot["releases"] }>({
          url: `${API_ROOT}/applications/${packageName}/edits/${editId}/tracks/${encodeURIComponent(track)}`,
        });
        tracks.push({ track, releases: response.data.releases ?? [] });
      } catch (error) {
        warnings.push(`track ${track}: ${asErrorMessage(error)}`);
        tracks.push({ track, releases: [] });
      }
    }

    return {
      environment: googlePlayConsoleEnvironment(),
      fetchedAt: new Date().toISOString(),
      packageName: decodeURIComponent(packageName),
      defaultLanguage: details.defaultLanguage || "ar",
      details,
      listings,
      images,
      tracks,
      backups: await this.listBackups(),
      liveOtaVersion: this.readLiveOtaVersion(),
      warnings,
    };
  }

  private async readImagesForType(
    client: Awaited<ReturnType<GoogleAuth["getClient"]>>,
    packageName: string,
    editId: string,
    language: string,
    imageType: GooglePlayImageType,
  ) {
    return client
      .request<{ images?: GooglePlayStoreImageGroup["images"] }>({
        url:
          `${API_ROOT}/applications/${packageName}/edits/${editId}` +
          `/listings/${encodeURIComponent(language)}/${encodeURIComponent(imageType)}`,
      })
      .then((response) => response.data.images ?? [])
      .catch(() => []);
  }

  private readLiveOtaVersion() {
    return undefined;
  }

  private async commit(
    client: Awaited<ReturnType<GoogleAuth["getClient"]>>,
    packageName: string,
    editId: string,
  ) {
    await client.request({
      method: "POST",
      url: `${API_ROOT}/applications/${packageName}/edits/${editId}:commit`,
    });
  }

  private async writeBackup(snapshot: GooglePlayStoreAssetsSnapshot) {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const fileName = `google-play-store-assets-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    const fullPath = path.join(BACKUP_DIR, fileName);
    await fs.writeFile(fullPath, JSON.stringify(snapshot, null, 2), "utf8");
    return path.relative(process.cwd(), fullPath);
  }
}

export const googlePlayStoreAssetsService = new GooglePlayStoreAssetsService();
