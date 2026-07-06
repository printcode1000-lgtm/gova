import type { UserSession } from "@/features/auth/entities/session.entity";

export const SUPER_ADMIN_UID = "usr_1782522385927_pwpl7rr";
export const SUPER_ADMIN_PHONE = "01026546550";

function normalizeEgyptianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("20") && digits.length === 12
    ? digits.slice(2)
    : digits;
}

export function isSuperAdmin(session: UserSession | null): boolean {
  return !!session && isSuperAdminIdentity(session.uid, session.phone);
}

export function isSuperAdminIdentity(uid: string, phone: string): boolean {
  return (
    uid === SUPER_ADMIN_UID &&
    normalizeEgyptianPhone(phone) === SUPER_ADMIN_PHONE
  );
}
