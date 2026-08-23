"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/shared/ui/skeleton";
import { HeroSliderEditor } from "@/features/advertisements/presentation/HeroSliderEditor";
import { HeroSliderImagesEditor } from "@/features/advertisements/presentation/HeroSliderImagesEditor";
import { useTranslation } from "@/shared/i18n";
import { HeroSliderNavigation } from "./HeroSliderNavigation";
import { HeroSliderSlide } from "./HeroSliderSlide";
import { HeroSliderImageProbe } from "./HeroSliderImageProbe";
import { mergeHeroSliderAdminPreview } from "./hero-slider-admin-preview";
import {
  resolveHeroSlideNavigationDirection,
  resolveHeroSlideTransition,
  type HeroSliderNavigationDirection,
} from "./hero-slider-transition-runtime";
import {
  heroSliderAdminEntries,
  heroSliderProbingEntries,
  heroSliderVisibleEntries,
  nextHeroSlideIndex,
  shouldShowHeroSliderSkeleton,
  sortedHeroSlides,
} from "./hero-slider-model";
export type {
  HeroSliderConfig,
  HeroSliderProps,
  HeroSliderSlide,
  HeroSliderTransition,
} from "./hero-slider.types";
import type { HeroSliderConfig, HeroSliderProps } from "./hero-slider.types";
import {
  DEFAULT_HOME_HERO_TRANSITION,
  DEFAULT_HOME_HERO_TRANSITION_DURATION,
} from "@asol/hero-slider-core";

