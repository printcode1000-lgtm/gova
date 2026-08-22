import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { permissionsAdapter } from "../adapters/permissions.adapter";
import type { PermissionKind, PermissionResult } from "../domain/permissions/permission-kinds";

const MODULE = "Permissions";

export const permissionsApi = {
  async checkPermission(kind: PermissionKind): Promise<Result<PermissionResult, NativeCoreError>> {
    try {
      const res = await permissionsAdapter.check(kind);
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async requestPermission(kind: PermissionKind): Promise<Result<PermissionResult, NativeCoreError>> {
    try {
      const res = await permissionsAdapter.request(kind);
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async openSettings(): Promise<Result<boolean, NativeCoreError>> {
    try {
      const res = await permissionsAdapter.openSettings();
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  /** This application's notification settings screen, app settings as fallback. */
  async openNotificationSettings(): Promise<Result<boolean, NativeCoreError>> {
    try {
      const res = await permissionsAdapter.openNotificationSettings();
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  /** Whether this host has an application settings screen to open at all. */
  canOpenNotificationSettings(): boolean {
    return permissionsAdapter.canOpenNotificationSettings();
  },
};
