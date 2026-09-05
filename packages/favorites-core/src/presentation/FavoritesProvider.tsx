"use client";

import * as React from "react";

import {
  favoriteKey,
  type FavoriteCollection,
  type FavoriteItemInput,
  type FavoriteTargetType,
} from "../domain/favorite.entity";
import {
  addFavorite,
  removeFavorite,
  restoreFavorite,
} from "../application/favorite-collection";
import { favoriteStorage } from "../application/favorite-storage";
import { FavoritesContext, type FavoritesContextValue } from "./favorites-context";
import { FavoriteNoticeToast, type FavoriteNotice } from "./favorite-notice-toast";

/** Public follow record mutation requested for a favorited seller. */
export interface FavoriteSellerFollowChange {
  viewerUid: string;
  targetId: string;
  targetOwnerUid: string;
  isRemoving: boolean;
}

export interface FavoritesProviderProps {
  children: React.ReactNode;
  /** Signed-in viewer uid, or null/undefined for a guest scope. */
  viewerUid?: string | null;
  /** True while the host is still resolving the viewer. */
  isViewerLoading?: boolean;
  /**
   * Host-owned sync of the public Follow System record for seller favorites.
   * The package never knows the follow transport.
   */
  onSellerFollowChange?: (change: FavoriteSellerFollowChange) => void;
  /** Host-owned failure reporting. The package never knows the log transport. */
  onFailure?: (scope: string, error: unknown, severity: "error" | "warn") => void;
}

export function FavoritesProvider({
  children,
  viewerUid = null,
  isViewerLoading = false,
  onSellerFollowChange,
  onFailure,
}: FavoritesProviderProps) {
  const [collection, setCollection] = React.useState<FavoriteCollection>(() =>
    favoriteStorage.empty(),
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [notice, setNotice] = React.useState<FavoriteNotice | null>(null);
  const collectionRef = React.useRef(collection);
  const scopeRef = React.useRef(favoriteStorage.guestScope);
  const writeQueueRef = React.useRef(Promise.resolve());
  const viewerUidRef = React.useRef(viewerUid);
  const failureRef = React.useRef(onFailure);
  const followChangeRef = React.useRef(onSellerFollowChange);

  React.useEffect(() => {
    viewerUidRef.current = viewerUid;
  }, [viewerUid]);

  React.useEffect(() => {
    failureRef.current = onFailure;
  }, [onFailure]);

  React.useEffect(() => {
    followChangeRef.current = onSellerFollowChange;
  }, [onSellerFollowChange]);

  const report = React.useCallback(
    (scope: string, error: unknown, severity: "error" | "warn" = "error") => {
      failureRef.current?.(scope, error, severity);
    },
    [],
  );

  const publish = React.useCallback((next: FavoriteCollection) => {
    collectionRef.current = next;
    setCollection(next);
  }, []);

  React.useEffect(() => {
    if (isViewerLoading) return;
    let active = true;
    setIsLoading(true);

    void (async () => {
      try {
        const scope = viewerUid
          ? favoriteStorage.userScope(viewerUid)
          : favoriteStorage.guestScope;
        scopeRef.current = scope;
        const next = viewerUid
          ? await favoriteStorage.mergeGuestIntoUser(viewerUid)
          : await favoriteStorage.read(scope);
        if (active) publish(next);
      } catch (error) {
        report("load-local-favorites", error);
        if (active) publish(favoriteStorage.empty());
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isViewerLoading, publish, report, viewerUid]);

  React.useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const persist = React.useCallback(
    async (next: FavoriteCollection) => {
      const scope = scopeRef.current;
      writeQueueRef.current = writeQueueRef.current
        .catch((error) => {
          report("retry-local-favorites-write", error, "warn");
        })
        .then(() => favoriteStorage.write(scope, next));
      await writeQueueRef.current;
    },
    [report],
  );

  const syncSellerFollow = React.useCallback(
    (input: FavoriteItemInput, isRemoving: boolean) => {
      if (input.type !== "seller") return;
      const currentViewerUid = viewerUidRef.current;
      if (!currentViewerUid || currentViewerUid === input.ownerUid) return;
      followChangeRef.current?.({
        viewerUid: currentViewerUid,
        targetId: input.targetId,
        targetOwnerUid: input.ownerUid,
        isRemoving,
      });
    },
    [],
  );

  const toggleFavorite = React.useCallback(
    async (input: FavoriteItemInput) => {
      const key = favoriteKey(input.type, input.targetId);
      const previous = collectionRef.current;
      const existing = previous.items.find((item) => item.key === key);
      const next = existing
        ? removeFavorite(previous, key)
        : addFavorite(previous, input);
      publish(next);
      setNotice(
        existing
          ? { message: "تمت الإزالة من المفضلة", removed: existing }
          : { message: "تمت الإضافة إلى المفضلة" },
      );
      syncSellerFollow(input, Boolean(existing));
      try {
        await persist(next);
      } catch (error) {
        report("save-local-favorites", error);
        publish(previous);
        setNotice({ message: "تعذر حفظ التغيير محليًا" });
      }
    },
    [persist, publish, report, syncSellerFollow],
  );

  const removeByTarget = React.useCallback(
    async (type: FavoriteTargetType, targetId: string) => {
      const key = favoriteKey(type, targetId);
      const existing = collectionRef.current.items.find((item) => item.key === key);
      if (!existing) return;
      await toggleFavorite({
        type: existing.type,
        targetId: existing.targetId,
        ownerUid: existing.ownerUid,
        title: existing.title,
        subtitle: existing.subtitle,
        imageUrl: existing.imageUrl,
        priceText: existing.priceText,
        ratingText: existing.ratingText,
        href: existing.href,
      });
    },
    [toggleFavorite],
  );

  const undoRemoval = React.useCallback(async () => {
    const removed = notice?.removed;
    if (!removed) return;
    const previous = collectionRef.current;
    const next = restoreFavorite(previous, removed);
    publish(next);
    setNotice({ message: "تمت استعادة العنصر" });
    syncSellerFollow(removed, false);
    try {
      await persist(next);
    } catch (error) {
      report("restore-local-favorite", error);
      publish(previous);
      setNotice({ message: "تعذر استعادة العنصر" });
    }
  }, [notice?.removed, persist, publish, report, syncSellerFollow]);

  const value = React.useMemo<FavoritesContextValue>(() => {
    const productCount = collection.items.filter((item) => item.type === "product").length;
    const sellerCount = collection.items.filter((item) => item.type === "seller").length;
    return {
      items: collection.items,
      isLoading: isLoading || isViewerLoading,
      totalCount: collection.items.length,
      productCount,
      sellerCount,
      isFavorite: (type, targetId) =>
        collection.items.some((item) => item.key === favoriteKey(type, targetId)),
      toggleFavorite,
      removeFavorite: removeByTarget,
    };
  }, [collection.items, isLoading, isViewerLoading, removeByTarget, toggleFavorite]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
      {notice ? <FavoriteNoticeToast notice={notice} onUndo={() => void undoRemoval()} /> : null}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const value = React.useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites must be used within FavoritesProvider");
  return value;
}
