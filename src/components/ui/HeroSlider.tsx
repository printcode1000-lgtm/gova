'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { shouldUseUnoptimizedImage } from '@/lib/images/external-image';

export type HeroSliderTransition = 'Fade' | 'SlideLeft' | 'SlideRight' | 'Zoom' | 'Parallax';

export interface HeroSliderSlide {
  priority: number;
  image: string;
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
}

export function HeroSlider({ config }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Phase 4 - Sorting
  const sortedSlides = useMemo(() => {
    if (!config?.slides) return [];
    return [...config.slides].sort((a, b) => a.priority - b.priority);
  }, [config?.slides]);

  const hasSlides = sortedSlides.length > 0;
  const isConfigLoaded = !!config && hasSlides;
  const isCurrentLoaded = isConfigLoaded && !!loadedImages[current];
  const showSkeleton = !isConfigLoaded || !isCurrentLoaded;

  // Clear transition state after transitionDuration completes
  useEffect(() => {
    if (previous !== null && config?.transitionDuration) {
      const timer = setTimeout(() => {
        setPrevious(null);
      }, config.transitionDuration);
      return () => clearTimeout(timer);
    }
  }, [current, previous, config?.transitionDuration]);

  // Handlers for slide switching
  const handleNext = useCallback(() => {
    if (!hasSlides) return;
    setCurrent((prev) => {
      if (prev < sortedSlides.length - 1) {
        setPrevious(prev);
        return prev + 1;
      } else if (config.loop) {
        setPrevious(prev);
        return 0;
      }
      return prev;
    });
  }, [sortedSlides.length, config?.loop, hasSlides]);

  const handlePrev = useCallback(() => {
    if (!hasSlides) return;
    setCurrent((prev) => {
      if (prev > 0) {
        setPrevious(prev);
        return prev - 1;
      } else if (config.loop) {
        setPrevious(prev);
        return sortedSlides.length - 1;
      }
      return prev;
    });
  }, [sortedSlides.length, config?.loop, hasSlides]);

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
    if (!isConfigLoaded || !config.autoPlay || sortedSlides.length <= 1) return;
    
    // If not looping and we are at the last slide, stop autoplaying
    if (!config.loop && current === sortedSlides.length - 1) return;

    const currentSlide = sortedSlides[current];
    const duration = currentSlide?.duration || 4000;

    const timer = setTimeout(() => {
      handleNext();
    }, duration);

    return () => clearTimeout(timer);
  }, [current, isConfigLoaded, config?.autoPlay, config?.loop, sortedSlides, handleNext]);

  // Image load handler
  const handleImageLoad = (index: number) => {
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

    const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

    if (isLeftSwipe) {
      isRTL ? handlePrev() : handleNext();
    } else if (isRightSwipe) {
      isRTL ? handleNext() : handlePrev();
    }
  };

  // Phase 9 - Keyboard navigation helper
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
      isRTL ? handleNext() : handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
      isRTL ? handlePrev() : handleNext();
    }
  };

  // Action callback
  const handleSlideClick = (action: string) => {
    if (config?.onAction) {
      config.onAction(action);
    }
  };

  // Preloading index helper
  const nextIndex = hasSlides ? (current + 1) % sortedSlides.length : 0;

  // Slide visual transition style calculator
  const getSlideStyleAndClass = (index: number) => {
    const isActive = index === current;
    const isExiting = index === previous;

    const style: React.CSSProperties = {
      transitionProperty: 'opacity, transform',
      transitionDuration: `${config?.transitionDuration || 500}ms`,
      transitionTimingFunction: 'ease-in-out',
    };

    let className = 'absolute inset-0 ';

    switch (config?.transition) {
      case 'Fade':
        className += 'transition-opacity ';
        if (isActive) {
          className += 'opacity-100 z-10 pointer-events-auto';
        } else if (isExiting) {
          className += 'opacity-0 z-0 pointer-events-none';
        } else {
          className += 'opacity-0 z-0 pointer-events-none';
        }
        break;

      case 'Zoom':
        className += 'transition-all ';
        if (isActive) {
          className += 'opacity-100 scale-100 z-10 pointer-events-auto';
        } else if (isExiting) {
          className += 'opacity-0 scale-95 z-0 pointer-events-none';
        } else {
          className += 'opacity-0 scale-105 z-0 pointer-events-none';
        }
        break;

      case 'SlideLeft':
        className += 'transition-transform ';
        if (isActive) {
          className += 'translate-x-0 z-10 pointer-events-auto';
        } else if (isExiting) {
          className += 'translate-x-[-100%] z-0 pointer-events-none';
        } else {
          className += 'translate-x-[100%] z-0 pointer-events-none';
        }
        break;

      case 'SlideRight':
        className += 'transition-transform ';
        if (isActive) {
          className += 'translate-x-0 z-10 pointer-events-auto';
        } else if (isExiting) {
          className += 'translate-x-[100%] z-0 pointer-events-none';
        } else {
          className += 'translate-x-[-100%] z-0 pointer-events-none';
        }
        break;

      case 'Parallax':
        className += 'transition-transform ';
        if (isActive) {
          className += 'translate-x-0 z-10 pointer-events-auto';
        } else if (isExiting) {
          className += 'translate-x-[-100%] z-0 pointer-events-none';
        } else {
          className += 'translate-x-[100%] z-0 pointer-events-none';
        }
        break;

      default:
        if (isActive) {
          className += 'opacity-100 z-10 pointer-events-auto';
        } else {
          className += 'opacity-0 z-0 pointer-events-none';
        }
    }

    return { style, className };
  };

  // Image visual transition style calculator for Parallax
  const getImageStyle = (index: number) => {
    if (config?.transition !== 'Parallax') {
      return {
        className: 'object-cover',
        style: {},
      };
    }

    const isActive = index === current;
    const isExiting = index === previous;

    const style: React.CSSProperties = {
      transitionProperty: 'transform',
      transitionDuration: `${config?.transitionDuration || 500}ms`,
      transitionTimingFunction: 'ease-in-out',
    };

    let className = 'object-cover scale-110 absolute inset-0 ';

    if (isActive) {
      style.transform = 'translate3d(0, 0, 0)';
    } else if (isExiting) {
      style.transform = 'translate3d(15%, 0, 0)';
    } else {
      style.transform = 'translate3d(-15%, 0, 0)';
    }

    return { className, style };
  };

  const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const onLeftClick = isRTL ? handleNext : handlePrev;
  const onRightClick = isRTL ? handlePrev : handleNext;

  return (
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

              // Preload first slide, active slide, and next slide
              const isPriority = isFirstSlide || isActive || isNext;

              // Only render slides that are active, exiting, or need preloading
              const shouldRenderSlide = isActive || isExiting || isNext || isFirstSlide;

              if (!shouldRenderSlide) return null;

              const { className: slideClass, style: slideStyle } = getSlideStyleAndClass(index);
              const { className: imgClass, style: imgStyle } = getImageStyle(index);

              return (
                <div
                  key={`${slide.priority}-${index}`}
                  style={slideStyle}
                  className={slideClass}
                  onClick={() => handleSlideClick(slide.action)}
                  role="button"
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(e) => {
                    if (isActive && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSlideClick(slide.action);
                    }
                  }}
                  aria-label={`Slide ${index + 1}: ${slide.title}`}
                >
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    priority={isPriority}
                    loading={isPriority ? undefined : 'lazy'}
                    className={imgClass}
                    style={imgStyle}
                    onLoad={() => handleImageLoad(index)}
                    unoptimized={shouldUseUnoptimizedImage(slide.image)}
                  />
                  <div className="absolute inset-0 flex flex-col justify-center px-6 text-on-primary bg-gradient-to-l from-primary via-primary/60 to-transparent">
                    {slide.subtitle && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full w-fit mb-2 bg-black/45 text-white backdrop-blur-xs">
                        {slide.subtitle}
                      </span>
                    )}
                    <h2 className="text-2xl font-bold leading-tight">{slide.title}</h2>
                  </div>
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
                        width: i === current ? '32px' : '8px',
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
  );
}
