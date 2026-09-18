import * as React from "react";

import type { RichText } from "./cloud-accounts-rich-text";

/** Layout primitives for `/dev/cloud-accounts`. They render what they are given and hold no copy. */

export function RichTextView({ parts }: { parts: RichText }) {
  return (
    <>
      {parts.map((part, index) => {
        if (typeof part === "string") return <React.Fragment key={index}>{part}</React.Fragment>;
        if ("ltr" in part) return <span key={index} dir="ltr">{part.ltr}</span>;
        if ("code" in part) return <code key={index} dir="ltr">{part.code}</code>;
        return <strong key={index}>{part.strong}</strong>;
      })}
    </>
  );
}

export function SectionTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-8 text-lg font-semibold text-on-surface sm:text-xl">
      {children}
    </h2>
  );
}

export function SubTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="mt-5 text-base font-semibold text-on-surface">
      {children}
    </h3>
  );
}

export function Note({ id, parts }: { id?: string; parts: RichText }) {
  return (
    <p id={id} className="mt-2 text-sm leading-7 text-on-surface-variant">
      <RichTextView parts={parts} />
    </p>
  );
}

export type FactTableCell = {
  readonly key: string;
  readonly content: React.ReactNode;
  readonly ltr?: boolean;
};

export type FactTableRow = {
  readonly key: string;
  readonly cells: readonly FactTableCell[];
};

/**
 * A scrollable fact table.
 *
 * `min-w` sets the width the table is allowed to scroll to; it does not stop cells
 * from pushing past it. Account ids, S3 endpoints and r2.dev URLs are single
 * unbroken tokens of 30–50 characters, so without `break-words` every table here
 * laid itself out around two thousand pixels wide. Wrapping them keeps each table
 * at its declared width, and the scroll the short nudge it was meant to be.
 */
export function FactTable({
  id,
  headers,
  rows,
}: {
  id?: string;
  headers: readonly string[];
  rows: readonly FactTableRow[];
}) {
  return (
    <div id={id} className="mt-3 overflow-x-auto rounded-lg border bg-surface">
      <table
        id={id ? `${id}-table-5-tycyuj` : undefined}
        className="w-full min-w-[520px] text-xs [&_td]:break-words [&_th]:break-words sm:min-w-[640px] sm:text-sm"
      >
        <thead
          id={id ? `${id}-thead-c4a1hd` : undefined}
          className="bg-muted/50 text-xs text-on-surface-variant"
        >
          <tr id={id ? `${id}-header-row-q8m2zt` : undefined}>
            {headers.map((header, index) => (
              <th key={`${index}-${header}`} className="p-2 text-start sm:p-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody id={id ? `${id}-tbody-r7k3wp` : undefined}>
          {rows.map((row) => (
            <tr key={row.key} className="border-t align-top">
              {row.cells.map((cell) => (
                <td key={cell.key} className="p-2 sm:p-3" dir={cell.ltr ? "ltr" : undefined}>
                  {cell.content}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
