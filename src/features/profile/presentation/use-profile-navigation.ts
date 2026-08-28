import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useSnapshotState } from "@/features/page-snapshot";
import { PROFILE_SECTIONS, type ProfileEditTab } from "./profile-page.types";
import {
  readStoredProfileEditTab,
  writeStoredProfileEditTab,
} from "../application/services/profile-edit-tab-storage";

interface UseProfileNavigationProps {
  showEditCard: boolean;
  isLoading: boolean;
  isLoggedIn: boolean;
  userId?: string;
}

interface UseProfileNavigationReturn {
  activeTab: ProfileEditTab;
  carouselHeight: number | undefined;
  animateCarouselHeight: boolean;
  carouselRef: React.RefObject<HTMLDivElement | null>;
  tabsScrollRef: React.RefObject<HTMLDivElement | null>;
  panelRefs: React.RefObject<Record<ProfileEditTab, HTMLDivElement | null>>;
  navButtonRefs: React.RefObject<Record<ProfileEditTab, HTMLButtonElement | null>>;
  activeSectionIndex: number;
  handleCarouselScroll: () => void;
  selectSection: (section: ProfileEditTab) => void;
  resyncScrollToActiveTab: () => void;
  goToAdjacentSection: (offset: -1 | 1) => void;
}

/** Idle window after the last scroll event before a swipe counts as settled. */
const SWIPE_SETTLE_MS = 180;

function emptySectionMap<T>(): Record<ProfileEditTab, T | null> {
  return {
    registration: null,
    specialties: null,
    products: null,
    contact: null,
    store: null,
    workingHours: null,
    fulfillment: null,
    discounts: null,
  };
}

