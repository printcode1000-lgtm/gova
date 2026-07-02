'use client';

import { Crosshair, LocateFixed, Maximize, Minus, Navigation, Plus, RotateCcw, Save, Share2, X } from 'lucide-react';
import type { GovaMapControlId, ToolbarConfig, ToolbarItemConfig } from './types';

const icon = { save: Save, gps: LocateFixed, share: Share2, reset: RotateCcw, close: X, recenter: Crosshair, compass: Navigation, fullscreen: Maximize } as const;
const defaults: Partial<Record<GovaMapControlId, string>> = { save: 'Save', gps: 'Use my location', share: 'Share', reset: 'Reset', close: 'Close', recenter: 'Recenter', zoom: 'Zoom', compass: 'Reset bearing', scale: 'Scale', fullscreen: 'Fullscreen' };

const item = (value: boolean | ToolbarItemConfig | undefined): ToolbarItemConfig | null => value === true ? { enabled: true } : !value || value.enabled === false ? null : value;

interface Props { config?: ToolbarConfig; onAction: (id: GovaMapControlId, value?: 'in' | 'out') => void }
export function GovaMapControls({ config = {}, onAction }: Props) {
  const controls = (Object.keys(config) as GovaMapControlId[]).filter((id) => item(config[id]));
  if (!controls.length) return null;
  return <div className="gova-map__controls" role="toolbar" aria-label="Map controls">
    {controls.map((id) => {
      const details = item(config[id])!;
      if (id === 'zoom') return <div className="gova-map__control-group" key={id}>
        <button type="button" aria-label="Zoom in" onClick={() => onAction(id, 'in')}><Plus aria-hidden="true" /></button>
        <button type="button" aria-label="Zoom out" onClick={() => onAction(id, 'out')}><Minus aria-hidden="true" /></button>
      </div>;
      if (!(id in icon)) return null;
      const Icon = icon[id as keyof typeof icon];
      return <button className="gova-map__control" type="button" key={id} aria-label={details.label ?? defaults[id] ?? id} title={details.label ?? defaults[id]} onClick={() => onAction(id)}><Icon aria-hidden="true" /></button>;
    })}
  </div>;
}
