"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

export const SPATIAL_CAROUSEL_SETTLE_DELAY_MS = 1000;
export const SPATIAL_CAROUSEL_DRAG_DETECT_PX = 8;
export const SPATIAL_CAROUSEL_SWIPE_PX = 34;
export const SPATIAL_CAROUSEL_CONTINUOUS_STEP_PX = 52;
export const SPATIAL_CAROUSEL_MIN_CONTINUOUS_STEP_PX = 28;
export const SPATIAL_CAROUSEL_VELOCITY_STEP_FACTOR = 14;

export const SPATIAL_CAROUSEL_SHELL_CLASSNAME =
  "w-full max-w-full overflow-hidden rounded-[1.4rem] border border-outline-variant/40 bg-surface-container-low/80 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.55)] backdrop-blur-xl";

export const SPATIAL_CAROUSEL_VIEWPORT_CLASSNAME =
  "relative h-[92px] w-full touch-pan-y overflow-hidden outline-none";

export const SPATIAL_CAROUSEL_ITEM_CLASSNAME =
  "absolute left-1/2 top-1/2 flex h-[64px] w-[76px] flex-col items-center justify-center gap-0.5 rounded-[0.95rem] border px-1 text-center shadow-lg outline-none will-change-transform focus-visible:ring-2 focus-visible:ring-primary/60";

export const SPATIAL_CAROUSEL_ICON_WRAP_CLASSNAME =
  "relative flex shrink-0 items-center justify-center transition-[width,height] duration-300";

export function getSpatialCarouselIconWrapStyle(centered: boolean) {
  return {
    width: centered ? "2rem" : "2.6rem",
    height: centered ? "2rem" : "2.6rem",
  };
}

export function shouldShowSpatialCarouselLabel(centered: boolean): boolean {
  return centered;
}

export const SPATIAL_CAROUSEL_LABEL_CLASSNAME =
  "line-clamp-2 block w-full text-center font-bold tracking-tight";

export const SPATIAL_CAROUSEL_FLOOR_GLOW_CLASSNAME =
  "pointer-events-none absolute bottom-1 left-1/2 h-3 w-[38%] -translate-x-1/2 rounded-[999px] bg-foreground/10 blur-xl";

export const SPATIAL_CAROUSEL_POPOVER_CLASSNAME =
  "relative -mt-2 rounded-[1.4rem] border bg-surface/95 p-[6px] shadow-xl shadow-primary/5 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300";

export const SPATIAL_CAROUSEL_POPOVER_ARROW_CLASSNAME =
  "pointer-events-none absolute left-1/2 top-0 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t bg-surface";

export function getSpatialCarouselPopoverStyle(color: string): CSSProperties {
  return {
    borderColor: `${color}55`,
    boxShadow: `0 20px 48px -30px ${color}66`,
  };
}

export function getSpatialCarouselPopoverArrowStyle(color: string): CSSProperties {
  return { borderColor: `${color}55` };
}


export const SPATIAL_CAROUSEL_VIEWPORT_STYLE: CSSProperties = {
  perspective: "820px",
  perspectiveOrigin: "50% 50%",
  background:
    "radial-gradient(circle at 50% 100%, color-mix(in srgb, var(--primary) 14%, transparent) 0%, transparent 58%)",
};

export const SPATIAL_CAROUSEL_HORIZONTAL_SLOTS = [
  "0px",
  "clamp(54px, 18vw, 68px)",
  "clamp(96px, 31vw, 122px)",
  "clamp(126px, 42vw, 164px)",
  "clamp(148px, 50vw, 194px)",
] as const;

export interface SpatialCarouselItemPresentation {
  centered: boolean;
  distance: number;
  offset: number;
  style: CSSProperties;
}

