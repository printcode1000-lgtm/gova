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
        id='google-play-console-presentation-components-otareleasereports-section-1-vtlx60'
        className="rounded-md border bg-surface p-4"
      >
        <h2 id='google-play-console-presentation-components-otareleasereports-heading-2-xpbp0s' className="mb-3 font-semibold">
          {props.title}
        </h2>
        <div
          id='google-play-console-presentation-components-otareleasereports-div-3-8mip6u'
          className="max-h-96 overflow-auto rounded-md border"
        >
          <table
            id='google-play-console-presentation-components-otareleasereports-table-4-6rcusv'
            className="w-full min-w-[42rem] text-sm"
            dir="ltr"
          >
            <tbody id='google-play-console-presentation-components-otareleasereports-tbody-5-djy7ok'>
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
        id='google-play-console-presentation-components-otareleasereports-section-6-gmczgm'
        className="rounded-md border bg-surface p-4"
      >
        <h2 id='google-play-console-presentation-components-otareleasereports-heading-7-vvxsuz' className="mb-3 font-semibold">
          {props.title}
        </h2>
        <div id='google-play-console-presentation-components-otareleasereports-div-8-gkseqb' className="overflow-auto rounded-md border">
          <table
            id='google-play-console-presentation-components-otareleasereports-table-9-2ffc2x'
            className="w-full min-w-[42rem] text-sm"
            dir="ltr"
          >
            <tbody id='google-play-console-presentation-components-otareleasereports-tbody-10-h9sfcc'>
              {props.adoption.map((item) => (
                <tr key={item.version} className="border-t">
                  <td className="p-2 font-semibold">{item.version}</td>
                  <td className="p-2">
                    <pre>{JSON.stringify(item.outcomes, null, 2)}</pre>
                  </td>
                </tr>
              ))}
              {!props.adoption.length ? (
                <tr id='google-play-console-presentation-components-otareleasereports-tr-11-gdouhk'>
                  <td id='google-play-console-presentation-components-otareleasereports-td-12-3xxhma' className="p-3" colSpan={2}>
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
      <div id='google-play-console-presentation-components-otareleasereports-div-13-gjyzgk' className="grid gap-4 lg:grid-cols-2">
        <section
          id='google-play-console-presentation-components-otareleasereports-section-14-3exp4x'
          className="rounded-md border bg-surface p-4"
        >
          <h2 id='google-play-console-presentation-components-otareleasereports-heading-15-nfvrw6' className="mb-3 font-semibold">
            {props.historyTitle}
          </h2>
          <div id='google-play-console-presentation-components-otareleasereports-div-16-0jffh4' className="space-y-2">
            {props.history.map((item) => (
              <div key={item.releaseId} className="rounded-md border p-2 text-sm">
                <strong dir="ltr">{item.version}</strong>
                <span className="ms-2 text-on-surface-variant">{String(item.approved)}</span>
              </div>
            ))}
          </div>
        </section>
        <section
          id='google-play-console-presentation-components-otareleasereports-section-17-szvduq'
          className="rounded-md border bg-surface p-4"
        >
          <h2 id='google-play-console-presentation-components-otareleasereports-heading-18-cdue2b' className="mb-3 font-semibold">
            {props.auditTitle}
          </h2>
          <div id='google-play-console-presentation-components-otareleasereports-div-19-7dhzzy' className="max-h-80 space-y-2 overflow-auto">
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
