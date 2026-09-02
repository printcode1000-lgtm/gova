"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/shared/utils";

import { cloudAccountRouteGroups } from "./cloud-account-routes";

/**
 * Which account answers which request, as a collapsible list per account.
 *
 * After the cutover a request's destination is chosen per route and method, so
 * "where does this call go?" stopped being answerable by reading one folder.
 * This is that answer on the page the operator already opens to see the
 * accounts.
 *
 * The data comes from `ROUTE_OWNERSHIP`, the same pure registry the client
 * router and the gova compatibility boundary use, so the page cannot disagree
 * with where a request actually lands — and it renders identically in the web
 * app, a static export, and a native bundle because nothing is fetched.
 */
export function CloudAccountRoutesSection({ id }: { id?: string }) {
  const groups = React.useMemo(() => cloudAccountRouteGroups(), []);
  const [openOwner, setOpenOwner] = React.useState<string | null>(null);

  return (
    <div id={id} className="mt-4 space-y-2">
      {groups.map((group) => {
        const open = openOwner === group.owner;
        const panelId = `cloud-account-routes-${group.owner}`;
        return (
          <div key={group.owner} className="overflow-hidden rounded-lg border">
            <button
              type="button"
              onClick={() => setOpenOwner(open ? null : group.owner)}
              aria-expanded={open}
              aria-controls={panelId}
              className="flex w-full items-center gap-2 bg-surface p-3 text-start text-sm font-semibold text-on-surface active:bg-surface-variant focus-visible:outline focus-visible:outline-2"
            >
              <span dir="ltr" className="min-w-0 flex-1">
                {group.project}
              </span>
              <span className="text-xs font-normal text-on-surface-variant">
                {group.patterns.length} مسار
              </span>
              <ChevronDown
                aria-hidden
                className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
              />
            </button>

            {open && (
              <div id={panelId} className="border-t p-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="p-1 text-start font-medium text-on-surface-variant">المسار</th>
                      <th className="p-1 text-start font-medium text-on-surface-variant">الطرق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.patterns.map((entry) => (
                      <tr key={entry.pattern} className="border-t align-top">
                        <td className="p-1" dir="ltr">
                          {entry.pattern}
                        </td>
                        <td className="p-1" dir="ltr">
                          {entry.methods.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
