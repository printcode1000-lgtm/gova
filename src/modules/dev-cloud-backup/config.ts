export const DEV_CLOUD_BACKUP_ROUTE = "/super-admin/dev-cloud-backup";

export const DEV_CLOUD_BACKUP_API = {
  list: "/api/super-admin/dev-cloud-backup",
  create: "/api/super-admin/dev-cloud-backup/backups/create",
  download: "/api/super-admin/dev-cloud-backup/backups/download",
  compareSaved: "/api/super-admin/dev-cloud-backup/backups/compare-saved",
  inspectSaved: "/api/super-admin/dev-cloud-backup/backups/inspect-saved",
  updateSaved: "/api/super-admin/dev-cloud-backup/backups/update-saved",
  deleteSaved: "/api/super-admin/dev-cloud-backup/backups/delete",
} as const;
