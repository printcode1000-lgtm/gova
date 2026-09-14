'use client';

import { MapPin, X } from 'lucide-react';

interface Props {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function MoveLocationBalloon({
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onDismiss,
}: Props) {
  return (
    <div
      id="pkg-map-core-src-movelocationballoon-div-1-r7m2qa"
      className="asol-map__move-confirm"
      role="dialog"
      aria-modal="false"
      aria-label={message}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <div id="pkg-map-core-src-movelocationballoon-div-2-f5k8wc" className="asol-map__move-confirm-message">
        <MapPin id="pkg-map-core-src-movelocationballoon-mappin-3-v2d9ns" aria-hidden="true" />
        <span id="pkg-map-core-src-movelocationballoon-span-4-b6q1pe">{message}</span>
      </div>
      <div id="pkg-map-core-src-movelocationballoon-div-5-h4c7mx" className="asol-map__move-confirm-actions">
        <button
          id="pkg-map-core-src-movelocationballoon-button-6-t3y8kr"
          type="button"
          className="asol-map__address-button asol-map__address-button--ghost"
          onClick={onDismiss}
        >
          <X id="pkg-map-core-src-movelocationballoon-x-7-j9p4dv" aria-hidden="true" />
          <span id="pkg-map-core-src-movelocationballoon-span-8-w2n6cg">{cancelLabel}</span>
        </button>
        <button
          id="pkg-map-core-src-movelocationballoon-button-9-m5r1zb"
          type="button"
          className="asol-map__address-button asol-map__address-button--primary"
          onClick={onConfirm}
        >
          <MapPin id="pkg-map-core-src-movelocationballoon-mappin-10-q8s3lf" aria-hidden="true" />
          <span id="pkg-map-core-src-movelocationballoon-span-11-c4v7ht">{confirmLabel}</span>
        </button>
      </div>
    </div>
  );
}
