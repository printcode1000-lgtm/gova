/**
 * Digit folding for every numeric input the user can type.
 *
 * Arabic and Persian keyboards produce their own digit shapes (٠١٢٣ and ۰۱۲۳).
 * They are the same numbers, but no parser, database index, or phone metadata
 * recognises them, so every digit reaching the domain is folded to ASCII here —
 * once, at the edge — rather than in each caller.
 */

const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

/** Fold Arabic-Indic and Persian digits to `0123456789`, leaving the rest alone. */
export function toAsciiDigits(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '';
  let folded = '';
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      folded += String(code - ARABIC_INDIC_ZERO);
      continue;
    }
    if (
      code >= EXTENDED_ARABIC_INDIC_ZERO &&
      code <= EXTENDED_ARABIC_INDIC_ZERO + 9
    ) {
      folded += String(code - EXTENDED_ARABIC_INDIC_ZERO);
      continue;
    }
    folded += character;
  }
  return folded;
}

/** Every ASCII digit in the value, in order, with everything else removed. */
export function asciiDigitsOnly(value: unknown): string {
  return toAsciiDigits(value).replace(/\D/g, '');
}
