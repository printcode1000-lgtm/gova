"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/shared/utils";

import { CLOUD_ACCOUNTS_COPY } from "./cloud-accounts-copy";
import type { CloudAccountRouteGroup, GovaBoundaryFacts } from "./cloud-accounts-facts.types";

const copy = CLOUD_ACCOUNTS_COPY.vercel;

/**
 * The repository-root deployment as one more group: the routes its build keeps,
 * then the `/api` compatibility boundary that redirects everything else — so the
 * account that owns no `ROUTE_OWNERSHIP` entry still shows what it answers.
 */
function boundaryGroup(boundary: GovaBoundaryFacts): CloudAccountRouteGroup {
  return {
    owner: boundary.project,
    project: boundary.project,
    patterns: [
      ...boundary.keptRoutes.map((route) => ({
        pattern: route.pattern,
        methods: route.methods,
        description: copy.keptRouteDescription(boundary),
      })),
      {
        pattern: boundary.boundaryMatcher,
        methods: boundary.boundaryMethods,
        description: copy.boundaryDescription(boundary),
      },
    ],
  };
}

/**
 * Which account answers which request, as a collapsible list per account.
 *
 * After the cutover a request's destination is chosen per route and method, so
 * "where does this call go?" stopped being answerable by reading one folder.
 * The groups come from `ROUTE_OWNERSHIP` — the same registry the client router
 * uses — plus the frontend deployment's kept routes and redirect boundary, all
 * derived on the server, so the page cannot disagree with where a request lands.
 */
export function CloudAccountRoutesSection({
  id,
  groups: ownedGroups,
  boundary,
}: {
  id?: string;
  groups: readonly CloudAccountRouteGroup[];
  boundary: GovaBoundaryFacts | null;
}) {
  const [openOwner, setOpenOwner] = React.useState<string | null>(null);
  const groups = boundary ? [...ownedGroups, boundaryGroup(boundary)] : ownedGroups;

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
                {copy.routeCount(group.patterns.length)}
              </span>
              <ChevronDown
                aria-hidden
                className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
              />
            </button>

            {open && (
              <div id={panelId} className="overflow-x-auto border-t p-3">
                <table className="min-w-[720px] w-full text-xs [&_td]:break-words">
                  <thead>
                    <tr>
                      {copy.routeHeaders.map((header) => (
                        <th key={header} className="p-1 text-start font-medium text-on-surface-variant">
                          {header}
                        </th>
                      ))}
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
                        <td className="p-1">{entry.description}</td>
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
