"use client";

import * as React from "react";

import { useSession } from "@/features/auth/components/SessionProvider";

import {
  favoriteKey,
  type FavoriteCollection,
  type FavoriteItem,
  type FavoriteItemInput,
  type FavoriteTargetType,
} from "../entities/favorite.entity";
import {
  addFavorite,
  removeFavorite,
  restoreFavorite,
} from "../services/favorite-collection";
import { favoriteStorage } from "../services/favorite-storage";

interface FavoritesContextValue {
  items: FavoriteItem[];
  isLoading: boolean;
  totalCount: number;
  productCount: number;
  sellerCount: number;
  isFavorite: (type: FavoriteTargetType, targetId: string) => boolean;
  toggleFavorite: (input: FavoriteItemInput) => Promise<void>;
  removeFavorite: (type: FavoriteTargetType, targetId: string) => Promise<void>;
}

interface FavoriteNotice {
  message: string;
  removed?: FavoriteItem;
}

const FavoritesContext = React.createContext<FavoritesContextValue | null>(null);

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
        console.error("[Favorites] Failed to load local favorites.", error);
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
      .catch(() => undefined)
      .then(() => favoriteStorage.write(scope, next));
    await writeQueueRef.current;
  }, []);

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
      try {
        await persist(next);
      } catch (error) {
        console.error("[Favorites] Failed to save local favorites.", error);
        publish(previous);
        setNotice({ message: "تعذر حفظ التغيير محليًا" });
      }
    },
    [persist, publish],
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
    try {
      await persist(next);
    } catch (error) {
      console.error("[Favorites] Failed to restore local favorite.", error);
      publish(previous);
      setNotice({ message: "تعذر استعادة العنصر" });
    }
  }, [notice?.removed, persist, publish]);

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
      {notice ? (
        <div
          className="fixed inset-x-4 z-[70] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl bg-inverse-surface px-4 py-3 text-sm text-inverse-on-surface shadow-xl"
          style={{
            bottom:
              "calc(var(--asol-bottom-nav-space, calc(5rem + env(safe-area-inset-bottom, 0px))) + 0.75rem)",
          }}
        >
          <span>{notice.message}</span>
          {notice.removed ? (
            <button
              type="button"
              className="shrink-0 font-bold text-inverse-primary"
              onClick={() => void undoRemoval()}
            >
              تراجع
            </button>
          ) : null}
        </div>
      ) : null}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const value = React.useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites must be used within FavoritesProvider");
  return value;
}
