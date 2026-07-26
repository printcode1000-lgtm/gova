import { SpeechRecognition as NativeSpeechRecognition } from '@capgo/capacitor-speech-recognition';
import { Capacitor } from '@capacitor/core';

export type SpeechRecognitionLanguage = 'ar-SA' | 'en-US';

export interface SpeechRecognitionAdapter {
  isAvailable(): Promise<boolean>;
  start(language: SpeechRecognitionLanguage): Promise<string>;
  stop(): Promise<void>;
}

interface BrowserSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    readonly length: number;
    [index: number]: {
      readonly isFinal: boolean;
      readonly 0: { readonly transcript: string };
    };
  };
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

class NativeSpeechRecognitionAdapter implements SpeechRecognitionAdapter {
  async isAvailable(): Promise<boolean> {
    const result = await NativeSpeechRecognition.available();
    return result.available;
  }

  async start(language: SpeechRecognitionLanguage): Promise<string> {
    let permission = await NativeSpeechRecognition.checkPermissions();
    if (permission.speechRecognition !== 'granted') {
      permission = await NativeSpeechRecognition.requestPermissions();
    }

    if (permission.speechRecognition !== 'granted') {
      throw new Error('Speech recognition permission was not granted.');
    }

    const result = await NativeSpeechRecognition.start({
      language,
      maxResults: 1,
      partialResults: false,
      popup: false,
      addPunctuation: true,
    });

    return result.matches?.[0]?.trim() ?? '';
  }

  async stop(): Promise<void> {
    try {
      await NativeSpeechRecognition.forceStop({ timeout: 800 });
    } catch {
      await NativeSpeechRecognition.stop();
    }
  }
}

class WebSpeechRecognitionAdapter implements SpeechRecognitionAdapter {
  private recognition: BrowserSpeechRecognition | null = null;
  private settleActive: ((transcript: string) => void) | null = null;

  async isAvailable(): Promise<boolean> {
    return Boolean(this.getConstructor());
  }

  start(language: SpeechRecognitionLanguage): Promise<string> {
    const Recognition = this.getConstructor();
    if (!Recognition) {
      return Promise.reject(new Error('Speech recognition is not supported by this browser.'));
    }

    return new Promise<string>((resolve, reject) => {
      const recognition = new Recognition();
      let finalTranscript = '';
      let settled = false;

      const settle = (transcript: string) => {
        if (settled) return;
        settled = true;
        this.recognition = null;
        this.settleActive = null;
        resolve(transcript.trim());
      };

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;
      recognition.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          if (event.results[index].isFinal) {
            finalTranscript += event.results[index][0].transcript;
          }
        }
      };
      recognition.onerror = (event) => {
        if (settled) return;
        settled = true;
        this.recognition = null;
        this.settleActive = null;
        reject(new Error(`Speech recognition failed: ${event.error}`));
      };
      recognition.onend = () => settle(finalTranscript);

      this.recognition = recognition;
      this.settleActive = settle;

      try {
        recognition.start();
      } catch (error) {
        settled = true;
        this.recognition = null;
        this.settleActive = null;
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    const recognition = this.recognition;
    if (!recognition) return;

    try {
      recognition.stop();
    } catch {
      recognition.abort();
      this.settleActive?.('');
    }
  }

  private getConstructor(): BrowserSpeechRecognitionConstructor | undefined {
    if (typeof window === 'undefined') return undefined;
    return window.SpeechRecognition ?? window.webkitSpeechRecognition;
  }
}

export function createSpeechRecognitionAdapter(): SpeechRecognitionAdapter {
  return Capacitor.isNativePlatform()
    ? new NativeSpeechRecognitionAdapter()
    : new WebSpeechRecognitionAdapter();
}
