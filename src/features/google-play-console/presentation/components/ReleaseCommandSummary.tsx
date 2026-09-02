"use client";

import type { BuildCommandCatalogEntry } from "@asol/release-core/console";

/**
 * What the operator is about to run: its title, its documentation, the exact
 * npm script, and how long it usually takes.
 *
 * Split out of `ReleaseCommandConfirmDialog` for the same reason as the
 * blockers — the file passed the presentation contract's 200-line cap — and it
 * separates cleanly because this half only reads the catalog entry.
 */
export function ReleaseCommandSummary(props: {
  title: string;
  command: BuildCommandCatalogEntry | undefined;
  t: (key: string) => string;
}) {
  const { title, command, t } = props;
  return (
      <section
        id='google-play-console-presentation-components-releasecommandsummary-section-1-aspnza'
        className="space-y-2 rounded-lg border bg-surface-container-low p-3"
      >
        <p id='google-play-console-presentation-components-releasecommandsummary-text-2-pnnzs4' className="text-base font-bold">
          {title}
        </p>
        {command ? (
          <>
            <p
              id='google-play-console-presentation-components-releasecommandsummary-text-3-vquhqw'
              className="leading-6 text-on-surface-variant"
            >
              {t(command.documentation.descriptionKey)}
            </p>
            <div
              id='google-play-console-presentation-components-releasecommandsummary-div-4-h7pwfm'
              className="flex flex-wrap items-center gap-2 text-xs"
            >
              <code id="google-play-console-presentation-components-releasecommandsummary-code-5-uzke6l" className="rounded-md bg-muted px-2 py-1" dir="ltr">
                npm run {command.script}
              </code>
              <span
                id='google-play-console-presentation-components-releasecommandsummary-text-6-y3sop1'
                className="rounded-md bg-muted px-2 py-1"
              >
                {t("releaseConsole.confirmRun.estimatedDuration")}: {command.estimatedDuration}
              </span>
            </div>
          </>
        ) : null}
      </section>
  );
}
