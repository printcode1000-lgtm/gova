import type { ProfileContactsData } from '../entities/profile-contacts.entity';

export function mergePrimaryContacts(
  primary: { phone: string; email?: string | null },
  contacts: ProfileContactsData,
): ProfileContactsData {
  const phone = primary.phone.replace(/\D/g, '');
  const email = primary.email?.trim() ?? '';
  const comparableEmail = email.toLowerCase();
  const additionalPhones = contacts.phones.filter(
    (item) =>
      item.id !== 'primary-whatsapp' &&
      item.number.replace(/\D/g, '') !== phone,
  );
  const additionalEmails = contacts.emails.filter(
    (item) =>
      item.id !== 'primary' &&
      (!comparableEmail || item.email.trim().toLowerCase() !== comparableEmail),
  );

  return {
    ...contacts,
    phones: [
      { id: 'primary-whatsapp', number: primary.phone, type: 'whatsapp' },
      ...additionalPhones,
    ],
    emails: email
      ? [{ id: 'primary', email, isPrimary: true }, ...additionalEmails]
      : additionalEmails,
  };
}
