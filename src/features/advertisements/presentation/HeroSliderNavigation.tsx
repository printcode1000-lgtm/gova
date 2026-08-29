import { ChevronLeft, ChevronRight } from "lucide-react";
import { uiAttributes } from "@asol/ui-registry-core";

export function HeroSliderNavigation({
  count,
  current,
  isRTL,
  onLeftClick,
  onRightClick,
  onSelectSlide,
}: {
  count: number;
  current: number;
  isRTL: boolean;
  onLeftClick: () => void;
  onRightClick: () => void;
  onSelectSlide: (index: number) => void;
}) {
  if (count <= 1) return null;

  return (
    <div {...uiAttributes({ uid: "advertisements.hero-slider-navigation.div.6-Js7LXQ", id: "advertisements.hero-slider-navigation.div.6" })} id="advertisements.hero-slider-navigation.div" className="absolute bottom-4 left-0 right-0 z-20 grid grid-cols-3 items-center px-4">
      <div {...uiAttributes({ uid: "advertisements.hero-slider-navigation.div.7-LzxA97", id: "advertisements.hero-slider-navigation.div.7" })} id="advertisements.hero-slider-navigation.div.2" className="flex justify-start">
        <button {...uiAttributes({ uid: "advertisements.hero-slider-navigation.button.4-nAzW4p", id: "advertisements.hero-slider-navigation.button.4" })} id="advertisements.hero-slider-navigation.button"
          type="button"
          onClick={onLeftClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs transition active:scale-95 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Previous slide"
        >
          {isRTL ? (
            <ChevronRight id="advertisements.hero-slider-navigation.chevron-right" className="h-5 w-5" />
          ) : (
            <ChevronLeft id="advertisements.hero-slider-navigation.chevron-left" className="h-5 w-5" />
          )}
        </button>
      </div>

      <div {...uiAttributes({ uid: "advertisements.hero-slider-navigation.div.8-k2bgXd", id: "advertisements.hero-slider-navigation.div.8" })} id="advertisements.hero-slider-navigation.div.3" className="flex justify-center">
        <div {...uiAttributes({ uid: "advertisements.hero-slider-navigation.div.9-y2mMEb", id: "advertisements.hero-slider-navigation.div.9" })} id="advertisements.hero-slider-navigation.div.4"
          className="flex gap-2"
          role="tablist"
          aria-label="Slideshow control indicators"
        >
          {Array.from({ length: count }, (_, i) => (
            <button id="advertisements.hero-slider-navigation.button.2"
              key={i} {...uiAttributes({ uid: "advertisements.hero-slider-navigation.button.5-x57NGT", id: "advertisements.hero-slider-navigation.button.5" })}
              type="button"
              onClick={() => onSelectSlide(i)}
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

      <div {...uiAttributes({ uid: "advertisements.hero-slider-navigation.div.10-1T1F2y", id: "advertisements.hero-slider-navigation.div.10" })} id="advertisements.hero-slider-navigation.div.5" className="flex justify-end">
        <button {...uiAttributes({ uid: "advertisements.hero-slider-navigation.button.6-EGV727", id: "advertisements.hero-slider-navigation.button.6" })} id="advertisements.hero-slider-navigation.button.3"
          type="button"
          onClick={onRightClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs transition active:scale-95 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Next slide"
        >
          {isRTL ? (
            <ChevronLeft id="advertisements.hero-slider-navigation.chevron-left.2" className="h-5 w-5" />
          ) : (
            <ChevronRight id="advertisements.hero-slider-navigation.chevron-right.2" className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
