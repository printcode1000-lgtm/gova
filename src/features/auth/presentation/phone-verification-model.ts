export function formatPhoneDisplay(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '+20';
  if (digits.length <= 2) return `+20 ${digits}`;
  if (digits.length <= 5) return `+20 ${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `+20 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  return `+20 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
}

export function canSendPhoneOtp(phone: string) {
  return phone.replace(/\D/g, '').length === 11;
}
