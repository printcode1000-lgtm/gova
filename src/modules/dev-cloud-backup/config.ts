export const DEV_CLOUD_BACKUP_ROUTE = "/super-admin/dev-cloud-backup";

export const DEV_CLOUD_BACKUP_API = {
  list: "/api/super-admin/dev-cloud-backup",
  create: "/api/super-admin/dev-cloud-backup/backups/create",
  download: "/api/super-admin/dev-cloud-backup/backups/download",
  inspect: "/api/super-admin/dev-cloud-backup/backups/inspect",
  compare: "/api/super-admin/dev-cloud-backup/backups/compare",
  updateFromCloud: "/api/super-admin/dev-cloud-backup/backups/update-from-cloud",
  restore: "/api/super-admin/dev-cloud-backup/backups/restore",
} as const;
