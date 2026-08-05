# Longevity Bar Mobile Ergonomics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe live-camera QR scanner and a suppressible home-screen installation offer to the signed-in Longevity Bar loyalty app.

**Architecture:** Two focused client components isolate browser-only concerns: `InstallPrompt` owns PWA install lifecycle and `QrKamera` owns camera/decoder lifecycle. A pure URL validator accepts only same-origin `/scan/<token>` targets before navigation; existing server routes remain the authority for token and date validity.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.7, Supabase SSR, `qr-scanner`, Web App Manifest, static TypeScript contract checks.

## Global Constraints

- Camera input is live-only: no file input, gallery, upload, drag-and-drop, clipboard, or static-image API.
- Accept only the current origin and an exact `/scan/<non-empty-token>` path with no query string or fragment.
- Stop camera resources on success, close, unmount, visibility loss, and navigation.
- Never show install UI or scanner on `/kviz/*`; install UI is customer-loyalty-only and signed-in-only.
- Dismissal snoozes for exactly 24 hours; standalone, `appinstalled`, or **Už mám na ploše** suppress permanently.
- Preserve Supabase SSR session refresh and all existing server-side QR/date/cooldown/limit rules.
- Preserve every unrelated dirty-worktree change and do not deploy, migrate, push, merge, or change secrets.

---

### Task 1: Pure QR-target validation and decoder dependency

**Files:**
- Create: `src/lib/scan-url.ts`
- Create: `scripts/check-mobile-ergonomics.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `parseLoyaltyScanTarget(raw: string, currentOrigin: string): string | null`, returning the normalized `/scan/<encoded-token>` pathname or `null`.

- [x] **Step 1: Write the failing executable checks**

Cover a valid absolute current-origin URL and reject foreign origin, `/scan/`, `/scan/a/b`, `/kviz/a1`, malformed text, query strings, and fragments. Add source assertions forbidding `input type="file"`, `.scanImage(`, `FileReader`, and clipboard APIs in the scanner component.

- [x] **Step 2: Run the check and verify RED**

Run: `npx tsx scripts/check-mobile-ergonomics.ts`

Expected: FAIL because the validator and scanner source do not exist.

- [x] **Step 3: Implement the validator and add `qr-scanner`**

Use `new URL(raw)` and compare `url.origin === currentOrigin`; require empty `search` and `hash`; match `^/scan/([^/]+)$`; decode and reject an empty token, then return `/scan/${encodeURIComponent(token)}`. Add the current stable `qr-scanner` dependency and regenerate the lockfile with npm.

- [x] **Step 4: Run the validator checks**

Run: `npx tsx scripts/check-mobile-ergonomics.ts`

Expected: URL cases pass; source checks may remain RED until Task 2.

### Task 2: Live-camera scanner

**Files:**
- Create: `src/components/QrKamera.tsx`
- Modify: `src/app/page.tsx`
- Modify: `scripts/check-mobile-ergonomics.ts`

**Interfaces:**
- Consumes: `parseLoyaltyScanTarget(raw, window.location.origin)`.
- Uses: `new QrScanner(videoElement, onDecode, options)`, `.start()`, `.stop()`, and `.destroy()` only; never `QrScanner.scanImage`.

- [x] **Step 1: Add scanner lifecycle checks**

Require an explicit **Naskenovat QR kód** button, environment-facing camera preference, visibility-change cleanup, unmount cleanup, `router.push(target)` only after pure validation, and Czech denied/no-camera/invalid-code messages.

- [x] **Step 2: Run the check and verify RED**

Run: `npx tsx scripts/check-mobile-ergonomics.ts`

Expected: FAIL because `QrKamera.tsx` is missing.

- [x] **Step 3: Implement the camera-only component**

Render a closed-state button and an accessible modal containing `<video playsInline>`. Start only after the tap, request the rear camera through QrScanner options, keep scanning after invalid codes, and navigate only after a valid target. Stop and destroy on every terminal lifecycle event. Display no gallery fallback.

- [x] **Step 4: Place the scanner on the signed-in loyalty home**

Render `<QrKamera />` near the loyalty card action area in `src/app/page.tsx`. Since this is a protected server page, the scanner is unavailable to anonymous visitors and all quiz routes.

- [x] **Step 5: Run the executable checks**

Run: `npx tsx scripts/check-mobile-ergonomics.ts`

Expected: PASS for validation and scanner contracts.

### Task 3: Install prompt and truthful scan-login copy

**Files:**
- Create: `src/components/InstallPrompt.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/prihlaseni/page.tsx`
- Modify: `scripts/check-mobile-ergonomics.ts`

**Interfaces:**
- `InstallPrompt` is rendered only by the authenticated loyalty home.
- Persists `wc-longevity-install:installed = "1"` and `wc-longevity-install:snoozeUntil = <epoch-ms>`.

- [x] **Step 1: Add failing install and copy checks**

Require standalone/iOS detection, `beforeinstallprompt`, `appinstalled`, exact 24-hour snooze, **Už mám na ploše**, iOS Share instructions, and absence of the former promise `po přihlášení ti hned připíšeme razítko`.

- [x] **Step 2: Run the check and verify RED**

Run: `npx tsx scripts/check-mobile-ergonomics.ts`

Expected: FAIL because the component is absent and login copy is stale.

- [x] **Step 3: Implement installation lifecycle**

Render the prompt only from the signed-in home page. Use the native Chromium prompt when captured; on iOS display manual instructions. Suppress in standalone, after `appinstalled`, or after **Už mám na ploše**; snooze close for 24 hours.

- [x] **Step 4: Correct login copy**

For scan return flows say that the app opens after login and the stamp is added only when the QR is valid today. Do not alter `awardStamp` or `/scan/[token]` behavior.

- [x] **Step 5: Run all bar.app gates from a non-iCloud copy**

Run: `npx tsx scripts/check-mobile-ergonomics.ts && npm run check && npm run typecheck && npm run build && git diff --check`

Expected: all executable checks, typecheck, production build, and diff check pass.
