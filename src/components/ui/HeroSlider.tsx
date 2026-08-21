"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { HeroSliderEditor } from "@/components/ui/HeroSliderEditor";
import { HeroSliderImagesEditor } from "@/components/ui/HeroSliderImagesEditor";
import { useTranslation } from "@/lib/i18n";
import { HeroSliderNavigation } from "./HeroSliderNavigation";
import { HeroSliderSlide } from "./HeroSliderSlide";
import { nextHeroSlideIndex, sortedHeroSlides } from "./hero-slider-model";
export type {
  HeroSliderConfig,
  HeroSliderProps,
  HeroSliderSlide,
  HeroSliderTransition,
} from "./hero-slider.types";
import type { HeroSliderConfig, HeroSliderProps } from "./hero-slider.types";

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
  const pressStartRef = useRef<number>(0);
  const activeConfig = mode === "view" ? config : draftConfig;

  useEffect(() => {
    setDraftConfig(config);
  }, [config]);

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
    () => sortedHeroSlides(activeConfig),
    [activeConfig],
  );

  const hasSlides = sortedSlides.length > 0;
  const isConfigLoaded = !!config && hasSlides;
  const currentSlideHasImage = !!sortedSlides[current]?.image;
  const isCurrentLoaded =
    isConfigLoaded && (!currentSlideHasImage || !!loadedImages[current]);
  const showSkeleton = hasSlides && !isCurrentLoaded;

  useEffect(() => {
    if (current >= sortedSlides.length) {
      setCurrent(Math.max(0, sortedSlides.length - 1));
      setPrevious(null);
    }
  }, [current, sortedSlides.length]);

  // Clear transition state after transitionDuration completes
  useEffect(() => {
    if (previous !== null && activeConfig?.transitionDuration) {
      const timer = setTimeout(() => {
        setPrevious(null);
      }, activeConfig.transitionDuration);
      return () => clearTimeout(timer);
    }
  }, [current, previous, activeConfig?.transitionDuration]);

  // Handlers for slide switching
  const handleNext = useCallback(() => {
    if (!hasSlides) return;
    setCurrent((prev) => {
      if (prev < sortedSlides.length - 1) {
        setPrevious(prev);
        return prev + 1;
      } else if (activeConfig.loop) {
        setPrevious(prev);
        return 0;
      }
      return prev;
    });
  }, [sortedSlides.length, activeConfig?.loop, hasSlides]);

  const handlePrev = useCallback(() => {
    if (!hasSlides) return;
    setCurrent((prev) => {
      if (prev > 0) {
        setPrevious(prev);
        return prev - 1;
      } else if (activeConfig.loop) {
        setPrevious(prev);
        return sortedSlides.length - 1;
      }
      return prev;
    });
  }, [sortedSlides.length, activeConfig?.loop, hasSlides]);

  const handleSelectSlide = useCallback(
    (index: number) => {
      if (index === current || !hasSlides) return;
      setPrevious(current);
      setCurrent(index);
    },
    [current, hasSlides],
  );

  // Phase 6 - Dynamic Auto Play duration timer
  useEffect(() => {
    if (
      mode !== "view" ||
      !isConfigLoaded ||
      !activeConfig.autoPlay ||
      sortedSlides.length <= 1 ||
      isPaused
    )
      return;

    // If not looping and we are at the last slide, stop autoplaying
    if (!activeConfig.loop && current === sortedSlides.length - 1) return;

    const currentSlide = sortedSlides[current];
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
    sortedSlides,
    handleNext,
    isPaused,
  ]);

  // Image load handler
  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => ({ ...prev, [index]: true }));
  };

  const handleImageError = (index: number, src: string) => {
    // A removed cloud object is a recoverable content problem. Render the
    // built-in fallback without escalating the browser's resource event into
    // an application error.
    console.warn("[HeroSlider] slide-image-unavailable", { index, src });
    setFailedImages((prev) => ({ ...prev, [index]: true }));
    setLoadedImages((prev) => ({ ...prev, [index]: true }));
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
  const nextIndex = nextHeroSlideIndex(current, sortedSlides.length);

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

        {!hasSlides && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted px-6 text-center text-sm text-muted-foreground">
            {mode !== "view"
              ? t("heroSlider.addSlide")
              : t("heroSlider.noSlides")}
          </div>
        )}

        {/* Render slider contents if config is loaded */}
        {isConfigLoaded && (
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
              {sortedSlides.map((slide, index) => (
                <HeroSliderSlide
                  key={`${slide.priority}-${index}`}
                  slide={slide}
                  index={index}
                  current={current}
                  previous={previous}
                  nextIndex={nextIndex}
                  config={activeConfig!}
                  mode={mode}
                  imageFailed={Boolean(failedImages[index])}
                  unavailableLabel={t("heroSlider.imageUnavailable")}
                  onImageLoad={handleImageLoad}
                  onImageError={handleImageError}
                  onSlideClick={handleSlideClick}
                />
              ))}
            </div>

            <HeroSliderNavigation
              count={sortedSlides.length}
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
