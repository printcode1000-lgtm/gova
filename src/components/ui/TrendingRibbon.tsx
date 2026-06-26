'use client';

import { TrendingUp } from 'lucide-react';

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
  const { label, items, onAction } = config || {};
  if (!items || items.length === 0) return null;

  // Duplicate items for seamless infinite scrolling
  const loopItems = [...items, ...items];

  return (
    <div className="gova-section-tonal-error overflow-hidden relative flex items-center py-2 mx-2 sm:mx-4 rounded-xl">
      <div className="flex items-center gap-2 px-4 z-10 border-s border-outline-variant/40 shrink-0 gova-tonal-error rounded-e-xl py-1">
        <TrendingUp className="w-5 h-5 text-error animate-pulse-subtle" aria-hidden />
        <span className="text-xs font-bold text-on-error-container">{label}</span>
      </div>

      <div className="flex-1 overflow-hidden" dir="ltr">
        <div className="home-trending-track gap-8 items-center pr-4">
          {loopItems.map((item, i) => (
            <span key={i} className="flex items-center gap-8 shrink-0">
              <button
                type="button"
                onClick={() => onAction?.(item.action)}
                className="text-sm text-on-surface-variant hover:text-primary transition-colors focus:outline-hidden focus-visible:underline"
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
