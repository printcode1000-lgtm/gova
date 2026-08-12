'use client';

import { useVoiceInputScanner } from '@/features/voice-input/hooks/use-voice-input-scanner';
import { useTranslation } from '@/lib/i18n';

export function VoiceInputController() {
  const { locale, t } = useTranslation();

  useVoiceInputScanner({
    locale,
    startLabel: t('voiceInput.start'),
    stopLabel: t('voiceInput.stop'),
  });

  return null;
}
