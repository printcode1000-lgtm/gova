import { ChevronLeft, ChevronRight } from "lucide-react";

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
    <div id='features-advertisements-presentation-heroslidernavigation-div-1-tmq2k5' className="absolute bottom-4 left-0 right-0 z-20 grid grid-cols-3 items-center px-4">
      <div id='features-advertisements-presentation-heroslidernavigation-div-2-7fpwwc' className="flex justify-start">
        <button id='features-advertisements-presentation-heroslidernavigation-button-3-q1or5r'
          type="button"
          onClick={onLeftClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs transition active:scale-95 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Previous slide"
        >
          {isRTL ? (
            <ChevronRight id='features-advertisements-presentation-heroslidernavigation-chevronright-4-gt01ge' className="h-5 w-5" />
          ) : (
            <ChevronLeft id='features-advertisements-presentation-heroslidernavigation-chevronleft-5-kpcaha' className="h-5 w-5" />
          )}
        </button>
      </div>

      <div id='features-advertisements-presentation-heroslidernavigation-div-6-gxde03' className="flex justify-center">
        <div id='features-advertisements-presentation-heroslidernavigation-div-7-yse4oq'
          className="flex gap-2"
          role="tablist"
          aria-label="Slideshow control indicators"
        >
          {Array.from({ length: count }, (_, i) => (
            <button id='features-advertisements-presentation-heroslidernavigation-button-8-ocflp1'
              key={i}
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

      <div id='features-advertisements-presentation-heroslidernavigation-div-9-cjt6zv' className="flex justify-end">
        <button id='features-advertisements-presentation-heroslidernavigation-button-10-s7zrmu'
          type="button"
          onClick={onRightClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs transition active:scale-95 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Next slide"
        >
          {isRTL ? (
            <ChevronLeft id='features-advertisements-presentation-heroslidernavigation-chevronleft-11-x3ymrd' className="h-5 w-5" />
          ) : (
            <ChevronRight id='features-advertisements-presentation-heroslidernavigation-chevronright-12-kxpqxf' className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
