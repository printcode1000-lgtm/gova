"use client";

import { TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@/lib/i18n";

export interface TrendingRibbonItem {
  label: string;
  action: string;
}

export interface TrendingRibbonConfig {
  label: string;
  items: TrendingRibbonItem[];
  onAction?: (action: string) => void;
}

export interface TrendingRibbonProps {
  config: TrendingRibbonConfig;
}

export function TrendingRibbon({ config }: TrendingRibbonProps) {
  const { t, isRTL } = useTranslation();
  const { label, items, onAction } = config || {};

  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const velXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isHoveredRef = useRef(false);
  const isLongPressedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  const hasItems = items && items.length > 0;

  // Replicate items dynamically to have at least 15 items for smooth infinite loop
  const minItems = 15;
  let replicationFactor = 1;
  replicationFactor = hasItems ? Math.ceil(minItems / items.length) : 1;
  if (replicationFactor < 2) {
    replicationFactor = 2; // Need at least two sets to scroll infinitely
  }

  const loopItems: TrendingRibbonItem[] = [];
  if (hasItems) {
    for (let i = 0; i < replicationFactor; i++) {
      loopItems.push(...items);
    }
  }

  useEffect(() => {
    if (!hasItems) return;
    const wrapOffset = () => {
      const track = trackRef.current;
      if (!track) return;
      const totalWidth = track.scrollWidth;
      const singleWidth = totalWidth / replicationFactor;
      if (singleWidth <= 0) return;

      if (scrollLeftRef.current >= singleWidth) {
        scrollLeftRef.current = scrollLeftRef.current % singleWidth;
      } else if (scrollLeftRef.current < 0) {
        scrollLeftRef.current =
          (scrollLeftRef.current % singleWidth) + singleWidth;
      }
    };

    const updateTransform = () => {
      const track = trackRef.current;
      if (track) {
        // Offset is in LTR direction, so we translate negative scrollLeft
        track.style.transform = `translate3d(${-scrollLeftRef.current}px, 0, 0)`;
      }
    };

    const track = trackRef.current;
    if (track) {
      const singleWidth = track.scrollWidth / replicationFactor;
      scrollLeftRef.current = isRTL ? singleWidth : 0;
      updateTransform();
    }

    const loop = () => {
      if (isDownRef.current) {
        // Dragging is updated in event handler
      } else if (Math.abs(velXRef.current) > 0.05) {
        // Momentum scrolling
        scrollLeftRef.current += velXRef.current;
        velXRef.current *= 0.95; // friction

        wrapOffset();
        updateTransform();
      } else if (!isHoveredRef.current && !isLongPressedRef.current) {
        // Arabic moves left-to-right; English moves right-to-left.
        scrollLeftRef.current += isRTL ? -0.3 : 0.3;

        wrapOffset();
        updateTransform();
      }
      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, [hasItems, isRTL, items, replicationFactor]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDownRef.current = true;
    isDraggingRef.current = false;
    isLongPressedRef.current = false;
    startXRef.current = e.clientX;
    velXRef.current = 0;
    lastXRef.current = e.clientX;
    lastTimeRef.current = Date.now();

    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      if (isDownRef.current && !isDraggingRef.current) {
        isLongPressedRef.current = true;
      }
    }, 400);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDownRef.current) return;
    const currentX = e.clientX;
    const currentTime = Date.now();
    const deltaX = currentX - startXRef.current;

    if (Math.abs(deltaX) > 6) {
      isDraggingRef.current = true;
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    const dt = currentTime - lastTimeRef.current;
    if (dt > 0) {
      const dx = lastXRef.current - currentX;
      velXRef.current = velXRef.current * 0.6 + (dx / dt) * 16 * 0.4;
    }

    scrollLeftRef.current += lastXRef.current - currentX;

    // Wrap immediately
    const track = trackRef.current;
    if (track) {
      const totalWidth = track.scrollWidth;
      const singleWidth = totalWidth / replicationFactor;
      if (singleWidth > 0) {
        if (scrollLeftRef.current >= singleWidth) {
          scrollLeftRef.current = scrollLeftRef.current % singleWidth;
        } else if (scrollLeftRef.current < 0) {
          scrollLeftRef.current =
            (scrollLeftRef.current % singleWidth) + singleWidth;
        }
      }
      track.style.transform = `translate3d(${-scrollLeftRef.current}px, 0, 0)`;
    }

    lastXRef.current = currentX;
    lastTimeRef.current = currentTime;
  };

  const handlePointerUp = () => {
    isDownRef.current = false;
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isLongPressedRef.current) {
      velXRef.current = 0;
      isLongPressedRef.current = false;
    }
    // Delay clearing the dragging flag slightly so it can block click event
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  };

  const handleItemClick = (e: React.MouseEvent, action: string) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onAction?.(action);
  };

  if (!hasItems) return null;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={() => {
        isHoveredRef.current = true;
      }}
      onPointerLeave={() => {
        isHoveredRef.current = false;
        isDownRef.current = false;
        if (longPressTimerRef.current) {
          window.clearTimeout(longPressTimerRef.current);
        }
      }}
      className="asol-section-tonal-error overflow-hidden relative flex items-center py-2 mx-2 sm:mx-4 rounded-xl touch-pan-y cursor-grab active:cursor-grabbing pointer-events-auto select-none"
    >
      <div className="flex items-center gap-2 px-4 z-10 border-s border-outline-variant/40 shrink-0 asol-tonal-error rounded-e-xl py-1">
        <TrendingUp
          className="w-5 h-5 text-error animate-pulse-subtle"
          aria-hidden
        />
        <span className="text-xs font-bold text-on-error-container">
          {t(label)}
        </span>
      </div>

      <div className="flex-1 overflow-hidden" dir="ltr">
        <div
          ref={trackRef}
          className="flex w-max will-change-transform gap-8 items-center pr-4"
        >
          {loopItems.map((item, i) => (
            <span key={i} className="flex items-center gap-8 shrink-0">
              <button
                dir={isRTL ? "rtl" : "ltr"}
                type="button"
                onClick={(e) => handleItemClick(e, item.action)}
                className="text-sm text-on-surface-variant hover:text-primary transition-colors focus:outline-hidden focus-visible:underline cursor-pointer"
                aria-label={item.label}
              >
                {item.label}
              </button>
              <span className="text-error font-bold">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