export function useProfileNavigation({
  showEditCard,
  isLoading,
  isLoggedIn,
  userId,
}: UseProfileNavigationProps): UseProfileNavigationReturn {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab =
    requestedTab && PROFILE_SECTIONS.includes(requestedTab as ProfileEditTab)
      ? (requestedTab as ProfileEditTab)
      : "registration";
  const [activeTab, setActiveTab] = useSnapshotState<ProfileEditTab>(
    "profile.edit.activeTab",
    initialTab,
  );
  const resolvedActiveTab = PROFILE_SECTIONS.includes(activeTab)
    ? activeTab
    : "registration";
  const activeTabRef = React.useRef<ProfileEditTab>(resolvedActiveTab);
  activeTabRef.current = resolvedActiveTab;

  const [carouselHeight, setCarouselHeight] = React.useState<number>();
  // A swipe must resize instantly: animating growth would crop the incoming
  // panel for the length of the transition. Only settled changes animate.
  const [animateCarouselHeight, setAnimateCarouselHeight] =
    React.useState(true);
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const tabsScrollRef = React.useRef<HTMLDivElement>(null);
  const panelRefs = React.useRef<Record<ProfileEditTab, HTMLDivElement | null>>(
    emptySectionMap<HTMLDivElement>(),
  );
  const navButtonRefs = React.useRef<
    Record<ProfileEditTab, HTMLButtonElement | null>
  >(emptySectionMap<HTMLButtonElement>());
  const scrollFrameRef = React.useRef<number | null>(null);
  const programmaticScrollTargetRef = React.useRef<ProfileEditTab | null>(null);
  const programmaticScrollClearTimerRef = React.useRef<number | null>(null);
  const appliedRequestedTabRef = React.useRef<string | null>(null);
  const tabRestoredRef = React.useRef(false);
  const isSwipingRef = React.useRef(false);
  const swipeSettleTimerRef = React.useRef<number | null>(null);

  const scrollElementHorizontally = React.useCallback(
    (element: HTMLElement | null) => {
      if (!element?.parentElement) return;
      const parent = element.parentElement;
      const parentRect = parent.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const horizontalOffset =
        elementRect.left +
        elementRect.width / 2 -
        (parentRect.left + parentRect.width / 2);

      if (Math.abs(horizontalOffset) < 0.5) return;

      // Programmatic section selection must be absolute, not constrained by
      // `snap-always`. Temporarily disabling snapping also prevents CSS
      // `scroll-smooth` from walking through intermediate profile sections.
      const previousSnapType = parent.style.scrollSnapType;
      const previousScrollBehavior = parent.style.scrollBehavior;
      parent.style.scrollSnapType = "none";
      parent.style.scrollBehavior = "auto";
      parent.scrollBy({
        left: horizontalOffset,
        behavior: "auto",
      });
      parent.style.scrollBehavior = previousScrollBehavior;
      parent.style.scrollSnapType = previousSnapType;
    },
    [],
  );

  const scrollToSection = React.useCallback(
    (section: ProfileEditTab) => {
      programmaticScrollTargetRef.current = section;
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
      if (programmaticScrollClearTimerRef.current !== null) {
        window.clearTimeout(programmaticScrollClearTimerRef.current);
      }

      scrollElementHorizontally(panelRefs.current[section]);
      scrollElementHorizontally(navButtonRefs.current[section]);

      // The scroll above is intentionally immediate. Keep the guard only long
      // enough for the resulting scroll event to drain; unlike the old
      // one-second suppression this never masks a real user swipe.
      programmaticScrollClearTimerRef.current = window.setTimeout(() => {
        if (programmaticScrollTargetRef.current === section) {
          programmaticScrollTargetRef.current = null;
        }
        programmaticScrollClearTimerRef.current = null;
      }, 50);
    },
    [scrollElementHorizontally],
  );

  const resyncScrollToActiveTab = React.useCallback(() => {
    scrollToSection(activeTabRef.current);
  }, [scrollToSection]);

  const selectSection = React.useCallback(
    (section: ProfileEditTab) => {
      activeTabRef.current = section;
      setActiveTab(section);
      scrollToSection(section);
    },
    [scrollToSection, setActiveTab],
  );

  // The carousel is height-clipped (`overflow-y-hidden`), so its height must
  // equal the visible panel exactly: a larger height leaves dead space under a
  // short section, a smaller one crops a tall section. While a swipe is in
  // flight two panels are on screen at once, so the taller of them wins until
  // the swipe settles — otherwise the incoming panel is cropped mid-gesture.
  const syncCarouselHeight = React.useCallback(() => {
    const carousel = carouselRef.current;
    const activePanel = panelRefs.current[activeTabRef.current];
    if (!carousel || !activePanel) return;

    let nextHeight = Math.ceil(activePanel.getBoundingClientRect().height);
    if (isSwipingRef.current) {
      const carouselRect = carousel.getBoundingClientRect();
      for (const section of PROFILE_SECTIONS) {
        const panel = panelRefs.current[section];
        if (!panel) continue;
        const panelRect = panel.getBoundingClientRect();
        const isVisible =
          panelRect.right > carouselRect.left + 1 &&
          panelRect.left < carouselRect.right - 1;
        if (!isVisible) continue;
        nextHeight = Math.max(nextHeight, Math.ceil(panelRect.height));
      }
    }
    if (nextHeight <= 0) return;

    setCarouselHeight((currentHeight) =>
      currentHeight !== undefined && Math.abs(currentHeight - nextHeight) < 1
        ? currentHeight
        : nextHeight,
    );
  }, []);

  React.useEffect(() => {
    if (!showEditCard || isLoading || !isLoggedIn) {
      setCarouselHeight(undefined);
      return;
    }
    let frame: number | null = null;
    const scheduleSync = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        syncCarouselHeight();
      });
    };
    const observer = new ResizeObserver(scheduleSync);
    for (const section of PROFILE_SECTIONS) {
      const panel = panelRefs.current[section];
      if (panel) observer.observe(panel);
    }
    syncCarouselHeight();
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("orientationchange", scheduleSync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("orientationchange", scheduleSync);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [isLoading, isLoggedIn, showEditCard, syncCarouselHeight]);

  React.useEffect(() => {
    if (!showEditCard || isLoading || !isLoggedIn) return;
    const frame = requestAnimationFrame(syncCarouselHeight);
    return () => cancelAnimationFrame(frame);
  }, [isLoading, isLoggedIn, resolvedActiveTab, showEditCard, syncCarouselHeight]);

  // Restore the section the user left. An explicit `?tab=` always wins, and a
  // user gesture that lands before the read resolves is never overridden.
  React.useEffect(() => {
    if (!showEditCard) {
      tabRestoredRef.current = false;
      return;
    }
    if (isLoading || !isLoggedIn || tabRestoredRef.current) return;
    if (requestedTab && PROFILE_SECTIONS.includes(requestedTab as ProfileEditTab)) {
      tabRestoredRef.current = true;
      return;
    }
    let cancelled = false;
    void readStoredProfileEditTab(userId).then((storedTab) => {
      if (cancelled) return;
      tabRestoredRef.current = true;
      if (!storedTab || storedTab === activeTabRef.current) return;
      activeTabRef.current = storedTab;
      setActiveTab(storedTab);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading, isLoggedIn, requestedTab, setActiveTab, showEditCard, userId]);

  React.useEffect(() => {
    if (!showEditCard || !tabRestoredRef.current) return;
    void writeStoredProfileEditTab(userId, resolvedActiveTab);
  }, [resolvedActiveTab, showEditCard, userId]);

  React.useEffect(() => {
    if (
      !showEditCard ||
      isLoading ||
      !isLoggedIn ||
      !requestedTab ||
      !PROFILE_SECTIONS.includes(requestedTab as ProfileEditTab) ||
      appliedRequestedTabRef.current === requestedTab
    )
      return;
    const section = requestedTab as ProfileEditTab;
    appliedRequestedTabRef.current = requestedTab;
    activeTabRef.current = section;
    setActiveTab(section);
    const frame = requestAnimationFrame(() => scrollToSection(section));
    return () => cancelAnimationFrame(frame);
  }, [
    isLoading,
    isLoggedIn,
    requestedTab,
    scrollToSection,
    setActiveTab,
    showEditCard,
  ]);

  React.useEffect(() => {
    if (!showEditCard || isLoading || !isLoggedIn) return;
    let innerFrame: number | null = null;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        innerFrame = null;
        scrollToSection(activeTabRef.current);
      });
    });
    return () => {
      cancelAnimationFrame(outerFrame);
      if (innerFrame !== null) cancelAnimationFrame(innerFrame);
    };
  }, [isLoading, isLoggedIn, resolvedActiveTab, scrollToSection, showEditCard]);

  const handleCarouselScroll = React.useCallback(() => {
    if (programmaticScrollTargetRef.current) return;
    isSwipingRef.current = true;
    setAnimateCarouselHeight(false);
    if (swipeSettleTimerRef.current !== null)
      window.clearTimeout(swipeSettleTimerRef.current);
    swipeSettleTimerRef.current = window.setTimeout(() => {
      swipeSettleTimerRef.current = null;
      isSwipingRef.current = false;
      setAnimateCarouselHeight(true);
      syncCarouselHeight();
    }, SWIPE_SETTLE_MS);
    if (scrollFrameRef.current !== null)
      cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      if (programmaticScrollTargetRef.current) return;
      const carousel = carouselRef.current;
      if (!carousel) return;
      syncCarouselHeight();
      const center =
        carousel.getBoundingClientRect().left + carousel.clientWidth / 2;
      const currentActiveTab = activeTabRef.current;
      let closest = currentActiveTab;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const section of PROFILE_SECTIONS) {
        const panel = panelRefs.current[section];
        if (!panel) continue;
        const rect = panel.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - center);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = section;
        }
      }
      if (closest !== currentActiveTab) {
        activeTabRef.current = closest;
        setActiveTab(closest);
        scrollElementHorizontally(navButtonRefs.current[closest]);
      }
    });
  }, [scrollElementHorizontally, setActiveTab, syncCarouselHeight]);

  React.useEffect(
    () => () => {
      if (scrollFrameRef.current !== null)
        cancelAnimationFrame(scrollFrameRef.current);
      if (programmaticScrollClearTimerRef.current !== null)
        window.clearTimeout(programmaticScrollClearTimerRef.current);
      if (swipeSettleTimerRef.current !== null)
        window.clearTimeout(swipeSettleTimerRef.current);
    },
    [],
  );

  const activeSectionIndex = PROFILE_SECTIONS.indexOf(resolvedActiveTab);
  const goToAdjacentSection = (offset: -1 | 1) => {
    const nextSection = PROFILE_SECTIONS[activeSectionIndex + offset];
    if (nextSection) selectSection(nextSection);
  };

  return {
    activeTab: resolvedActiveTab,
    carouselHeight,
    animateCarouselHeight,
    carouselRef,
    tabsScrollRef,
    panelRefs,
    navButtonRefs,
    activeSectionIndex,
    handleCarouselScroll,
    selectSection,
    resyncScrollToActiveTab,
    goToAdjacentSection,
  };
}
