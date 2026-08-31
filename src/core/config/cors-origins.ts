export function getCorsOrigins(): string[] {
  const raw = process.env.ASOL_CORS_ORIGINS;
  if (!raw) return [];
  return raw.split(',').map((entry) => entry.trim()).filter(Boolean);
}
