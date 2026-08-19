/** Client-safe helper — no Node.js dependencies. */
export function getSchemaSyncReportPublicUrl(basePath = ''): string {
  const normalized = basePath.replace(/\/$/, '');
  return `${normalized}/sync_data/schema-sync-report.json`;
}
