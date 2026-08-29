import Image from "next/image";
import { shouldUseUnoptimizedImage } from "@asol/storage-core";
import { uiAttributes } from "@asol/ui-registry-core";

import {
  getHeroImageStyle,
  getHeroSlideStyleAndClass,
} from "./hero-slider-styles";
import type {
  HeroSliderProps,
  HeroSliderSlide as HeroSliderSlideModel,
  HeroSliderTransition,
} from "./hero-slider.types";

export function HeroSliderSlide({
  slide,
  index,
  current,
  previous,
  nextIndex,
  mode,
  activeTransition,
  activeTransitionDuration,
  imageFailed,
  unavailableLabel,
  onImageLoad,
  onImageError,
  onSlideClick,
}: {
  slide: HeroSliderSlideModel;
  index: number;
  current: number;
  previous: number | null;
  nextIndex: number;
  mode: HeroSliderProps["mode"];
  activeTransition: HeroSliderTransition;
  activeTransitionDuration: number;
  imageFailed: boolean;
  unavailableLabel: string;
  onImageLoad: (index: number) => void;
  onImageError: (index: number, src: string) => void;
  onSlideClick: (action: string, isKeyboard?: boolean) => void;
} & { id?: string }) {
  const isFirstSlide = index === 0;
  const isActive = index === current;
  const isExiting = index === previous;
  const isNext = index === nextIndex;
  const isPriority = isFirstSlide || isActive || isNext;
  const shouldRenderSlide = isActive || isExiting || isNext || isFirstSlide;

  if (!shouldRenderSlide) return null;

  const { className: slideClass, style: slideStyle } =
    getHeroSlideStyleAndClass({
      current,
      previous,
      index,
      transition: activeTransition,
      transitionDuration: activeTransitionDuration,
    });
  const { className: imgClass, style: imgStyle } =
    getHeroImageStyle({
      current,
      previous,
      index,
      transition: activeTransition,
      transitionDuration: activeTransitionDuration,
    });

  return (
    <div {...uiAttributes({ uid: "home-promotion-N611zJ", id: "home-promotion", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "home-promotion" } })}
      style={slideStyle}
      className={slideClass}
      onClick={() => onSlideClick(slide.action)}
      role={mode === "view" ? "button" : undefined}
      tabIndex={mode === "view" && isActive ? 0 : -1}
      onKeyDown={(e) => {
        if (mode === "view" && isActive && e.key === "Enter") {
          e.preventDefault();
          onSlideClick(slide.action, true);
        }
      }}
      aria-label={`Slide ${index + 1}: ${slide.title}`}
    >
      {slide.image && !imageFailed ? (
        <Image
          src={slide.image}
          alt={slide.title}
          fill
          sizes="100vw"
          priority={isPriority}
          loading={isPriority ? undefined : "lazy"}
          className={imgClass}
          style={imgStyle}
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth === 0) {
              onImageError(index, slide.image);
              return;
            }
            onImageLoad(index);
          }}
          onError={() => onImageError(index, slide.image)}
          unoptimized={shouldUseUnoptimizedImage(slide.image)}
        />
      ) : (
        <div {...uiAttributes({ uid: "advertisements.hero-slider-slide.div-rW8eYS", id: "advertisements.hero-slider-slide.div" })} className="absolute inset-0 flex items-center justify-center bg-muted px-6 text-center text-sm text-muted-foreground">
          {unavailableLabel}
        </div>
      )}
      {(slide.title || slide.subtitle) && (
        <div {...uiAttributes({ uid: "advertisements.hero-slider-slide.div.2-6YH6UF", id: "advertisements.hero-slider-slide.div.2" })} className="absolute inset-0 z-10 flex items-center px-4 sm:px-6">
          <div {...uiAttributes({ uid: "advertisements.hero-slider-slide.div.3-WMRPh5", id: "advertisements.hero-slider-slide.div.3" })} className="w-fit max-w-[88%] px-0 py-0 pe-0 text-white sm:max-w-[60%]">
            {slide.subtitle && (
              <span {...uiAttributes({ uid: "advertisements.hero-slider-slide.span-p3t6LV", id: "advertisements.hero-slider-slide.span" })} className="mb-2 block w-fit rounded-full bg-black/45 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-xs">
                {slide.subtitle}
              </span>
            )}
            {slide.title && (
              <h2 {...uiAttributes({ uid: "advertisements.hero-slider-slide.h2-6oZHD9", id: "advertisements.hero-slider-slide.h2" })} className="text-2xl font-bold leading-tight drop-shadow-sm">
                {slide.title}
              </h2>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
