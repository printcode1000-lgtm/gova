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
    <div className="absolute bottom-4 left-0 right-0 z-20 grid grid-cols-3 items-center px-4">
      <div className="flex justify-start">
        <button
          type="button"
          onClick={onLeftClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs transition active:scale-95 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Previous slide"
        >
          {isRTL ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="flex justify-center">
        <div
          className="flex gap-2"
          role="tablist"
          aria-label="Slideshow control indicators"
        >
          {Array.from({ length: count }, (_, i) => (
            <button
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRightClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs transition active:scale-95 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Next slide"
        >
          {isRTL ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