export function HeroSlider({
  config,
  mode = "view",
  onChange,
  onSave,
  onCancel,
  imageUploadRef,
  onImagesPendingChange,
}: HeroSliderProps) {
  const { t } = useTranslation();
  const [draftConfig, setDraftConfig] = useState(config);
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isRTL, setIsRTL] = useState(false);
  const [adminPreviewBySlide, setAdminPreviewBySlide] = useState<
    Record<number, string>
  >({});
  const [navigationDirection, setNavigationDirection] =
    useState<HeroSliderNavigationDirection>("forward");
  const pressStartRef = useRef<number>(0);
  const activeConfig = mode === "view" ? config : draftConfig;
  const carouselConfig = useMemo(
    () =>
      mode === "admin-edit"
        ? mergeHeroSliderAdminPreview(activeConfig, adminPreviewBySlide)
        : activeConfig,
    [activeConfig, adminPreviewBySlide, mode],
  );

  const handleAdminPreviewChange = useCallback(
    (slideIndex: number, previewUrl: string | null) => {
      setAdminPreviewBySlide((current) => {
        if (!previewUrl) {
          if (!(slideIndex in current)) return current;
          const next = { ...current };
          delete next[slideIndex];
          return next;
        }
        if (current[slideIndex] === previewUrl) return current;
        return { ...current, [slideIndex]: previewUrl };
      });
    },
    [],
  );

  useEffect(() => {
    if (mode !== "admin-edit") {
      setAdminPreviewBySlide({});
    }
  }, [mode]);

  const slideImageSignature = useMemo(
    () =>
      sortedHeroSlides(carouselConfig)
        .map((slide) => slide.image)
        .join("\0"),
    [carouselConfig],
  );

  useEffect(() => {
    setDraftConfig(config);
    setAdminPreviewBySlide({});
  }, [config]);

  useEffect(() => {
    setFailedImages({});
    setLoadedImages({});
    setCurrent(0);
    setPrevious(null);
  }, [slideImageSignature]);

  useEffect(() => {
    setIsRTL(
      typeof document !== "undefined" && document.documentElement.dir === "rtl",
    );
  }, []);

  const handleConfigChange = (nextConfig: HeroSliderConfig) => {
    setDraftConfig(nextConfig);
    onChange?.(nextConfig);
  };

  // Phase 4 - Sorting
  const sortedSlides = useMemo(
    () => sortedHeroSlides(carouselConfig),
    [carouselConfig],
  );

  const isViewMode = mode === "view";
  const probingEntries = useMemo(
    () =>
      isViewMode
        ? heroSliderProbingEntries(sortedSlides, loadedImages, failedImages)
        : [],
    [isViewMode, sortedSlides, loadedImages, failedImages],
  );
  const carouselEntries = useMemo(
    () =>
      isViewMode
        ? heroSliderVisibleEntries(sortedSlides, loadedImages, failedImages)
        : heroSliderAdminEntries(sortedSlides),
    [isViewMode, sortedSlides, loadedImages, failedImages],
  );

  const hasSlides = carouselEntries.length > 0;
  const enteringSlide = carouselEntries[current]?.slide;
  const activeTransitionDuration =
    enteringSlide?.transitionDuration ?? DEFAULT_HOME_HERO_TRANSITION_DURATION;
  const activeTransition = resolveHeroSlideTransition(
    enteringSlide?.transition ?? DEFAULT_HOME_HERO_TRANSITION,
    navigationDirection,
    isRTL,
  );
  const isConfigLoaded =
    !!config && (isViewMode ? sortedSlides.some((slide) => slide.image) : hasSlides);
  const showSkeleton = shouldShowHeroSliderSkeleton({
    isViewMode,
    probingCount: probingEntries.length,
    visibleCount: carouselEntries.length,
  });

  useEffect(() => {
    if (current >= carouselEntries.length) {
      setCurrent(Math.max(0, carouselEntries.length - 1));
      setPrevious(null);
    }
  }, [current, carouselEntries.length]);

  // Clear transition state after the entering slide's transition duration completes
  useEffect(() => {
    if (previous !== null) {
      const timer = setTimeout(() => {
        setPrevious(null);
      }, activeTransitionDuration);
      return () => clearTimeout(timer);
    }
  }, [current, previous, activeTransitionDuration]);

  const goToSlide = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || !hasSlides) return;
      setNavigationDirection(
        resolveHeroSlideNavigationDirection(
          fromIndex,
          toIndex,
          carouselEntries.length,
          activeConfig.loop,
        ),
      );
      setPrevious(fromIndex);
      setCurrent(toIndex);
    },
    [activeConfig.loop, carouselEntries.length, hasSlides],
  );

  const handleNext = useCallback(() => {
    if (!hasSlides) return;
    if (current < carouselEntries.length - 1) {
      goToSlide(current, current + 1);
      return;
    }
    if (activeConfig.loop) goToSlide(current, 0);
  }, [activeConfig.loop, carouselEntries.length, current, goToSlide, hasSlides]);

  const handlePrev = useCallback(() => {
    if (!hasSlides) return;
    if (current > 0) {
      goToSlide(current, current - 1);
      return;
    }
    if (activeConfig.loop) {
      goToSlide(current, carouselEntries.length - 1);
    }
  }, [activeConfig.loop, carouselEntries.length, current, goToSlide, hasSlides]);

  const handleSelectSlide = useCallback(
    (index: number) => {
      goToSlide(current, index);
    },
    [current, goToSlide],
  );

  // Phase 6 - Dynamic Auto Play duration timer (view + admin preview)
  useEffect(() => {
    if (
      mode === "images-edit" ||
      !isConfigLoaded ||
      !activeConfig.autoPlay ||
      carouselEntries.length <= 1 ||
      isPaused
    )
      return;

    // If not looping and we are at the last slide, stop autoplaying
    if (!activeConfig.loop && current === carouselEntries.length - 1) return;

    const currentSlide = carouselEntries[current]?.slide;
    const duration = currentSlide?.duration || 4000;

    const timer = setTimeout(() => {
      handleNext();
    }, duration);

    return () => clearTimeout(timer);
  }, [
    current,
    isConfigLoaded,
    mode,
    activeConfig?.autoPlay,
    activeConfig?.loop,
    carouselEntries,
    carouselEntries[current]?.slide.duration,
    handleNext,
    isPaused,
  ]);

  // Image load handler — keyed by the original slide index in sortedSlides.
  const handleImageLoad = (originalIndex: number) => {
    setLoadedImages((prev) => ({ ...prev, [originalIndex]: true }));
  };

  const handleImageError = (originalIndex: number, src: string) => {
    console.warn("[HeroSlider] slide-image-unavailable", {
      index: originalIndex,
      src,
    });
    setFailedImages((prev) => ({ ...prev, [originalIndex]: true }));
    setLoadedImages((prev) => ({ ...prev, [originalIndex]: true }));
  };

  // Phase 8 - Mobile Touch Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    pressStartRef.current = Date.now();
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStart === null || touchEnd === null) return;
    const minSwipeDistance = 50;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const isRTL =
      typeof document !== "undefined" && document.documentElement.dir === "rtl";

    if (isLeftSwipe) {
      isRTL ? handlePrev() : handleNext();
    } else if (isRightSwipe) {
      isRTL ? handleNext() : handlePrev();
    }
  };

  const handleTouchCancel = () => {
    setIsPaused(false);
  };

  const handleMouseDown = () => {
    setIsPaused(true);
    pressStartRef.current = Date.now();
  };

  const handleMouseUp = () => {
    setIsPaused(false);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  // Phase 9 - Keyboard navigation helper
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      isRTL ? handleNext() : handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      isRTL ? handlePrev() : handleNext();
    }
  };

  // Action callback
  const handleSlideClick = (action: string, isKeyboard = false) => {
    if (mode === "view" && activeConfig?.onAction) {
      if (isKeyboard) {
        activeConfig.onAction(action);
        return;
      }
      const pressDuration = Date.now() - pressStartRef.current;
      if (pressDuration < 500) {
        activeConfig.onAction(action);
      }
    }
  };

  // Preloading index helper
  const nextIndex = nextHeroSlideIndex(current, carouselEntries.length);

  const onLeftClick = isRTL ? handleNext : handlePrev;
  const onRightClick = isRTL ? handlePrev : handleNext;

  if (mode === "images-edit") {
    return (
      <HeroSliderImagesEditor
        ref={imageUploadRef}
        value={draftConfig}
        onChange={handleConfigChange}
        onPendingChange={onImagesPendingChange}
      />
    );
  }

  return (
    <div>
      <section
        ref={containerRef}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Image Carousel"
        aria-live="polite"
        className="mt-4 relative overflow-hidden rounded-xl shadow-sm h-48 sm:h-64 md:h-80 lg:h-96 w-full focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {/* Phase 10 - Skeleton loading state */}
        {showSkeleton && (
          <div className="absolute inset-0 z-50 rounded-xl overflow-hidden">
            <Skeleton className="w-full h-full" />
          </div>
        )}

        {!hasSlides && !(isViewMode && probingEntries.length > 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted px-6 text-center text-sm text-muted-foreground">
            {mode !== "view"
              ? t("heroSlider.addSlide")
              : t("heroSlider.noSlides")}
          </div>
        )}

        {isViewMode && probingEntries.length > 0 && (
          <div className="absolute h-px w-px overflow-hidden" aria-hidden>
            {probingEntries.map(({ slide, originalIndex }) => (
              <HeroSliderImageProbe
                key={`probe-${originalIndex}-${slide.priority}`}
                src={slide.image}
                onLoad={() => handleImageLoad(originalIndex)}
                onError={() => handleImageError(originalIndex, slide.image)}
              />
            ))}
          </div>
        )}

        {/* Render slider contents if config is loaded */}
        {isConfigLoaded && hasSlides && (
          <>
            <div
              className="relative w-full h-full overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {carouselEntries.map(({ slide, originalIndex }, displayIndex) => (
                <HeroSliderSlide
                  key={`${slide.priority}-${originalIndex}`}
                  slide={slide}
                  index={displayIndex}
                  current={current}
                  previous={previous}
                  nextIndex={nextIndex}
                  mode={mode}
                  activeTransition={activeTransition}
                  activeTransitionDuration={activeTransitionDuration}
                  imageFailed={Boolean(failedImages[originalIndex])}
                  unavailableLabel={t("heroSlider.imageUnavailable")}
                  onImageLoad={() => handleImageLoad(originalIndex)}
                  onImageError={() => handleImageError(originalIndex, slide.image)}
                  onSlideClick={handleSlideClick}
                />
              ))}
            </div>

            <HeroSliderNavigation
              count={carouselEntries.length}
              current={current}
              isRTL={isRTL}
              onLeftClick={onLeftClick}
              onRightClick={onRightClick}
              onSelectSlide={handleSelectSlide}
            />
          </>
        )}
      </section>
      {mode === "admin-edit" && (
        <HeroSliderEditor
          ref={imageUploadRef}
          value={draftConfig}
          onChange={handleConfigChange}
          onSave={onSave}
          onPreviewChange={handleAdminPreviewChange}
          onPendingChange={onImagesPendingChange}
          onCancel={
            onCancel
              ? () => {
                  setDraftConfig(config);
                  onCancel();
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
