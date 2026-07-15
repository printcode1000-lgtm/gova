import {
  createSpeechRecognitionAdapter,
  type SpeechRecognitionAdapter,
  type SpeechRecognitionLanguage,
} from '@/platform/speech/speech-recognition-adapter';

type VoiceField = HTMLInputElement | HTMLTextAreaElement;

export interface VoiceInputScannerOptions {
  language: SpeechRecognitionLanguage;
  startLabel: string;
  stopLabel: string;
}

interface VoiceBinding {
  button: HTMLButtonElement;
  field: VoiceField;
  host: HTMLElement;
  resizeObserver: ResizeObserver | null;
  syncPosition: () => void;
}

const UNSUPPORTED_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'date',
  'datetime-local',
  'email',
  'file',
  'hidden',
  'image',
  'month',
  'password',
  'radio',
  'range',
  'reset',
  'submit',
  'time',
  'url',
  'week',
]);

/** Physical size (px) of the injected microphone button (matches CSS width/height: 2.5rem @ 16px base). */
const VOICE_BUTTON_SIZE = 40;

/** Minimum gap (px) between the mic button and adjacent elements or the field edge. */
const VOICE_EDGE_GAP = 6;

/** Generates a simple tone using the Web Audio API for user feedback. */
function playTone(frequency: number, type: OscillatorType, duration: number): void {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio autoplay restrictions or failure
  }
}

export class VoiceInputScanner {
  private readonly adapter: SpeechRecognitionAdapter;
  private readonly bindings = new Map<VoiceField, VoiceBinding>();
  private readonly passwordFields = new WeakSet<HTMLInputElement>();
  private observer: MutationObserver | null = null;
  private activeBinding: VoiceBinding | null = null;
  private sessionId = 0;
  private options: VoiceInputScannerOptions;

  constructor(options: VoiceInputScannerOptions) {
    this.options = options;
    this.adapter = createSpeechRecognitionAdapter();
  }

