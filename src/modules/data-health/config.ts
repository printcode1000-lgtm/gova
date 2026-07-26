export const DATA_HEALTH_ROUTE = "/super-admin/data-health";

export const DATA_HEALTH_API = {
  scan: "/api/super-admin/data-health",
  plan: "/api/super-admin/data-health/plan",
  cleanup: "/api/super-admin/data-health/cleanup",
  history: "/api/super-admin/data-health/history",
  schema: "/api/super-admin/data-health/schema",
  quarantineDelete: "/api/super-admin/data-health/quarantine/delete",
  quarantineRelease: "/api/super-admin/data-health/quarantine/release",
} as const;
