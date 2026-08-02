import { asolApi } from "@/core/api";

import { GOOGLE_PLAY_STORE_ASSETS_API } from "../config";
import type {
  GooglePlayPromoteInput,
  GooglePlayStoreAssetsMutationResult,
  GooglePlayStoreAssetsSnapshot,
  GooglePlayStoreAssetsUpdateInput,
  GooglePlayTrackMutationInput,
} from "../domain/store-assets-types";

let snapshotRequest: Promise<GooglePlayStoreAssetsSnapshot> | null = null;

function loadSnapshot(headers: Record<string, string>) {
  if (!snapshotRequest) {
    snapshotRequest = asolApi
      .get<GooglePlayStoreAssetsSnapshot>(GOOGLE_PLAY_STORE_ASSETS_API.snapshot, {
        headers,
        cache: "no-store",
      })
      .finally(() => {
        snapshotRequest = null;
      });
  }
  return snapshotRequest;
}

export const storeAssetsApiService = {
  snapshot(headers: Record<string, string>) {
    return loadSnapshot(headers);
  },
  save(input: GooglePlayStoreAssetsUpdateInput, headers: Record<string, string>) {
    return asolApi.put<GooglePlayStoreAssetsMutationResult>(
      GOOGLE_PLAY_STORE_ASSETS_API.snapshot,
      input,
      { headers },
    );
  },
  uploadImage(form: FormData, headers: Record<string, string>) {
    return asolApi.postForm<GooglePlayStoreAssetsMutationResult>(
      GOOGLE_PLAY_STORE_ASSETS_API.uploadImage,
      form,
      { headers },
    );
  },
  deleteImage(input: object, headers: Record<string, string>) {
    return asolApi.post<GooglePlayStoreAssetsMutationResult>(
      GOOGLE_PLAY_STORE_ASSETS_API.deleteImage,
      input,
      { headers },
    );
  },
  deleteListing(language: string, headers: Record<string, string>) {
    return asolApi.post<GooglePlayStoreAssetsMutationResult>(
      GOOGLE_PLAY_STORE_ASSETS_API.deleteListing,
      { language },
      { headers },
    );
  },
  restoreBackup(name: string, headers: Record<string, string>) {
    return asolApi.post<GooglePlayStoreAssetsMutationResult>(
      GOOGLE_PLAY_STORE_ASSETS_API.restoreBackup,
      { name },
      { headers },
    );
  },
  updateTrack(input: GooglePlayTrackMutationInput, headers: Record<string, string>) {
    return asolApi.post<GooglePlayStoreAssetsMutationResult>(
      GOOGLE_PLAY_STORE_ASSETS_API.tracks,
      input,
      { headers },
    );
  },
  promote(input: GooglePlayPromoteInput, headers: Record<string, string>) {
    return asolApi.post<GooglePlayStoreAssetsMutationResult>(
      GOOGLE_PLAY_STORE_ASSETS_API.promote,
      input,
      { headers },
    );
  },
  uploadMapping(form: FormData, headers: Record<string, string>) {
    return asolApi.postForm<GooglePlayStoreAssetsMutationResult>(
      GOOGLE_PLAY_STORE_ASSETS_API.uploadMapping,
      form,
      { headers },
    );
  },
};
