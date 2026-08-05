# Longevity Bar Mobile Ergonomics Design

## Scope

Improve the customer loyalty app with a home-screen installation offer and an in-app live-camera QR scanner. Quiz routes under `/kviz/` never show the installation offer and never expose the scanner.

## Live camera QR scanner

- The scanner opens only after an explicit user tap on **Naskenovat QR kód**.
- It uses `getUserMedia` with the environment-facing camera and a live QR decoder. There is no file input, gallery picker, upload, drag-and-drop, clipboard, or still-image import path.
- The camera stops on success, close, component unmount, page hide, and navigation.
- A decoded value is accepted only when it resolves to the current origin and has an exact `/scan/<non-empty-token>` path. Query strings, fragments, other origins, other paths, and malformed values are rejected; scanning remains active with a Czech error message.
- The server remains authoritative. A valid-looking code still goes through the existing token, active-day, Prague-date, cooldown, and daily-limit checks in `awardStamp`.
- If camera permission is denied or no camera exists, show a plain-language recovery message. Do not offer gallery upload as fallback.

## Future-day QR behavior

The current server behavior is retained: a customer may register or sign in through any recognized daily QR, but a QR outside its valid Prague calendar day never awards a stamp and returns `wrong_day`. Login copy becomes neutral so it does not promise a stamp before the day is validated.

## Installation offer

- PWA name: `Longevity Bar`; reuse the existing manifest and branded icons.
- Show only on customer loyalty routes after the customer is signed in; exclude `/kviz/*` and internal/admin contexts.
- Android/Chromium uses `beforeinstallprompt`; installed standalone mode and `appinstalled` suppress future offers.
- iPhone/iPad shows Share → Add to Home Screen instructions. Because Safari cannot detect a separately installed copy from a normal tab, **Už mám na ploše** permanently suppresses the offer in that browser.
- Closing the offer snoozes it for 24 hours.

## Authentication

Keep Supabase SSR token refresh. Its persistent session already avoids daily login and is better aligned with the requested minimum seven-day convenience than imposing a new forced seven-day expiry.

## Acceptance

Automated checks prove there is no file input or gallery path, only live camera APIs are used, URL validation is same-origin `/scan/<token>` only, the camera lifecycle stops correctly, quiz routes are excluded, install-state persistence works, and the neutral login text is present. Typecheck and production build must complete from a non-iCloud staging copy before release.
