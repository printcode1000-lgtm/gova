import 'server-only';

import '@/features/auth/server/auth-core-ports.server';
import { createSignedSessionToken } from '@asol/auth-core/server';
import { persistentSystemLogService } from "@/features/system-logs/services/persistent-system-log-service.server";
import { accountDeletionService } from "@/features/auth/server/auth-core-bootstrap.server";
import {
  superAdminUserSearchRepository,
  type SuperAdminUserSearchFilters,
} from "@asol/data-core/super-admin";

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
    const result = await accountDeletionService.deleteBySuperAdmin(input.targetUid);

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

    return result;
  }
}

export const superAdminUserService = new SuperAdminUserService();
