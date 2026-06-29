# Global Voice Input System

## Purpose

GOVA provides automatic speech-to-text controls for eligible `input` and `textarea` elements across every page and feature. Pages do not need to import a microphone component or initialize speech recognition manually.

The implementation is inspired by the Suez Bazaar shared voice utility, but is adapted to GOVA's React, Next.js, localization, theme, and Capacitor architecture.

## User experience

When a page or dynamically rendered feature adds an eligible field, the system:

1. Detects the field automatically.
2. Adds a microphone button inside the field area.
3. Starts recognition after the user presses the button and grants permission when requested.
4. Uses Arabic (`ar-SA`) or English (`en-US`) according to the current application locale.
5. Inserts the final transcript at the current cursor or selection.
6. Stops automatically when speech ends or an error occurs.
7. Displays a red, glowing microphone while recognition is active.

Only one field can record at a time. Starting another field stops the previous session first.

## Recognition engines

The platform adapter selects the appropriate engine:

| Runtime | Engine |
|---|---|
| Native Android or iOS Capacitor application | `@capgo/capacitor-speech-recognition` |
| Supported web browser | Standard `SpeechRecognition` or `webkitSpeechRecognition` |
| Unsupported browser | No microphone buttons are injected |

The native engine avoids relying on speech-recognition support inside Android WebView or iOS WKWebView.

## Architecture

```text
RootLayout
  -> VoiceInputController
    -> useVoiceInputScanner
      -> VoiceInputScanner
        -> speech-recognition-adapter
          -> Native Capacitor speech plugin
          -> Browser Web Speech fallback
```

| File | Responsibility |
|---|---|
| `src/app/layout.tsx` | Mounts one global controller |
| `src/components/voice-input/VoiceInputController.tsx` | Connects application locale and translated labels |
| `src/features/voice-input/hooks/use-voice-input-scanner.ts` | Owns scanner lifecycle and locale updates |
| `src/features/voice-input/voice-input-scanner.ts` | Scans fields, creates buttons, inserts transcripts, and performs cleanup |
| `src/platform/speech/speech-recognition-adapter.ts` | Selects and isolates native or browser recognition |
| `src/app/globals.css` | Microphone placement, active state, and reduced-motion behavior |
| `src/locales/ar.json` and `src/locales/en.json` | Accessible button labels |

## Automatic scanning

The scanner runs once after the global controller mounts. It scans existing fields and then uses one `MutationObserver` to detect:

- fields added by route changes;
- fields rendered by dialogs, tabs, or conditional features;
- eligibility changes such as `disabled`, `readonly`, or `type` updates;
- fields removed from the page.

Each field is stored in a binding map to prevent duplicate buttons. Removed fields have their button, resize observer, window listener, and active recognition session cleaned up.

## Eligible fields

Textareas and normal inputs are enabled unless they are unsafe or unsuitable for voice input.

The scanner excludes:

- password fields and fields whose identity contains `password` or `passcode`;
- hidden, button, submit, reset, checkbox, radio, file, image, color, range, URL, and date/time inputs;
- disabled and read-only fields;
- one-time-code fields;
- single-character fields, such as OTP cells;
- fields marked with `data-voice-input="off"`;
- fields with the legacy-compatible `no-voice` class.

### Disabling voice input for a specific field

Use the explicit data attribute:

```tsx
<Input data-voice-input="off" />
```

The scanner removes an existing button if the attribute is added later.

## Numeric mode

Numeric mode is enabled for:

- `type="number"`;
- `type="tel"`;
- `inputmode="numeric"`;
- `inputmode="decimal"`.

In numeric mode, the system removes every non-digit character. Arabic-Indic and Persian digits are converted to ASCII digits first:

```text
١٢٣ -> 123
۱۲۳ -> 123
```

The system extracts recognized digit characters; it does not interpret arbitrary written number words as mathematical values.

## React-compatible value updates

Directly assigning `field.value` can bypass controlled React fields. GOVA uses the native `HTMLInputElement` or `HTMLTextAreaElement` value setter, then emits bubbling `input` and `change` events.

This allows React state, React Hook Form, validation, and existing change handlers to receive the voice-entered value through the same path as keyboard input.

## Cursor and spacing behavior

- Text is inserted at the active selection.
- Selected text is replaced.
- A separating space is added when necessary for normal text.
- Numeric text is inserted without spaces.
- Number inputs, which do not support text selections, append the recognized digits.

## Language changes

`VoiceInputController` reads the current locale from GOVA's preferences system. The scanner changes its recognition locale and accessible labels immediately when the user switches language:

| Application locale | Recognition locale |
|---|---|
| Arabic | `ar-SA` |
| English | `en-US` |

Existing buttons are updated without recreating the page.

## Visual and accessibility behavior

The injected element is a real `button` with:

- `type="button"`, so it never submits a form;
- a translated `aria-label` and `title`;
- `aria-pressed="true"` while recording;
- a 40 x 40 pixel touch target;
- keyboard focus styling.

While recording, the microphone uses the theme error color and a pulsing glow. The animation is disabled when the operating system requests reduced motion.

The field receives logical inline-end padding. Consequently, placement works automatically in both RTL and LTR layouts.

## Permissions

### Android

`android/app/src/main/AndroidManifest.xml` declares:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

The native adapter requests runtime permission on the first use.

### iOS

`ios/App/App/Info.plist` declares:

- `NSMicrophoneUsageDescription`
- `NSSpeechRecognitionUsageDescription`

iOS displays these descriptions when asking the user for access.

No audio recording starts automatically. Permission is requested and recognition begins only after the user presses a microphone button.

## Error and stop behavior

Recognition returns to the inactive state when:

- the operating system detects the end of speech;
- the user presses the active microphone again;
- another field starts recording;
- the field is removed;
- the controller unmounts;
- permission is denied;
- the recognizer reports an error.

Technical errors are logged with the `[VoiceInput]` prefix. Password values and spoken text are not written to application logs.

## Build and verification

After installing or changing the native plugin, synchronize both native projects:

```bash
npm run cap:build
```

Project checks:

```bash
npm run typecheck
npm run architecture:check
```

Manual test checklist:

1. Open login and confirm that the phone field has a microphone while the password field does not.
2. Speak digits into a telephone or numeric field and confirm that only ASCII digits are inserted.
3. Speak into a normal text field and verify cursor insertion and React validation updates.
4. Change the application language and verify the recognition language and button label change.
5. Navigate to a feature that renders fields later and verify buttons appear automatically.
6. Start recording and verify the red glow, then remain silent and confirm automatic stop.
7. Deny microphone permission and confirm the button returns to its inactive state.
8. Test Android and iOS native builds because browser support alone does not verify native permissions.

## Browser limitations

Browser speech recognition availability depends on the browser, operating system, network, and browser permission policy. If the browser exposes neither `SpeechRecognition` nor `webkitSpeechRecognition`, the system deliberately leaves fields unchanged.

Native Android and iOS builds use the Capacitor plugin and are not dependent on this browser API.

