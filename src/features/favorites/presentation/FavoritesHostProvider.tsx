"use client";

import * as React from "react";

import { useSession } from "@/features/auth/ui";
import { followApiService } from "@/features/follow";
import { reportPreAuthFailure } from "@/features/system-logs";
import {
  FavoritesProvider,
  type FavoriteSellerFollowChange,
} from "@asol/favorites-core/ui";

/**
 * Application wiring for `@asol/favorites-core`. The package owns favorite
 * state; this host supplies the viewer, the public follow record sync, and
 * failure reporting.
 */
export function FavoritesHostProvider({ children }: { children: React.ReactNode }) {
  const { session, isLoading: isSessionLoading } = useSession();

  const handleSellerFollowChange = React.useCallback(
    (change: FavoriteSellerFollowChange) => {
      const mutation = {
        viewerUid: change.viewerUid,
        targetType: "store" as const,
        targetId: change.targetId,
        targetOwnerUid: change.targetOwnerUid,
      };
      const request = change.isRemoving
        ? followApiService.unfollow(mutation)
        : followApiService.follow(mutation);
      void request.catch((error) => {
        reportPreAuthFailure("sync-favorite-follow", error, {}, "warn");
      });
    },
    [],
  );

  const handleFailure = React.useCallback(
    (scope: string, error: unknown, severity: "error" | "warn") => {
      reportPreAuthFailure(scope, error, {}, severity);
    },
    [],
  );

  return (
    <FavoritesProvider
      viewerUid={session?.uid ?? null}
      isViewerLoading={isSessionLoading}
      onSellerFollowChange={handleSellerFollowChange}
      onFailure={handleFailure}
    >
      {children}
    </FavoritesProvider>
  );
}
