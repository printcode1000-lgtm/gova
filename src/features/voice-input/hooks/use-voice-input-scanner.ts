'use client';

import { useEffect, useRef } from 'react';

import type { Locale } from '@/lib/i18n';

import { VoiceInputScanner } from '../voice-input-scanner';

interface UseVoiceInputScannerOptions {
  locale: Locale;
  startLabel: string;
  stopLabel: string;
}

export function useVoiceInputScanner(options: UseVoiceInputScannerOptions): void {
  const scannerRef = useRef<VoiceInputScanner | null>(null);

  useEffect(() => {
    const scanner = new VoiceInputScanner({
      language: options.locale === 'ar' ? 'ar-SA' : 'en-US',
      startLabel: options.startLabel,
      stopLabel: options.stopLabel,
    });
    scannerRef.current = scanner;

    // Delay scanner start until after hydration to avoid mismatch
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void scanner.start();
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      scannerRef.current = null;
      void scanner.destroy();
    };
  }, []);

  useEffect(() => {
    scannerRef.current?.updateOptions({
      language: options.locale === 'ar' ? 'ar-SA' : 'en-US',
      startLabel: options.startLabel,
      stopLabel: options.stopLabel,
    });
  }, [options.locale, options.startLabel, options.stopLabel]);
}
