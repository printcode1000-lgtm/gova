'use client';

import { Crosshair, LocateFixed, Maximize, Minus, Navigation, Plus, RotateCcw, Share2, X } from 'lucide-react';
import type { AsolMapControlId, ToolbarConfig, ToolbarItemConfig } from './types';
import { uiAttributes } from "@asol/ui-registry-core";

const icon = { gps: LocateFixed, share: Share2, reset: RotateCcw, close: X, recenter: Crosshair, compass: Navigation, fullscreen: Maximize } as const;

/**
 * A sealed package cannot reach the application's translation dictionary, and it
 * should not: the host owns its own wording. Every control label therefore comes
 * from `toolbar[id].label`; these English strings are only the fallback for a
 * consumer that enabled a control without naming it.
 */
const defaultLabels: Record<AsolMapControlId, string> = {
  gps: 'Locate me',
  share: 'Share',
  reset: 'Reset',
  close: 'Close',
  recenter: 'Recenter',
  zoom: 'Zoom',
  compass: 'North',
  scale: 'Scale',
  fullscreen: 'Fullscreen',
  layers: 'Layers',
  measure: 'Measure',
  drawing: 'Draw',
};

const item = (value: boolean | ToolbarItemConfig | undefined): ToolbarItemConfig | null => value === true ? { enabled: true } : !value || value.enabled === false ? null : value;

interface Props { config?: ToolbarConfig; onAction: (id: AsolMapControlId, value?: 'in' | 'out') => void; toolbarLabel?: string; zoomInLabel?: string; zoomOutLabel?: string }
export function AsolMapControls({ config = {}, onAction, toolbarLabel = 'Map controls', zoomInLabel = 'Zoom in', zoomOutLabel = 'Zoom out' }: Props) {
  const controls = (Object.keys(config) as AsolMapControlId[]).filter((id) => item(config[id]));
  if (!controls.length) return null;
  return <div {...uiAttributes({ uid: "packages.map-core.asol-map-controls.div-P8M0Xw", id: "packages.map-core.asol-map-controls.div" })} className="asol-map__controls" role="toolbar" aria-label={toolbarLabel}>
    {controls.map((id) => {
      const details = item(config[id])!;
      const label = details.label ?? defaultLabels[id];
      if (id === 'zoom') return <div className="asol-map__control-group" key={id} {...uiAttributes({ uid: "packages.map-core.asol-map-controls.div.2-C9mxem", id: "packages.map-core.asol-map-controls.div.2" })}>
        <button {...uiAttributes({ uid: "packages.map-core.asol-map-controls.button-ugXzJ6", id: "packages.map-core.asol-map-controls.button" })} type="button" aria-label={zoomInLabel} onClick={() => onAction(id, 'in')}><Plus aria-hidden="true" /><span {...uiAttributes({ uid: "packages.map-core.asol-map-controls.span-Xf5oEA", id: "packages.map-core.asol-map-controls.span" })} className="asol-map__control-label">+</span></button>
        <button {...uiAttributes({ uid: "packages.map-core.asol-map-controls.button.2-s5cT5P", id: "packages.map-core.asol-map-controls.button.2" })} type="button" aria-label={zoomOutLabel} onClick={() => onAction(id, 'out')}><Minus aria-hidden="true" /><span {...uiAttributes({ uid: "packages.map-core.asol-map-controls.span.2-AYH2F4", id: "packages.map-core.asol-map-controls.span.2" })} className="asol-map__control-label">−</span></button>
      </div>;
      if (!(id in icon)) return null;
      const Icon = icon[id as keyof typeof icon];
      return <button className="asol-map__control" type="button" key={id} {...uiAttributes({ uid: "packages.map-core.asol-map-controls.button.3-uI5XO0", id: "packages.map-core.asol-map-controls.button.3" })} aria-label={label} onClick={() => onAction(id)}><Icon aria-hidden="true" /><span {...uiAttributes({ uid: "packages.map-core.asol-map-controls.span.3-ArGUo0", id: "packages.map-core.asol-map-controls.span.3" })} className="asol-map__control-label">{label}</span></button>;
    })}
  </div>;
}
