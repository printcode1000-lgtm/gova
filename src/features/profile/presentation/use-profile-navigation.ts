import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useSnapshotState } from "@/features/page-snapshot";
import { PROFILE_SECTIONS, type ProfileEditTab } from "./profile-page.types";

interface UseProfileNavigationProps {
  showEditCard: boolean;
  isLoading: boolean;
  isLoggedIn: boolean;
}

interface UseProfileNavigationReturn {
  activeTab: ProfileEditTab;
  carouselHeight: number | undefined;
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

export function useProfileNavigation({
  showEditCard,
  isLoading,
  isLoggedIn,
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
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const tabsScrollRef = React.useRef<HTMLDivElement>(null);
  const panelRefs = React.useRef<Record<ProfileEditTab, HTMLDivElement | null>>(
    {
      registration: null,
      specialties: null,
      products: null,
      contact: null,
      store: null,
      workingHours: null,
      fulfillment: null,
      discounts: null,
    },
  );
  const navButtonRefs = React.useRef<
    Record<ProfileEditTab, HTMLButtonElement | null>
  >({
    registration: null,
    specialties: null,
    products: null,
    contact: null,
    store: null,
    workingHours: null,
    fulfillment: null,
    discounts: null,
  });
  const scrollFrameRef = React.useRef<number | null>(null);
  const programmaticScrollTargetRef = React.useRef<ProfileEditTab | null>(null);
  const programmaticScrollClearTimerRef = React.useRef<number | null>(null);
  const appliedRequestedTabRef = React.useRef<string | null>(null);

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
    if (!showEditCard) {
      setCarouselHeight(undefined);
      return;
    }
    if (isLoading || !isLoggedIn) return;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToSection(activeTabRef.current));
    });
    return () => cancelAnimationFrame(frame);
  }, [isLoading, isLoggedIn, resolvedActiveTab, scrollToSection, showEditCard]);

  const handleCarouselScroll = () => {
    if (programmaticScrollTargetRef.current) return;
    if (scrollFrameRef.current !== null)
      cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      if (programmaticScrollTargetRef.current) return;
      const carousel = carouselRef.current;
      if (!carousel) return;
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
  };

  React.useEffect(
    () => () => {
      if (scrollFrameRef.current !== null)
        cancelAnimationFrame(scrollFrameRef.current);
      if (programmaticScrollClearTimerRef.current !== null)
        window.clearTimeout(programmaticScrollClearTimerRef.current);
    },
    [],
  );

  React.useEffect(() => {
    const panel = panelRefs.current[resolvedActiveTab];
    if (!panel) return;
    let frame: number | null = null;
    // Keep the workspace from shrinking when moving to a shorter panel. A
    // shrinking document can clamp window.scrollY and jump the whole page.
    const updateHeight = () =>
      setCarouselHeight((currentHeight) =>
        Math.max(currentHeight ?? 0, panel.offsetHeight),
      );
    const scheduleUpdateHeight = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        updateHeight();
      });
    };
    updateHeight();
    const observer = new ResizeObserver(scheduleUpdateHeight);
    observer.observe(panel);
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [resolvedActiveTab, isLoading, isLoggedIn]);

  const activeSectionIndex = PROFILE_SECTIONS.indexOf(resolvedActiveTab);
  const goToAdjacentSection = (offset: -1 | 1) => {
    const nextSection = PROFILE_SECTIONS[activeSectionIndex + offset];
    if (nextSection) selectSection(nextSection);
  };

  return {
    activeTab: resolvedActiveTab,
    carouselHeight,
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
