'use client';

import { Crosshair, LocateFixed, Maximize, Minus, Navigation, Plus, RotateCcw, Save, Share2, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { GovaMapControlId, ToolbarConfig, ToolbarItemConfig } from './types';

const icon = { save: Save, gps: LocateFixed, share: Share2, reset: RotateCcw, close: X, recenter: Crosshair, compass: Navigation, fullscreen: Maximize } as const;
const translationKeys: Partial<Record<GovaMapControlId, string>> = { save: 'map.controls.save', gps: 'map.controls.gps', share: 'map.controls.share', reset: 'map.controls.reset', close: 'map.controls.close', recenter: 'map.controls.recenter', zoom: 'map.controls.zoom', compass: 'map.controls.compass', scale: 'map.controls.scale', fullscreen: 'map.controls.fullscreen' };

const item = (value: boolean | ToolbarItemConfig | undefined): ToolbarItemConfig | null => value === true ? { enabled: true } : !value || value.enabled === false ? null : value;

interface Props { config?: ToolbarConfig; onAction: (id: GovaMapControlId, value?: 'in' | 'out') => void }
export function GovaMapControls({ config = {}, onAction }: Props) {
  const { t } = useTranslation();
  const controls = (Object.keys(config) as GovaMapControlId[]).filter((id) => item(config[id]));
  if (!controls.length) return null;
  return <div className="gova-map__controls" role="toolbar" aria-label={t('map.controls.toolbar')}>
    {controls.map((id) => {
      const details = item(config[id])!;
      const label = details.label ?? t(translationKeys[id] ?? `map.controls.${id}`);
      if (id === 'zoom') return <div className="gova-map__control-group" key={id}>
        <button type="button" aria-label={t('map.controls.zoomIn')} onClick={() => onAction(id, 'in')}><Plus aria-hidden="true" /><span className="gova-map__control-label">{t('map.controls.zoomInShort')}</span></button>
        <button type="button" aria-label={t('map.controls.zoomOut')} onClick={() => onAction(id, 'out')}><Minus aria-hidden="true" /><span className="gova-map__control-label">{t('map.controls.zoomOutShort')}</span></button>
      </div>;
      if (!(id in icon)) return null;
      const Icon = icon[id as keyof typeof icon];
      return <button className="gova-map__control" type="button" key={id} aria-label={label} title={label} onClick={() => onAction(id)}><Icon aria-hidden="true" /><span className="gova-map__control-label">{label}</span></button>;
    })}
  </div>;
}
