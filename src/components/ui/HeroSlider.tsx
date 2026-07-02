"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { HeroSliderEditor } from "@/components/ui/HeroSliderEditor";
import { HeroSliderImagesEditor } from "@/components/ui/HeroSliderImagesEditor";
import { shouldUseUnoptimizedImage } from "@/lib/images/external-image";

export type HeroSliderTransition =
  | "Fade"
  | "SlideLeft"
  | "SlideRight"
  | "Zoom"
  | "Parallax";

export interface HeroSliderSlide {
  priority: number;
  image: string;
  imageKey?: string;
  title: string;
  subtitle: string;
  duration: number;
  action: string;
}

export interface HeroSliderConfig {
  transition: HeroSliderTransition;
  transitionDuration: number; // in ms
  autoPlay: boolean;
  loop: boolean;
  slides: HeroSliderSlide[];
  onAction?: (action: string) => void;
}

export interface HeroSliderProps {
  config: HeroSliderConfig;
  mode?: "view" | "admin-edit" | "images-edit";
  onChange?: (config: HeroSliderConfig) => void;
  onSave?: (config: HeroSliderConfig) => void;
  onCancel?: () => void;
}

export function HeroSlider({
  config,
  mode = "view",
  onChange,
  onSave,
  onCancel,
}: HeroSliderProps) {
  const [draftConfig, setDraftConfig] = useState(config);
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeConfig = mode === "view" ? config : draftConfig;

  useEffect(() => {
    setDraftConfig(config);
  }, [config]);

  const handleConfigChange = (nextConfig: HeroSliderConfig) => {
    setDraftConfig(nextConfig);
    onChange?.(nextConfig);
  };

  // Phase 4 - Sorting
  const sortedSlides = useMemo(() => {
    if (!activeConfig?.slides) return [];
    return [...activeConfig.slides].sort((a, b) => a.priority - b.priority);
  }, [activeConfig?.slides]);

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
      sortedSlides.length <= 1
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
  ]);

  // Image load handler
  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => ({ ...prev, [index]: true }));
  };

  const handleImageError = (index: number, src: string) => {
    console.error("[HeroSlider] slide-image-load-failed", { index, src });
    setFailedImages((prev) => ({ ...prev, [index]: true }));
    setLoadedImages((prev) => ({ ...prev, [index]: true }));
  };

  // Phase 8 - Mobile Touch Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
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

  // Phase 9 - Keyboard navigation helper
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const isRTL =
        typeof document !== "undefined" &&
        document.documentElement.dir === "rtl";
      isRTL ? handleNext() : handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const isRTL =
        typeof document !== "undefined" &&
        document.documentElement.dir === "rtl";
      isRTL ? handlePrev() : handleNext();
    }
  };

  // Action callback
  const handleSlideClick = (action: string) => {
    if (mode === "view" && activeConfig?.onAction) {
      activeConfig.onAction(action);
    }
  };

  // Preloading index helper
  const nextIndex = hasSlides ? (current + 1) % sortedSlides.length : 0;

  // Slide visual transition style calculator
  const getSlideStyleAndClass = (index: number) => {
    const isActive = index === current;
    const isExiting = index === previous;

    const style: React.CSSProperties = {
      transitionProperty: "opacity, transform",
      transitionDuration: `${activeConfig?.transitionDuration || 500}ms`,
      transitionTimingFunction: "ease-in-out",
    };

    let className = "absolute inset-0 ";

    switch (activeConfig?.transition) {
      case "Fade":
        className += "transition-opacity ";
        if (isActive) {
          className += "opacity-100 z-10 pointer-events-auto";
        } else if (isExiting) {
          className += "opacity-0 z-0 pointer-events-none";
        } else {
          className += "opacity-0 z-0 pointer-events-none";
        }
        break;

      case "Zoom":
        className += "transition-all ";
        if (isActive) {
          className += "opacity-100 scale-100 z-10 pointer-events-auto";
        } else if (isExiting) {
          className += "opacity-0 scale-95 z-0 pointer-events-none";
        } else {
          className += "opacity-0 scale-105 z-0 pointer-events-none";
        }
        break;

      case "SlideLeft":
        className += "transition-transform ";
        if (isActive) {
          className += "translate-x-0 z-10 pointer-events-auto";
        } else if (isExiting) {
          className += "translate-x-[-100%] z-0 pointer-events-none";
        } else {
          className += "translate-x-[100%] z-0 pointer-events-none";
        }
        break;

      case "SlideRight":
        className += "transition-transform ";
        if (isActive) {
          className += "translate-x-0 z-10 pointer-events-auto";
        } else if (isExiting) {
          className += "translate-x-[100%] z-0 pointer-events-none";
        } else {
          className += "translate-x-[-100%] z-0 pointer-events-none";
        }
        break;

      case "Parallax":
        className += "transition-transform ";
        if (isActive) {
          className += "translate-x-0 z-10 pointer-events-auto";
        } else if (isExiting) {
          className += "translate-x-[-100%] z-0 pointer-events-none";
        } else {
          className += "translate-x-[100%] z-0 pointer-events-none";
        }
        break;

      default:
        if (isActive) {
          className += "opacity-100 z-10 pointer-events-auto";
        } else {
          className += "opacity-0 z-0 pointer-events-none";
        }
    }

    return { style, className };
  };

  // Image visual transition style calculator for Parallax
  const getImageStyle = (index: number) => {
    if (activeConfig?.transition !== "Parallax") {
      return {
        className: "object-cover",
        style: {},
      };
    }

    const isActive = index === current;
    const isExiting = index === previous;

    const style: React.CSSProperties = {
      transitionProperty: "transform",
      transitionDuration: `${activeConfig?.transitionDuration || 500}ms`,
      transitionTimingFunction: "ease-in-out",
    };

    let className = "object-cover scale-110 absolute inset-0 ";

    if (isActive) {
      style.transform = "translate3d(0, 0, 0)";
    } else if (isExiting) {
      style.transform = "translate3d(15%, 0, 0)";
    } else {
      style.transform = "translate3d(-15%, 0, 0)";
    }

    return { className, style };
  };

  const isRTL =
    typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const onLeftClick = isRTL ? handleNext : handlePrev;
  const onRightClick = isRTL ? handlePrev : handleNext;

  if (mode === "images-edit") {
    return (
      <HeroSliderImagesEditor
        value={draftConfig}
        onChange={handleConfigChange}
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
              ? "أضف شريحة من لوحة التعديل لبدء المعاينة."
              : "لا توجد شرائح متاحة حاليًا."}
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
            >
              {sortedSlides.map((slide, index) => {
                const isFirstSlide = index === 0;
                const isActive = index === current;
                const isExiting = index === previous;
                const isNext = index === nextIndex;
                const imageFailed = Boolean(failedImages[index]);

                // Preload first slide, active slide, and next slide
                const isPriority = isFirstSlide || isActive || isNext;

                // Only render slides that are active, exiting, or need preloading
                const shouldRenderSlide =
                  isActive || isExiting || isNext || isFirstSlide;

                if (!shouldRenderSlide) return null;

                const { className: slideClass, style: slideStyle } =
                  getSlideStyleAndClass(index);
                const { className: imgClass, style: imgStyle } =
                  getImageStyle(index);

                return (
                  <div
                    key={`${slide.priority}-${index}`}
                    style={slideStyle}
                    className={slideClass}
                    onClick={() => handleSlideClick(slide.action)}
                    role={mode === "view" ? "button" : undefined}
                    tabIndex={mode === "view" && isActive ? 0 : -1}
                    onKeyDown={(e) => {
                      if (
                        mode === "view" &&
                        isActive &&
                        (e.key === "Enter" || e.key === " ")
                      ) {
                        e.preventDefault();
                        handleSlideClick(slide.action);
                      }
                    }}
                    aria-label={`Slide ${index + 1}: ${slide.title}`}
                  >
                    {slide.image && !imageFailed ? (
                      <Image
                        src={slide.image}
                        alt={slide.title}
                        fill
                        priority={isPriority}
                        loading={isPriority ? undefined : "lazy"}
                        className={imgClass}
                        style={imgStyle}
                        onLoad={() => handleImageLoad(index)}
                        onError={() => handleImageError(index, slide.image)}
                        unoptimized={shouldUseUnoptimizedImage(slide.image)}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted px-6 text-center text-sm text-muted-foreground">
                        Image unavailable
                      </div>
                    )}
                    {(slide.title || slide.subtitle) && (
                      <div className="absolute inset-0 z-10 flex items-center px-4 sm:px-6">
                        <div className="w-fit max-w-[88%] rounded-xl bg-gradient-to-l from-primary/90 via-primary/65 to-transparent px-4 py-4 pe-12 text-on-primary shadow-sm ltr:bg-gradient-to-r sm:max-w-[60%] sm:px-6 sm:py-5 sm:pe-16">
                          {slide.subtitle && (
                            <span className="mb-2 block w-fit rounded-full bg-black/45 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-xs">
                              {slide.subtitle}
                            </span>
                          )}
                          {slide.title && (
                            <h2 className="text-2xl font-bold leading-tight drop-shadow-sm">
                              {slide.title}
                            </h2>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Phase 7 - Unified Bottom Navigation Row (Prev Button, Centered Dots, Next Button) */}
            {sortedSlides.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 z-20 grid grid-cols-3 items-center px-4">
                {/* Prev Button */}
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={onLeftClick}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs transition hover:bg-black/50 active:scale-95 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </div>

                {/* Centered Indicator Dots */}
                <div className="flex justify-center">
                  <div
                    className="flex gap-2"
                    role="tablist"
                    aria-label="Slideshow control indicators"
                  >
                    {sortedSlides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSlide(i)}
                        className="h-1.5 rounded-full bg-white transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                        style={{
                          width: i === current ? "32px" : "8px",
                          opacity: i === current ? 1 : 0.4,
                        }}
                        role="tab"
                        aria-selected={i === current}
                        aria-label={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Next Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onRightClick}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs transition hover:bg-black/50 active:scale-95 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      {mode === "admin-edit" && (
        <HeroSliderEditor
          value={draftConfig}
          onChange={handleConfigChange}
          onSave={onSave}
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
