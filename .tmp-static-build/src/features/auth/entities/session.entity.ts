import {
  EMPTY_PROFILE_SPECIALTIES,
  type ProfileSpecialtiesSelection,
} from '@/features/profile/entities/profile-specialties.entity';

/** Logged-in user session — persisted in GovaDB (auth store, key: current). */
export interface UserSession {
  uid: string;
  phone: string;
  email?: string;
  specialties: ProfileSpecialtiesSelection;
}

export interface SaveSessionInput {
  uid: string;
  phone: string;
  email?: string;
  specialties?: ProfileSpecialtiesSelection;
}

/** `null` = not logged in (guest browsing may still use guestSessions store). */
export type SessionState = UserSession | null;

export function isLoggedIn(session: SessionState): boolean {
  return session !== null && !!session.uid;
}

export function parseStoredSession(raw: unknown): UserSession | null {
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const uid = typeof record.uid === 'string' ? record.uid.trim() : '';
  if (!uid) return null;

  const phone = typeof record.phone === 'string' ? record.phone : '';
  const email =
    typeof record.email === 'string' && record.email.trim()
      ? record.email.trim()
      : undefined;

  const rawSpecialties = record.specialties;
  const specialties =
    rawSpecialties && typeof rawSpecialties === 'object'
      ? (rawSpecialties as ProfileSpecialtiesSelection)
      : EMPTY_PROFILE_SPECIALTIES;

  return email
    ? { uid, phone, email, specialties }
    : { uid, phone, specialties };
}

export function formatSessionPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('20') ? `+${digits}` : `+20 ${digits}`;
}

export function sessionDisplayName(session: UserSession): string {
  return session.email || session.phone || session.uid;
}
