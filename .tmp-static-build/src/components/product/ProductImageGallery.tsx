"use client";

import * as React from "react";
import type { StoredImage } from "@/core/storage/types/stored-image.types";

type Point = { x: number; y: number };
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export function ProductImageGallery({ images }: { images: StoredImage[] }) {
  const validImages = React.useMemo(
    () => images.filter((image) => image.imageKey && image.url),
    [images],
  );
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState<Point>({ x: 0, y: 0 });
  const [loaded, setLoaded] = React.useState<Set<string>>(() => new Set());
  const pointers = React.useRef(new Map<number, Point>());
  const swipeStart = React.useRef<Point | null>(null);
  const panStart = React.useRef<Point | null>(null);
  const pinchStart = React.useRef<{
    distance: number;
    scale: number;
    center: Point;
    offset: Point;
  } | null>(null);
  const lastTap = React.useRef<{ time: number; point: Point } | null>(null);

  const reset = React.useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);
  const select = React.useCallback(
    (index: number) => {
      setActiveIndex(index);
      reset();
    },
    [reset],
  );

  React.useEffect(() => {
    if (activeIndex >= validImages.length) setActiveIndex(0);
  }, [activeIndex, validImages.length]);

  if (validImages.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground sm:aspect-[4/3]">
        لا توجد صور
      </div>
    );
  }

  const active = validImages[activeIndex];

  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 1) {
      swipeStart.current = point;
      panStart.current = point;
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = {
        distance: distance(a, b),
        scale,
        center: midpoint(a, b),
        offset,
      };
      swipeStart.current = null;
    }
  };

  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId))
      return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const center = midpoint(a, b);
      setScale(
        Math.min(
          4,
          Math.max(
            1,
            (pinchStart.current.scale * distance(a, b)) /
              pinchStart.current.distance,
          ),
        ),
      );
      setOffset({
        x: pinchStart.current.offset.x + center.x - pinchStart.current.center.x,
        y: pinchStart.current.offset.y + center.y - pinchStart.current.center.y,
      });
    } else if (pointers.current.size === 1 && scale > 1 && panStart.current) {
      setOffset((current) => ({
        x: current.x + point.x - panStart.current!.x,
        y: current.y + point.y - panStart.current!.y,
      }));
      panStart.current = point;
      swipeStart.current = null;
    }
  };

  const pointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = { x: event.clientX, y: event.clientY };
    const single = pointers.current.size === 1;
    pointers.current.delete(event.pointerId);
    if (single && scale === 1 && swipeStart.current) {
      const delta = point.x - swipeStart.current.x;
      if (Math.abs(delta) >= 45) {
        if (delta < 0 && activeIndex < validImages.length - 1)
          select(activeIndex + 1);
        if (delta > 0 && activeIndex > 0) select(activeIndex - 1);
      } else {
        const now = Date.now();
        if (
          lastTap.current &&
          now - lastTap.current.time <= 300 &&
          distance(lastTap.current.point, point) < 30
        ) {
          setScale(2);
          setOffset({ x: 0, y: 0 });
          lastTap.current = null;
        } else lastTap.current = { time: now, point };
      }
    } else if (single && scale > 1) {
      const now = Date.now();
      if (lastTap.current && now - lastTap.current.time <= 300) {
        reset();
        lastTap.current = null;
      } else lastTap.current = { time: now, point };
    }
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      swipeStart.current = null;
      panStart.current = null;
    }
  };

  return (
    <div className="w-full">
      <div
        className="relative aspect-square overflow-hidden rounded-2xl bg-muted sm:aspect-[4/3]"
        style={{ touchAction: "none" }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.url}
          alt=""
          loading="eager"
          fetchPriority="high"
          draggable={false}
          onLoad={() =>
            setLoaded((current) => new Set(current).add(active.url))
          }
          className={`h-full w-full select-none object-cover transition-[opacity,transform] duration-300 ${loaded.has(active.url) ? "opacity-100" : "opacity-0"}`}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          }}
        />
      </div>
      {validImages.length > 1 ? (
        <div
          className="mt-3 flex justify-center gap-2 overflow-x-auto pb-1"
          style={{ touchAction: "pan-x" }}
        >
          {validImages.map((image, index) => (
            <button
              key={image.imageKey}
              type="button"
              aria-label={`الصورة ${index + 1}`}
              aria-pressed={activeIndex === index}
              onPointerUp={(event) => {
                select(index);
              }}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 sm:h-20 sm:w-20 ${activeIndex === index ? "border-primary" : "border-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                onLoad={() =>
                  setLoaded((current) => new Set(current).add(image.url))
                }
                className="h-full w-full select-none object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
