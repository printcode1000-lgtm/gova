/**
 * Files facade — application storage and user files under one namespace,
 * each half implemented by its own single-responsibility class.
 */

import { appStorage } from "./app-storage";
import { userFiles } from "./user-files";

export const files = {
  /** Application-private storage the user never browses. */
  app: appStorage,
  /** User-facing picking, opening, and saving. */
  user: userFiles,
} as const;

export { appStorage, AppStorage } from "./app-storage";
export { userFiles, UserFiles } from "./user-files";
export {
  AcceptPresets,
  StorageAreas,
  type AppFileInfo,
  type PickedFile,
  type PickFilesOptions,
  type SaveToDeviceOptions,
  type StorageArea,
  type WriteFileOptions,
} from "./types";
