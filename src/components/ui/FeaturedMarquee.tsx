'use client';

import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { shouldUseUnoptimizedImage } from '@/lib/images/external-image';

export interface FeaturedMarqueeItem {
  id: string;
  title: string;
  price: string;
  image: string;
  action: string;
}

export interface FeaturedMarqueeConfig {
  sectionTitle: string;
  items: FeaturedMarqueeItem[];
  onAction?: (action: string) => void;
}

export interface FeaturedMarqueeProps {
  config: FeaturedMarqueeConfig;
}

export function FeaturedMarquee({ config }: FeaturedMarqueeProps) {
  const { t } = useTranslation();
  const { sectionTitle, items, onAction } = config || {};

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

  if (!items || items.length === 0) return null;

  // Duplicate items array to ensure seamless infinite horizontal scrolling (marquee)
  // Replicate items dynamically to have at least 12 items for smooth wrapping
  const minItems = 12;
  let replicationFactor = 1;
  let marqueeItems = [...items];
  
  replicationFactor = Math.ceil(minItems / items.length);
  if (replicationFactor < 2) {
    replicationFactor = 2; // Need at least two sets to scroll infinitely
  }
  
  marqueeItems = [];
  for (let i = 0; i < replicationFactor; i++) {
    marqueeItems.push(...items);
  }

  useEffect(() => {
    const wrapOffset = () => {
      const track = trackRef.current;
      if (!track) return;
      const totalWidth = track.scrollWidth;
      const singleWidth = totalWidth / replicationFactor;
      if (singleWidth <= 0) return;

      if (scrollLeftRef.current >= singleWidth) {
        scrollLeftRef.current = scrollLeftRef.current % singleWidth;
      } else if (scrollLeftRef.current < 0) {
        scrollLeftRef.current = (scrollLeftRef.current % singleWidth) + singleWidth;
      }
    };

    const updateTransform = () => {
      const track = trackRef.current;
      if (track) {
        track.style.transform = `translate3d(${-scrollLeftRef.current}px, 0, 0)`;
      }
    };

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
        // Auto scroll
        scrollLeftRef.current += 0.8; // px per frame

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
  }, [items, replicationFactor]);

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
          scrollLeftRef.current = (scrollLeftRef.current % singleWidth) + singleWidth;
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

  return (
    <section className="space-y-3 overflow-hidden select-none">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-tertiary flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-tertiary animate-pulse-subtle" aria-hidden />
          {t(sectionTitle)}
        </h3>
        <div className="title-line-contact"></div>
      </div>

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerEnter={() => { isHoveredRef.current = true; }}
        onPointerLeave={() => {
          isHoveredRef.current = false;
          isDownRef.current = false;
          if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
          }
        }}
        className="relative overflow-hidden py-4 rounded-xl gova-surface-neutral touch-pan-y cursor-grab active:cursor-grabbing pointer-events-auto"
        dir="ltr"
      >
        <div
          ref={trackRef}
          className="flex w-max will-change-transform gap-4 pr-4"
        >
          {marqueeItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              role="button"
              tabIndex={0}
              aria-label={item.title}
              onClick={(e) => handleItemClick(e, item.action)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAction?.(item.action); } }}
              className="shrink-0 w-40 rounded-xl p-2 gova-card-tonal gova-card-tonal-tertiary cursor-pointer active:scale-95 transition-transform focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Image
                src={item.image}
                alt={item.title}
                width={160}
                height={160}
                className="w-full aspect-square object-cover rounded-lg mb-2 pointer-events-none"
                unoptimized={shouldUseUnoptimizedImage(item.image)}
              />
              <p className="truncate text-xs font-semibold text-on-surface pointer-events-none">{item.title}</p>
              <p className="text-xs font-bold text-primary pointer-events-none">{item.price}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
