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
    <form
      className="asol-map__address"
      onSubmit={(event) => {
        event.preventDefault();
        confirm();
      }}
    >
      <p className="asol-map__address-title">
        <MapPin aria-hidden="true" />
        <span>{config.title ?? 'Address'}</span>
      </p>

      <input
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

      <div className="asol-map__address-actions">
        <button
          type="button"
          className="asol-map__address-button asol-map__address-button--ghost"
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
          <span>{config.cancelLabel ?? 'Cancel'}</span>
        </button>
        <button
          type="submit"
          className="asol-map__address-button asol-map__address-button--primary"
          disabled={!canConfirm}
        >
          <Check aria-hidden="true" />
          <span>{config.confirmLabel ?? 'Confirm'}</span>
        </button>
      </div>
    </form>
  );
}
