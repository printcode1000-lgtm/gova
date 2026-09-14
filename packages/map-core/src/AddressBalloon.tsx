'use client';

import { Check, MapPin, Pencil, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { AddressPromptConfig } from './types';

interface Props {
  config: AddressPromptConfig;
  onConfirm: (address: string) => void;
  onDismiss: () => void;
}

/**
 * The body of the address balloon — everything inside the MapLibre popup that is
 * anchored to the pin the user just placed.
 *
 * It holds the draft address in local state rather than lifting every keystroke to the
 * host: the point of the balloon is that one confirmed action carries the coordinates
 * and their label together, so nothing leaves this component until Confirm.
 */
export function AddressBalloon({ config, onConfirm, onDismiss }: Props) {
  const [value, setValue] = useState(config.value ?? '');
  const [isEditing, setIsEditing] = useState(!(config.value?.trim()));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) return undefined;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isEditing]);

  const requireValue = config.requireValue ?? true;
  const trimmed = value.trim();
  const canConfirm = !requireValue || trimmed.length > 0;

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm(trimmed);
  };

  const stopMapInteraction = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  };

  const enterEditMode = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault();
    event.stopPropagation();
    setIsEditing(true);
  };

  return (
    <form id="pkg-map-core-src-addressballoon-form-1-lzw74h"
      className="asol-map__address"
      onClick={stopMapInteraction}
      onPointerDown={stopMapInteraction}
      onPointerUp={stopMapInteraction}
      onMouseDown={stopMapInteraction}
      onMouseUp={stopMapInteraction}
      onTouchStart={stopMapInteraction}
      onTouchEnd={stopMapInteraction}
      onSubmit={(event) => {
        event.preventDefault();
        confirm();
      }}
    >
      <p id="pkg-map-core-src-addressballoon-text-2-xzm2m7" className="asol-map__address-title">
        <MapPin aria-hidden="true" />
        <span id="pkg-map-core-src-addressballoon-text-3-lur0ma">{config.title ?? 'Address'}</span>
      </p>

      {isEditing ? (
        <input id="pkg-map-core-src-addressballoon-input-4-1er4rl"
          ref={inputRef}
          className="asol-map__address-input"
          type="text"
          value={value}
          placeholder={config.placeholder ?? 'Describe this location'}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onDismiss();
          }}
        />
      ) : (
        <p id="pkg-map-core-src-addressballoon-address-display-10-q7m4rx" className="asol-map__address-value">
          {trimmed}
        </p>
      )}

      <div id="pkg-map-core-src-addressballoon-div-5-kfjgas" className="asol-map__address-actions">
        <button id="pkg-map-core-src-addressballoon-button-6-kpqkv9"
          type="button"
          className="asol-map__address-button asol-map__address-button--ghost"
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
          <span id="pkg-map-core-src-addressballoon-text-7-3cdvfp">{config.cancelLabel ?? 'Cancel'}</span>
        </button>
        {isEditing ? (
          <button id="pkg-map-core-src-addressballoon-button-8-bafj0y"
            type="submit"
            className="asol-map__address-button asol-map__address-button--primary"
            disabled={!canConfirm}
          >
            <Check aria-hidden="true" />
            <span id="pkg-map-core-src-addressballoon-text-9-8c8kel">{config.confirmLabel ?? 'Confirm'}</span>
          </button>
        ) : (
          <button id="pkg-map-core-src-addressballoon-edit-button-11-p5d8nk"
            type="button"
            className="asol-map__address-button asol-map__address-button--primary"
            onPointerDown={stopMapInteraction}
            onPointerUp={stopMapInteraction}
            onTouchStart={stopMapInteraction}
            onTouchEnd={stopMapInteraction}
            onClick={enterEditMode}
          >
            <Pencil aria-hidden="true" />
            <span id="pkg-map-core-src-addressballoon-edit-label-12-v3c6jw">{config.editLabel ?? 'Edit'}</span>
          </button>
        )}
      </div>
    </form>
  );
}