  async start(): Promise<void> {
    if (typeof document === 'undefined' || this.observer) return;

    let available = false;
    try {
      available = await this.adapter.isAvailable();
    } catch (error) {
      console.error('[VoiceInput] Availability check failed.', error);
    }

    if (!available) return;

    this.scan(document.body);
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => this.scan(node));
        } else if (mutation.target instanceof HTMLInputElement || mutation.target instanceof HTMLTextAreaElement) {
          this.refreshField(mutation.target);
        }
      }

      this.removeDisconnectedBindings();
      this.bindings.forEach((binding) => binding.syncPosition());
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['type', 'disabled', 'readonly', 'class', 'data-voice-input'],
    });
  }

  updateOptions(options: VoiceInputScannerOptions): void {
    this.options = options;
    this.bindings.forEach(({ button }) => {
      const recording = button.classList.contains('asol-voice-button--recording');
      const label = recording ? options.stopLabel : options.startLabel;
      button.title = label;
      button.setAttribute('aria-label', label);
    });
  }

  async destroy(): Promise<void> {
    this.observer?.disconnect();
    this.observer = null;
    this.sessionId += 1;

    try {
      await this.adapter.stop();
    } catch {
      // The recognizer may already be stopped by the operating system.
    }

    Array.from(this.bindings.values()).forEach((binding) => this.removeBinding(binding));
    this.bindings.clear();
    this.activeBinding = null;
  }

  private scan(node: Node): void {
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      this.refreshField(node);
    }

    if (!(node instanceof Element || node instanceof Document || node instanceof DocumentFragment)) return;
    node.querySelectorAll<VoiceField>('input, textarea').forEach((field) => this.refreshField(field));
  }

  private refreshField(field: VoiceField): void {
    if (field instanceof HTMLInputElement && field.type === 'password') {
      this.passwordFields.add(field);
    }
    const binding = this.bindings.get(field);
    if (!this.isEligible(field)) {
      if (binding) this.removeBinding(binding);
      return;
    }

    if (!binding) this.addBinding(field);
  }

  private isEligible(field: VoiceField): boolean {
    if (!field.isConnected || field.disabled || field.readOnly) return false;
    if (
      field.dataset.voiceInput === 'off' ||
      field.classList.contains('no-voice') ||
      field.closest('[data-voice-input="off"]')
    ) {
      return false;
    }
    if (field.autocomplete === 'one-time-code') return false;
    if (field.maxLength === 1) return false;

    if (field instanceof HTMLInputElement) {
      if (this.passwordFields.has(field)) return false;
      if (UNSUPPORTED_INPUT_TYPES.has(field.type)) return false;
      const identity = `${field.id} ${field.name} ${field.autocomplete} ${field.getAttribute('data-asol-autofill') || ''}`.toLowerCase();
      if (identity.includes('password') || identity.includes('passcode')) return false;
    }

    return Boolean(field.parentElement);
  }

  private addBinding(field: VoiceField): void {
    const host = field.parentElement;
    if (!host) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'asol-voice-button';
    button.dataset.voiceInputButton = 'true';
    button.title = this.options.startLabel;
    button.setAttribute('aria-label', this.options.startLabel);
    button.setAttribute('aria-pressed', 'false');
    button.appendChild(this.createMicrophoneIcon());

    const computedStyle = window.getComputedStyle(field);
    field.dataset.voiceOriginalPaddingLeft = computedStyle.paddingLeft;
    field.dataset.voiceOriginalPaddingRight = computedStyle.paddingRight;

    field.classList.add('asol-voice-field');
    host.classList.add('asol-voice-host');
    host.appendChild(button);

    const binding: VoiceBinding = {
      button,
      field,
      host,
      resizeObserver: null,
      syncPosition: () => this.syncPosition(binding),
    };

    button.addEventListener('click', () => void this.toggleRecording(binding));

    if (typeof ResizeObserver !== 'undefined') {
      binding.resizeObserver = new ResizeObserver(binding.syncPosition);
      binding.resizeObserver.observe(field);
      binding.resizeObserver.observe(host);
    }
    window.addEventListener('resize', binding.syncPosition);

    this.bindings.set(field, binding);
    binding.syncPosition();
    requestAnimationFrame(binding.syncPosition);
  }

  private async toggleRecording(binding: VoiceBinding): Promise<void> {
    if (this.activeBinding === binding) {
      this.sessionId += 1;
      this.setRecording(binding, false);
      this.activeBinding = null;
      this.restorePlaceholder(binding.field);
      playTone(440, 'sine', 0.15);
      try {
        await this.adapter.stop();
      } catch (error) {
        console.error('[VoiceInput] Failed to stop speech recognition.', error);
      }
      return;
    }

    if (this.activeBinding) {
      this.setRecording(this.activeBinding, false);
      this.restorePlaceholder(this.activeBinding.field);
      this.activeBinding = null;
      try {
        await this.adapter.stop();
      } catch {
        // Starting the new session is still safe after an operating-system auto-stop.
      }
    }

    const currentSession = ++this.sessionId;
    this.activeBinding = binding;
    this.setRecording(binding, true);
    this.setListeningPlaceholder(binding.field);
    playTone(880, 'sine', 0.12);

    try {
      const transcript = await this.adapter.start(this.options.language);
      if (currentSession === this.sessionId && transcript && binding.field.isConnected) {
        this.insertTranscript(binding.field, transcript);
        playTone(660, 'sine', 0.15);
      }
    } catch (error) {
      console.error('[VoiceInput] Speech recognition failed.', error);
      if (currentSession === this.sessionId) {
        this.triggerErrorFeedback(binding.button);
      }
    } finally {
      if (currentSession === this.sessionId) {
        this.setRecording(binding, false);
        this.restorePlaceholder(binding.field);
        this.activeBinding = null;
      }
    }
  }

  private insertTranscript(field: VoiceField, rawTranscript: string): void {
    const numericOnly = this.isNumericField(field);
    const transcript = numericOnly ? this.extractAsciiDigits(rawTranscript) : rawTranscript.trim();
    if (!transcript) return;

    const oldValue = field.value;
    const supportsSelection = !(field instanceof HTMLInputElement && field.type === 'number');
    const selectionStart = supportsSelection && typeof field.selectionStart === 'number'
      ? field.selectionStart
      : oldValue.length;
    const selectionEnd = supportsSelection && typeof field.selectionEnd === 'number'
      ? field.selectionEnd
      : oldValue.length;
    const needsSpace = !numericOnly && selectionStart > 0 && !/\s$/.test(oldValue.slice(0, selectionStart));
    const insertedText = `${needsSpace ? ' ' : ''}${transcript}${numericOnly ? '' : ' '}`;
    const nextValue = oldValue.slice(0, selectionStart) + insertedText + oldValue.slice(selectionEnd);

    this.setNativeValue(field, nextValue);
    field.focus();

    if (supportsSelection) {
      const nextPosition = selectionStart + insertedText.length;
      field.setSelectionRange(nextPosition, nextPosition);
    }

    field.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: insertedText,
      inputType: 'insertText',
    }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private setNativeValue(field: VoiceField, value: string): void {
    const prototype = field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    setter?.call(field, value);
  }

  private isNumericField(field: VoiceField): boolean {
    if (!(field instanceof HTMLInputElement)) return false;
    return field.type === 'number'
      || field.type === 'tel'
      || field.inputMode === 'numeric'
      || field.inputMode === 'decimal';
  }

  private extractAsciiDigits(value: string): string {
    return value
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
      .replace(/\D/g, '');
  }

  private setRecording(binding: VoiceBinding, recording: boolean): void {
    binding.button.classList.toggle('asol-voice-button--recording', recording);
    binding.button.setAttribute('aria-pressed', String(recording));
    const label = recording ? this.options.stopLabel : this.options.startLabel;
    binding.button.title = label;
    binding.button.setAttribute('aria-label', label);
  }

  private syncPosition(binding: VoiceBinding): void {
    const { button, field, host } = binding;
    if (!field.isConnected || !button.isConnected) return;

    const fieldRect = field.getBoundingClientRect();
    const hostRect  = host.getBoundingClientRect();
    const isRtl     = getComputedStyle(host).direction === 'rtl';

    // ── Vertical centering ──────────────────────────────────────────────────
    const top = field instanceof HTMLTextAreaElement
      ? fieldRect.top - hostRect.top + 8
      : fieldRect.top - hostRect.top + (fieldRect.height - VOICE_BUTTON_SIZE) / 2;
    button.style.top = `${Math.max(0, top)}px`;

    // ── Parse original paddings from dataset ──────────────────────────────
    const origPaddingLeft  = parseFloat(field.dataset.voiceOriginalPaddingLeft || '16');
    const origPaddingRight = parseFloat(field.dataset.voiceOriginalPaddingRight || '16');

    if (isRtl) {
      // Mic sits on the physical LEFT side.
      // Position: flush with the field's left boundary relative to host, shifted by orig padding + edge gap.
      const micLeft = (fieldRect.left - hostRect.left) + origPaddingLeft + VOICE_EDGE_GAP;
      button.style.left  = `${micLeft}px`;
      button.style.right = 'auto';

      // Set explicit padding-left to base + button size + gap
      const neededPaddingLeft = origPaddingLeft + VOICE_BUTTON_SIZE + VOICE_EDGE_GAP;
      field.style.setProperty('padding-left', `${neededPaddingLeft}px`, 'important');
      // Keep original padding-right
      field.style.setProperty('padding-right', `${origPaddingRight}px`, 'important');
    } else {
      // Mic sits on the physical RIGHT side.
      // Position: flush with the field's right boundary relative to host (measured from host right), shifted by orig padding + edge gap.
      const micFromRight = (hostRect.right - fieldRect.right) + origPaddingRight + VOICE_EDGE_GAP;
      button.style.right = `${micFromRight}px`;
      button.style.left  = 'auto';

      // Set explicit padding-right to base + button size + gap
      const neededPaddingRight = origPaddingRight + VOICE_BUTTON_SIZE + VOICE_EDGE_GAP;
      field.style.setProperty('padding-right', `${neededPaddingRight}px`, 'important');
      // Keep original padding-left
      field.style.setProperty('padding-left', `${origPaddingLeft}px`, 'important');
    }
  }

  private removeDisconnectedBindings(): void {
    Array.from(this.bindings.values()).forEach((binding) => {
      if (!binding.field.isConnected || !binding.button.isConnected) this.removeBinding(binding);
    });
  }

  private removeBinding(binding: VoiceBinding): void {
    if (this.activeBinding === binding) {
      this.sessionId += 1;
      this.activeBinding = null;
      void this.adapter.stop().catch(() => undefined);
    }

    binding.resizeObserver?.disconnect();
    window.removeEventListener('resize', binding.syncPosition);
    binding.button.remove();
    binding.field.classList.remove('asol-voice-field', 'asol-voice-field--rtl-host');
    binding.field.style.removeProperty('padding-right');
    binding.field.style.removeProperty('padding-left');
    this.restorePlaceholder(binding.field);
    this.bindings.delete(binding.field);

    if (!binding.host.querySelector('[data-voice-input-button="true"]')) {
      binding.host.classList.remove('asol-voice-host');
    }
  }

  private createMicrophoneIcon(): SVGSVGElement {
    const namespace = 'http://www.w3.org/2000/svg';
    const icon = document.createElementNS(namespace, 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '2');
    icon.setAttribute('stroke-linecap', 'round');
    icon.setAttribute('stroke-linejoin', 'round');

    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3 M8 22h8');
    icon.appendChild(path);
    return icon;
  }

  private setListeningPlaceholder(field: VoiceField): void {
    if (field.dataset.voiceOriginalPlaceholder !== undefined) return;
    field.dataset.voiceOriginalPlaceholder = field.placeholder || '';
    field.placeholder = this.options.language === 'ar-SA'
      ? 'جاري الاستماع... تحدث الآن'
      : 'Listening... Speak now';
  }

  private restorePlaceholder(field: VoiceField): void {
    if (field.dataset.voiceOriginalPlaceholder !== undefined) {
      field.placeholder = field.dataset.voiceOriginalPlaceholder;
      delete field.dataset.voiceOriginalPlaceholder;
    }
  }

  private triggerErrorFeedback(button: HTMLButtonElement): void {
    playTone(220, 'sawtooth', 0.25);
    button.classList.add('asol-voice-button--error');
    setTimeout(() => {
      button.classList.remove('asol-voice-button--error');
    }, 450);
  }
}
