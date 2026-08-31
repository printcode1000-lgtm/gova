"use client";

import type { OtaAdminDashboard } from "@asol/ota-core";

/**
 * The read-only halves of the OTA releases tab.
 *
 * Split out of `OtaReleasesTab` because that file had grown past the
 * presentation contract's 200-line cap once its long lines were wrapped. These
 * three sections share one responsibility — reporting what a release contains
 * and how it landed — and none of them acts on anything, which is what makes
 * them separable from the tab's controls.
 */
export function OtaReleaseFiles(props: { files: Record<string, { size: number; sha256: string }>; title: string }) {
  return (
      <section
        id="google-play-console.tabs.ota-releases-tab.section.3"
        className="rounded-md border bg-surface p-4"
      >
        <h2 id="google-play-console.tabs.ota-releases-tab.h2" className="mb-3 font-semibold">
          {props.title}
        </h2>
        <div
          id="google-play-console.tabs.ota-releases-tab.div.9"
          className="max-h-96 overflow-auto rounded-md border"
        >
          <table
            id="google-play-console.tabs.ota-releases-tab.table"
            className="w-full min-w-[42rem] text-sm"
            dir="ltr"
          >
            <tbody id="google-play-console.tabs.ota-releases-tab.tbody">
              {Object.entries(props.files).map(([name, file]) => (
                <tr key={name} className="border-t">
                  <td className="p-2 font-mono text-xs">{name}</td>
                  <td className="p-2">{file.size}</td>
                  <td className="max-w-64 truncate p-2">{file.sha256}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
  );
}

export function OtaAdoption(props: {
  adoption: OtaAdminDashboard["adoption"];
  title: string;
  emptyText: string;
}) {
  return (
      <section
        id="google-play-console.tabs.ota-releases-tab.section.4"
        className="rounded-md border bg-surface p-4"
      >
        <h2 id="google-play-console.tabs.ota-releases-tab.h2.2" className="mb-3 font-semibold">
          {props.title}
        </h2>
        <div id="google-play-console.tabs.ota-releases-tab.div.10" className="overflow-auto rounded-md border">
          <table
            id="google-play-console.tabs.ota-releases-tab.table.2"
            className="w-full min-w-[42rem] text-sm"
            dir="ltr"
          >
            <tbody id="google-play-console.tabs.ota-releases-tab.tbody.2">
              {props.adoption.map((item) => (
                <tr key={item.version} className="border-t">
                  <td className="p-2 font-semibold">{item.version}</td>
                  <td className="p-2">
                    <pre>{JSON.stringify(item.outcomes, null, 2)}</pre>
                  </td>
                </tr>
              ))}
              {!props.adoption.length ? (
                <tr id="google-play-console.tabs.ota-releases-tab.tr">
                  <td id="google-play-console.tabs.ota-releases-tab.td" className="p-3" colSpan={2}>
                    {props.emptyText}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
  );
}

export function OtaHistoryAndAudit(props: {
  history: OtaAdminDashboard["history"];
  audit: OtaAdminDashboard["audit"];
  historyTitle: string;
  auditTitle: string;
  auditActionLabel: (action: string) => string;
}) {
  return (
      <div id="google-play-console.tabs.ota-releases-tab.div.11" className="grid gap-4 lg:grid-cols-2">
        <section
          id="google-play-console.tabs.ota-releases-tab.section.5"
          className="rounded-md border bg-surface p-4"
        >
          <h2 id="google-play-console.tabs.ota-releases-tab.h2.3" className="mb-3 font-semibold">
            {props.historyTitle}
          </h2>
          <div id="google-play-console.tabs.ota-releases-tab.div.12" className="space-y-2">
            {props.history.map((item) => (
              <div key={item.releaseId} className="rounded-md border p-2 text-sm">
                <strong dir="ltr">{item.version}</strong>
                <span className="ms-2 text-on-surface-variant">{String(item.approved)}</span>
              </div>
            ))}
          </div>
        </section>
        <section
          id="google-play-console.tabs.ota-releases-tab.section.6"
          className="rounded-md border bg-surface p-4"
        >
          <h2 id="google-play-console.tabs.ota-releases-tab.h2.4" className="mb-3 font-semibold">
            {props.auditTitle}
          </h2>
          <div id="google-play-console.tabs.ota-releases-tab.div.13" className="max-h-80 space-y-2 overflow-auto">
            {props.audit.map((item) => (
              <div key={item.id} className="rounded-md border p-2 text-sm">
                <strong>{props.auditActionLabel(item.action)}</strong>
                <div className="text-xs text-on-surface-variant" dir="ltr">
                  {item.version} / {item.actorUid}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
  );
}
