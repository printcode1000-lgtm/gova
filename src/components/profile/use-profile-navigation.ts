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
  panelRefs: React.RefObject<Record<ProfileEditTab, HTMLDivElement | null>>;
  navButtonRefs: React.RefObject<Record<ProfileEditTab, HTMLButtonElement | null>>;
  activeSectionIndex: number;
  handleCarouselScroll: () => void;
  selectSection: (section: ProfileEditTab) => void;
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
  const [carouselHeight, setCarouselHeight] = React.useState<number>();
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const panelRefs = React.useRef<Record<ProfileEditTab, HTMLDivElement | null>>(
    {
      registration: null,
      specialties: null,
      products: null,
      contact: null,
      store: null,
      workingHours: null,
      fulfillment: null,
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
  });
  const scrollFrameRef = React.useRef<number | null>(null);
  const suppressScrollSyncUntilRef = React.useRef(0);
  const appliedRequestedTabRef = React.useRef<string | null>(null);

  const scrollToSection = React.useCallback((section: ProfileEditTab) => {
    suppressScrollSyncUntilRef.current = Date.now() + 500;
    panelRefs.current[section]?.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "center",
    });
    navButtonRefs.current[section]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, []);

  const selectSection = (section: ProfileEditTab) => {
    setActiveTab(section);
    scrollToSection(section);
  };

  React.useEffect(() => {
    if (
      !showEditCard ||
      isLoading ||
      !isLoggedIn ||
      !requestedTab ||
      !PROFILE_SECTIONS.includes(requestedTab as ProfileEditTab) ||
      appliedRequestedTabRef.current === requestedTab
    ) return;
    const section = requestedTab as ProfileEditTab;
    appliedRequestedTabRef.current = requestedTab;
    setActiveTab(section);
    const frame = requestAnimationFrame(() => scrollToSection(section));
    return () => cancelAnimationFrame(frame);
  }, [isLoading, isLoggedIn, requestedTab, scrollToSection, showEditCard]);

  React.useEffect(() => {
    if (!showEditCard || isLoading || !isLoggedIn) return;
    const frame = requestAnimationFrame(() => scrollToSection(resolvedActiveTab));
    return () => cancelAnimationFrame(frame);
  }, [isLoading, isLoggedIn, resolvedActiveTab, scrollToSection, showEditCard]);

  const handleCarouselScroll = () => {
    if (Date.now() < suppressScrollSyncUntilRef.current) return;
    if (scrollFrameRef.current !== null)
      cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      const carousel = carouselRef.current;
      if (!carousel) return;
      const center =
        carousel.getBoundingClientRect().left + carousel.clientWidth / 2;
      let closest = resolvedActiveTab;
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
      if (closest !== resolvedActiveTab) {
        setActiveTab(closest);
        navButtonRefs.current[closest]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    });
  };

  React.useEffect(
    () => () => {
      if (scrollFrameRef.current !== null)
        cancelAnimationFrame(scrollFrameRef.current);
    },
    [],
  );

  React.useEffect(() => {
    const panel = panelRefs.current[resolvedActiveTab];
    if (!panel) return;
    const updateHeight = () => setCarouselHeight(panel.offsetHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(panel);
    return () => observer.disconnect();
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
    panelRefs,
    navButtonRefs,
    activeSectionIndex,
    handleCarouselScroll,
    selectSection,
    goToAdjacentSection,
  };
}
