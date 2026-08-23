# `@asol/format-core`

## Mission

How this application writes numbers, money and dates. One door, no dependencies, browser-safe.

It exists because three decisions were being retaken in about twenty-five files: which BCP-47 tag
Arabic maps to, whether money is `Intl` currency style or a hand-written `ج.م` suffix, and whether
an unparseable date renders empty or as `Invalid Date`. Three spellings of the same currency and
two of the same date were in production side by side.

## Door

| Door | Import | Contents |
| :--- | :--- | :--- |
| `.` | `@asol/format-core` | Locale tags, money, counts, bytes, dates |

## Locale tags, and why they differ per surface

| Surface | Arabic | English | Why |
| :--- | :--- | :--- | :--- |
| Money | `ar-EG` | `en-EG` | The currency symbol and separators an Egyptian reader expects in either language |
| Dates | `ar-EG` | `en-EG` | Same reason: date order, not language preference |
| Counts | `ar-EG` | `en-US` | What the follower and review counters were written against |

`ar-EG` is what produces Arabic-Indic digits. The count tag is pinned separately from the money
tag even though they group identically today, so the two stay independent decisions rather than
accidentally coupled ones.

## The functions, and when each is right

| Function | Output | Use for |
| :--- | :--- | :--- |
| `formatCurrencyMinor(minor, { locale, currency })` | `١٬٢٣٤٫٥٠ ج.م` | Every stored amount — orders, quotes, discounts |
| `formatCurrencyMajor(value, …)` | same | A value already in major units |
| `formatPlainMoneyMinor(minor, locale)` | `١٢٣٤٫٥ ج.م` | Price tags: no forced decimals, negatives clamped to zero |
| `formatPlainMoneyMajor(value, locale)` | `1,200 EGP` | The profile summary's price line |
| `minorCurrencyToInputValue` / `majorCurrencyInputToMinor` | form field ⇄ minor units | Discount editors |
| `formatCount(value, locale)` | `1,234` | Followers, reviews, product counts — never negative |
| `formatBytes(value)` | `47 KB`, `12.4 MB` | The release console and bundle analyser |
| `formatDateTime` / `formatDate` / `formatTime` | medium styles | Customer-facing timestamps |
| `formatDateTimeDefault` | runtime default | Admin tables written against `toLocaleString()` with no options |
| `formatRelativeDay` + `calendarDayKey` | `اليوم` / `أمس` / a date | Chat day separators, and the grouping behind them |
| `formatAdminDateTime` / `formatAdminDate` / `formatAdminClock` | `-` when absent, raw when unparseable | Admin and developer tables |

Two distinctions the contract test pins, because both look like duplicates and are not:

- **`formatDateTime` vs `formatDateTimeDefault`.** `dateStyle: 'medium'` and the bare
  `toLocaleString()` produce visibly different strings. Merging them silently restyles every
  super-admin table.
- **Customer vs admin fallbacks.** A customer page renders `''` for a missing timestamp; an admin
  table renders `-` for absent and the **stored value** for unparseable, so an operator can see the
  bad row instead of an empty cell.

## Rounding

`majorCurrencyInputToMinor('1.005')` is `100`, not `101`: `1.005 * 100` is `100.49999999999999` in
IEEE-754. Pinned rather than "fixed" — it is the behaviour every discount form has had, and
changing it would move real prices.
