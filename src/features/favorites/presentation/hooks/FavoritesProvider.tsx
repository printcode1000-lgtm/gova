"use client";

import * as React from "react";

import { useSession } from "@/features/auth/ui";
import { followApiService } from "@/features/follow";

import {
  favoriteKey,
  type FavoriteCollection,
  type FavoriteItemInput,
  type FavoriteTargetType,
} from "../../domain/favorite.entity";
import {
  addFavorite,
  removeFavorite,
  restoreFavorite,
} from "../../application/services/favorite-collection";
import { favoriteStorage } from "../../application/services/favorite-storage";
import { reportPreAuthFailure } from "@/features/system-logs";
import { FavoritesContext, type FavoritesContextValue } from "./favorites-context";
import { FavoriteNoticeToast, type FavoriteNotice } from "./favorite-notice-toast";

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { session, isLoading: isSessionLoading } = useSession();
  const [collection, setCollection] = React.useState<FavoriteCollection>(() =>
    favoriteStorage.empty(),
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [notice, setNotice] = React.useState<FavoriteNotice | null>(null);
  const collectionRef = React.useRef(collection);
  const scopeRef = React.useRef(favoriteStorage.guestScope);
  const writeQueueRef = React.useRef(Promise.resolve());
  const sessionUidRef = React.useRef(session?.uid);

  React.useEffect(() => {
    sessionUidRef.current = session?.uid;
  }, [session?.uid]);

  const publish = React.useCallback((next: FavoriteCollection) => {
    collectionRef.current = next;
    setCollection(next);
  }, []);

  React.useEffect(() => {
    if (isSessionLoading) return;
    let active = true;
    setIsLoading(true);

    void (async () => {
      try {
        const scope = session?.uid
          ? favoriteStorage.userScope(session.uid)
          : favoriteStorage.guestScope;
        scopeRef.current = scope;
        const next = session?.uid
          ? await favoriteStorage.mergeGuestIntoUser(session.uid)
          : await favoriteStorage.read(scope);
        if (active) publish(next);
      } catch (error) {
        reportPreAuthFailure("load-local-favorites", error);
        if (active) publish(favoriteStorage.empty());
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isSessionLoading, publish, session?.uid]);

  React.useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const persist = React.useCallback(async (next: FavoriteCollection) => {
    const scope = scopeRef.current;
    writeQueueRef.current = writeQueueRef.current
      .catch((error) => {
        reportPreAuthFailure("retry-local-favorites-write", error, {}, "warn");
      })
      .then(() => favoriteStorage.write(scope, next));
    await writeQueueRef.current;
  }, []);

  const syncSellerFollow = React.useCallback(
    (input: FavoriteItemInput, isRemoving: boolean) => {
      if (input.type !== "seller") return;
      const viewerUid = sessionUidRef.current;
      if (!viewerUid || viewerUid === input.ownerUid) return;
      const mutation = {
        viewerUid,
        targetType: "store" as const,
        targetId: input.targetId,
        targetOwnerUid: input.ownerUid,
      };
      const request = isRemoving
        ? followApiService.unfollow(mutation)
        : followApiService.follow(mutation);
      void request.catch((error) => {
        reportPreAuthFailure("sync-favorite-follow", error, {}, "warn");
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
        reportPreAuthFailure("save-local-favorites", error);
        publish(previous);
        setNotice({ message: "تعذر حفظ التغيير محليًا" });
      }
    },
    [persist, publish, syncSellerFollow],
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
      reportPreAuthFailure("restore-local-favorite", error);
      publish(previous);
      setNotice({ message: "تعذر استعادة العنصر" });
    }
  }, [notice?.removed, persist, publish, syncSellerFollow]);

  const value = React.useMemo<FavoritesContextValue>(() => {
    const productCount = collection.items.filter((item) => item.type === "product").length;
    const sellerCount = collection.items.filter((item) => item.type === "seller").length;
    return {
      items: collection.items,
      isLoading: isLoading || isSessionLoading,
      totalCount: collection.items.length,
      productCount,
      sellerCount,
      isFavorite: (type, targetId) =>
        collection.items.some((item) => item.key === favoriteKey(type, targetId)),
      toggleFavorite,
      removeFavorite: removeByTarget,
    };
  }, [collection.items, isLoading, isSessionLoading, removeByTarget, toggleFavorite]);

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