export function getSpatialCarouselItemPresentation(
  index: number,
  centerIndex: number,
  itemCount: number,
  color: string,
): SpatialCarouselItemPresentation {
  let offset = index - centerIndex;
  const half = itemCount / 2;
  if (offset > half) offset -= itemCount;
  if (offset < -half) offset += itemCount;
  const distance = Math.abs(offset);
  const centered = offset === 0;
  const direction = Math.sign(offset);
  const slot =
    SPATIAL_CAROUSEL_HORIZONTAL_SLOTS[
      Math.min(distance, SPATIAL_CAROUSEL_HORIZONTAL_SLOTS.length - 1)
    ];
  const translateX = direction === 0 ? "0px" : `calc(${direction} * ${slot})`;
  const translateY = distance * 1.5;
  const translateZ = centered ? 52 : -42 - distance * 38;
  const rotateY = direction * -Math.min(54, 26 + distance * 7);
  const scale = centered ? 1.04 : Math.max(0.52, 0.8 - (distance - 1) * 0.09);

  return {
    centered,
    distance,
    offset,
    style: {
      transform: `translate(-50%, -50%) translateX(${translateX}) translateY(${translateY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
      transformStyle: "preserve-3d",
      transformOrigin: "center center",
      transition:
        "transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease, filter 260ms ease, box-shadow 260ms ease",
      zIndex: 60 - distance,
      opacity: centered ? 1 : Math.max(0.5, 0.9 - distance * 0.09),
      filter: centered
        ? `drop-shadow(0 10px 18px ${color}22)`
        : `brightness(${Math.max(0.74, 0.94 - distance * 0.05)}) saturate(0.88)`,
      background: centered
        ? `linear-gradient(145deg, ${color}2F, ${color}12 55%, color-mix(in srgb, var(--background) 92%, transparent))`
        : `linear-gradient(145deg, ${color}18, color-mix(in srgb, var(--background) 94%, transparent))`,
      borderColor: centered ? `${color}B8` : `${color}55`,
      boxShadow: centered
        ? `0 18px 32px -18px ${color}88, inset 0 1px 0 rgba(255,255,255,.2)`
        : "0 10px 24px -20px rgba(15,23,42,.65)",
    },
  };
}

export function getSpatialCarouselIconStyle(
  color: string,
  centered: boolean,
) {
  return {
    color,
    width: centered ? "1.65rem" : "2.15rem",
    height: centered ? "1.65rem" : "2.15rem",
    fontSize: centered ? "1.65rem" : "2.15rem",
    filter: centered ? `drop-shadow(0 0 0.45rem ${color}66)` : undefined,
  };
}

export function getSpatialCarouselLabelStyle(
  color: string,
  centered: boolean,
) {
  return {
    color: centered ? color : undefined,
    fontSize: centered ? "0.54rem" : "0.47rem",
    lineHeight: centered ? "0.62rem" : "0.55rem",
  };
}


export function getSpatialCarouselDragStepPx(velocityPxPerMs: number): number {
  const velocity = Number.isFinite(velocityPxPerMs) ? Math.max(0, velocityPxPerMs) : 0;
  return Math.max(
    SPATIAL_CAROUSEL_MIN_CONTINUOUS_STEP_PX,
    SPATIAL_CAROUSEL_CONTINUOUS_STEP_PX - velocity * SPATIAL_CAROUSEL_VELOCITY_STEP_FACTOR,
  );
}

export interface UseSpatialCarouselOptions {
  itemCount: number;
  selectedIndex: number;
  settleDelayMs?: number;
  onSettledIndex?: (index: number) => void;
}

export function useSpatialCarousel({
  itemCount,
  selectedIndex,
  settleDelayMs = SPATIAL_CAROUSEL_SETTLE_DELAY_MS,
  onSettledIndex,
}: UseSpatialCarouselOptions) {
  const normalizedSelectedIndex =
    itemCount > 0 ? Math.min(Math.max(selectedIndex, 0), itemCount - 1) : 0;
  const [centerIndex, setCenterIndex] = useState(normalizedSelectedIndex);
  const [isInteracting, setIsInteracting] = useState(false);
  const pointerStartX = useRef<number | null>(null);
  const pointerLastX = useRef<number | null>(null);
  const pointerLastTime = useRef<number | null>(null);
  const dragRemainderX = useRef(0);
  const draggedRef = useRef(false);
  const onSettledIndexRef = useRef(onSettledIndex);
  onSettledIndexRef.current = onSettledIndex;

  useEffect(() => {
    setCenterIndex(normalizedSelectedIndex);
  }, [normalizedSelectedIndex, itemCount]);

  useEffect(() => {
    if (
      itemCount <= 0 ||
      isInteracting ||
      centerIndex === normalizedSelectedIndex ||
      !onSettledIndexRef.current
    ) {
      return undefined;
    }
    const settleTimer = window.setTimeout(() => {
      onSettledIndexRef.current?.(centerIndex);
    }, settleDelayMs);
    return () => window.clearTimeout(settleTimer);
  }, [centerIndex, isInteracting, itemCount, normalizedSelectedIndex, settleDelayMs]);

  const moveCenter = (direction: -1 | 1) => {
    if (itemCount <= 0) return;
    setCenterIndex((current) => (current + direction + itemCount) % itemCount);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const now = performance.now();
    pointerStartX.current = event.clientX;
    pointerLastX.current = event.clientX;
    pointerLastTime.current = now;
    dragRemainderX.current = 0;
    draggedRef.current = false;
    setIsInteracting(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null || pointerLastX.current === null) return;
    const now = performance.now();
    const lastTime = pointerLastTime.current ?? now;
    const deltaX = event.clientX - pointerLastX.current;
    const elapsedMs = Math.max(1, now - lastTime);
    const velocityPxPerMs = Math.abs(deltaX) / elapsedMs;

    pointerLastX.current = event.clientX;
    pointerLastTime.current = now;

    if (Math.abs(event.clientX - pointerStartX.current) > SPATIAL_CAROUSEL_DRAG_DETECT_PX) {
      draggedRef.current = true;
    }
    if (!draggedRef.current || deltaX === 0) return;

    dragRemainderX.current += deltaX;
    const stepPx = getSpatialCarouselDragStepPx(velocityPxPerMs);
    while (Math.abs(dragRemainderX.current) >= stepPx) {
      const direction: -1 | 1 = dragRemainderX.current < 0 ? 1 : -1;
      moveCenter(direction);
      dragRemainderX.current += dragRemainderX.current < 0 ? stepPx : -stepPx;
    }
  };

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartX.current = null;
    pointerLastX.current = null;
    pointerLastTime.current = null;
    dragRemainderX.current = 0;
    setIsInteracting(false);
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
    releasePointer(event);
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartX.current = null;
    pointerLastX.current = null;
    pointerLastTime.current = null;
    dragRemainderX.current = 0;
    draggedRef.current = false;
    setIsInteracting(false);
    releasePointer(event);
  };

  return {
    centerIndex,
    isInteracting,
    setCenterIndex,
    moveCenter,
    draggedRef,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
