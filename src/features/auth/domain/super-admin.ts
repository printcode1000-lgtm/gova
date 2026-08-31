import { samePhone, SUPER_ADMIN_PHONE, SUPER_ADMIN_UID } from "@asol/auth-core";
import type { UserSession } from "@/features/auth/domain/session.entity";

export { SUPER_ADMIN_PHONE, SUPER_ADMIN_UID };

export function isSuperAdmin(session: UserSession | null): boolean {
  return !!session && isSuperAdminIdentity(session.uid, session.phone);
}

export function isSuperAdminIdentity(uid: string, phone: string): boolean {
  // `samePhone` so a session signed before the phone migration — carrying the
  // national spelling — still identifies the same administrator.
  return uid === SUPER_ADMIN_UID && samePhone(phone, SUPER_ADMIN_PHONE);
}
