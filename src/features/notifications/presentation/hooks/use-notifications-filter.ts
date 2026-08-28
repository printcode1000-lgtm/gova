"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { centerElementInScrollParent } from "@/shared/ui/snap-strip-scroll";

import {
  readStoredNotificationsFilter,
  writeStoredNotificationsFilter,
} from "../../application/notifications-filter-storage";
import {
  filterFromQuery,
  type NotificationFilter,
} from "../notifications-page-model";

interface UseNotificationsFilterReturn {
  filter: NotificationFilter;
  tabsScrollRef: React.RefObject<HTMLDivElement | null>;
  filterButtonRefs: React.RefObject<
    Partial<Record<NotificationFilter, HTMLButtonElement | null>>
  >;
  selectFilter: (nextFilter: NotificationFilter) => void;
}

/**
 * Owns the notifications page's selected filter tab: its restoration order,
 * its persistence, and keeping the selected tab centered in the strip so the
 * active-tab wave animation is never scrolled out of view.
 *
 * Restoration precedence is `?filter=` → the stored per-user tab → `all`.
 */
export function useNotificationsFilter(
  userId: string | undefined,
): UseNotificationsFilterReturn {
  const router = useRouter();
  // The notifications feature may not depend on the page-snapshot feature, so
  // restoration is carried entirely by the key-stable storage record below.
  const [filter, setFilter] = React.useState<NotificationFilter>("all");
  const tabsScrollRef = React.useRef<HTMLDivElement>(null);
  const filterButtonRefs = React.useRef<
    Partial<Record<NotificationFilter, HTMLButtonElement | null>>
  >({});
  const filterRef = React.useRef<NotificationFilter>(filter);
  filterRef.current = filter;
  const requestedFilterRef = React.useRef<string | null>(null);
  const restoredRef = React.useRef(false);

  // An explicit `?filter=` always wins and is resolved synchronously on mount.
  React.useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("filter");
    requestedFilterRef.current = requested;
    if (!requested) return;
    restoredRef.current = true;
    const nextFilter = filterFromQuery(requested);
    filterRef.current = nextFilter;
    setFilter(nextFilter);
  }, [setFilter]);

  // Otherwise reopen on the tab the user left. A gesture that lands before the
  // read resolves is never overridden.
  React.useEffect(() => {
    if (!userId || restoredRef.current || requestedFilterRef.current) return;
    let cancelled = false;
    void readStoredNotificationsFilter(userId).then((stored) => {
      if (cancelled) return;
      restoredRef.current = true;
      if (!stored) return;
      const nextFilter = filterFromQuery(stored);
      if (nextFilter === filterRef.current) return;
      filterRef.current = nextFilter;
      setFilter(nextFilter);
    });
    return () => {
      cancelled = true;
    };
  }, [setFilter, userId]);

  React.useEffect(() => {
    if (!restoredRef.current) return;
    void writeStoredNotificationsFilter(userId, filter);
  }, [filter, userId]);

  // The selected tab carries the wave animation, so it must stay on screen
  // after a restore, a locale change, or a selection near the strip edges.
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      centerElementInScrollParent(filterButtonRefs.current[filter] ?? null);
    });
    return () => cancelAnimationFrame(frame);
  }, [filter]);

  const selectFilter = React.useCallback(
    (nextFilter: NotificationFilter) => {
      filterRef.current = nextFilter;
      setFilter(nextFilter);
      centerElementInScrollParent(filterButtonRefs.current[nextFilter] ?? null);
      const params = new URLSearchParams(window.location.search);
      params.set("filter", nextFilter);
      params.delete("focus");
      requestedFilterRef.current = nextFilter;
      router.replace(`/notifications?${params.toString()}`, { scroll: false });
    },
    [router, setFilter],
  );

  return { filter, tabsScrollRef, filterButtonRefs, selectFilter };
}
