import 'server-only';

import '@/features/auth/server';
import { createSignedSessionToken } from '@asol/auth-core/server';
import { persistentSystemLogService } from "@/features/system-logs/server";
import { registerDataCoreRuntimeConfigPorts } from "@/features/data/server";
import { accountDeletionService } from "@/features/auth/server";
import {
  superAdminUserSearchRepository,
  type SuperAdminUserSearchFilters,
} from "@asol/data-core/super-admin";

registerDataCoreRuntimeConfigPorts();

export class SuperAdminUserService {
  search(filters: SuperAdminUserSearchFilters) {
    return superAdminUserSearchRepository.search(filters);
  }

  async impersonate(input: { adminUid: string; targetUid: string }) {
    const user = await superAdminUserSearchRepository.getImpersonationTarget(
      input.targetUid,
    );
    if (!user) throw new Error("userNotFound");

    await persistentSystemLogService.add({
      level: "warning",
      source: "server",
      consoleMethod: "server.warn",
      message: `Super admin impersonation started: ${input.adminUid} -> ${user.uid}`,
      page: "/super-admin/users",
      platform: "server",
      feature: "SuperAdminUsers",
      operation: "impersonate",
      routeName: "/api/super-admin/impersonate",
      requestMethod: "POST",
    });

    return {
      uid: user.uid,
      phone: user.phone,
      email: user.email,
      specialties: user.specialties,
      sessionToken: createSignedSessionToken(user.uid, user.phone),
    };
  }

  async deleteUser(input: { adminUid: string; targetUid: string }) {
    let result: Awaited<ReturnType<typeof accountDeletionService.deleteBySuperAdmin>>;
    try {
      result = await accountDeletionService.deleteBySuperAdmin(input.targetUid);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack ?? "" : "";
      try {
        await persistentSystemLogService.add({
          level: "error",
          source: "server",
          consoleMethod: "server.error",
          message: `Super admin user deletion failed: ${message}`,
          stack,
          page: "/super-admin/users",
          platform: "server",
          feature: "SuperAdminUsers",
          operation: "deleteUser",
          routeName: "/api/super-admin/users/delete",
          requestMethod: "POST",
        });
      } catch (loggingError) {
        console.error("[SuperAdminUsers] Failed to persist account deletion failure", loggingError);
      }
      throw error;
    }

    try {
      await persistentSystemLogService.add({
        level: "warning",
        source: "server",
        consoleMethod: "server.warn",
        message: `Super admin deleted user account: ${input.adminUid} -> ${input.targetUid}`,
        page: "/super-admin/users",
        platform: "server",
        feature: "SuperAdminUsers",
        operation: "deleteUser",
        routeName: "/api/super-admin/users/delete",
        requestMethod: "POST",
      });
    } catch (error) {
      console.error("[SuperAdminUsers] Account deletion completed but audit logging failed", error);
    }

    return result;
  }
}

export const superAdminUserService = new SuperAdminUserService();
