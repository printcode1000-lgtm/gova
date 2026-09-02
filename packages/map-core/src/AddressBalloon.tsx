'use client';

import { Check, MapPin, X } from 'lucide-react';
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // A balloon that opens without focus costs the user an extra tap on a phone.
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const requireValue = config.requireValue ?? true;
  const trimmed = value.trim();
  const canConfirm = !requireValue || trimmed.length > 0;

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm(trimmed);
  };

  return (
    <form id="pkg-map-core-src-addressballoon-form-1-lzw74h"
      className="asol-map__address"
      onSubmit={(event) => {
        event.preventDefault();
        confirm();
      }}
    >
      <p id="pkg-map-core-src-addressballoon-text-2-xzm2m7" className="asol-map__address-title">
        <MapPin aria-hidden="true" />
        <span id="pkg-map-core-src-addressballoon-text-3-lur0ma">{config.title ?? 'Address'}</span>
      </p>

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

      <div id="pkg-map-core-src-addressballoon-div-5-kfjgas" className="asol-map__address-actions">
        <button id="pkg-map-core-src-addressballoon-button-6-kpqkv9"
          type="button"
          className="asol-map__address-button asol-map__address-button--ghost"
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
          <span id="pkg-map-core-src-addressballoon-text-7-3cdvfp">{config.cancelLabel ?? 'Cancel'}</span>
        </button>
        <button id="pkg-map-core-src-addressballoon-button-8-bafj0y"
          type="submit"
          className="asol-map__address-button asol-map__address-button--primary"
          disabled={!canConfirm}
        >
          <Check aria-hidden="true" />
          <span id="pkg-map-core-src-addressballoon-text-9-8c8kel">{config.confirmLabel ?? 'Confirm'}</span>
        </button>
      </div>
    </form>
  );
}
