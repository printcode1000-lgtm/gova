export const DATA_HEALTH_ROUTE = "/super-admin/data-health";

export const DATA_HEALTH_API = {
  scan: "/api/super-admin/data-health",
  plan: "/api/super-admin/data-health/plan",
  cleanup: "/api/super-admin/data-health/cleanup",
  history: "/api/super-admin/data-health/history",
  historyRunsClear: "/api/super-admin/data-health/history/runs/clear",
  historyAuditClear: "/api/super-admin/data-health/history/audit/clear",
  schema: "/api/super-admin/data-health/schema",
  orderPurgePlan: "/api/super-admin/data-health/orders/plan",
  orderPurge: "/api/super-admin/data-health/orders/purge",
  orderPurgeRetryImages: "/api/super-admin/data-health/orders/retry-images",
  quarantineDelete: "/api/super-admin/data-health/quarantine/delete",
  quarantineRelease: "/api/super-admin/data-health/quarantine/release",
  quarantineClear: "/api/super-admin/data-health/quarantine/clear",
} as const;
