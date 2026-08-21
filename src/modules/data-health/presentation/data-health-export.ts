import type { DataHealthReport } from "@asol/data-health-core";

export function exportDataHealthReport(
  report: DataHealthReport,
  format: "json" | "csv",
) {
  const content =
    format === "json"
      ? JSON.stringify(report, null, 2)
      : [
          [
            "severity",
            "category",
            "database",
            "table",
            "recordId",
            "ownerUid",
            "state",
            "action",
            "title",
            "details",
          ],
          ...report.issues.map((issue) => [
            issue.severity,
            issue.category,
            issue.database,
            issue.table,
            issue.recordId,
            issue.ownerUid,
            issue.state,
            issue.cleanupAction,
            issue.title,
            issue.details,
          ]),
        ]
          .map((row) =>
            row
              .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
              .join(","),
          )
          .join("\n");
  const blob = new Blob([content], {
    type: format === "json" ? "application/json" : "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `data-health-${report.environment}-${report.runId}.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}
