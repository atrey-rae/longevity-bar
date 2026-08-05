"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "wc-longevity-install";
const INSTALLED_KEY = `${STORAGE_PREFIX}:installed`;
const SNOOZE_KEY = `${STORAGE_PREFIX}:snoozeUntil`;
const SNOOZE_MS = 24 * 60 * 60 * 1000;
const CAMERA_STATE_EVENT = "wc:camera-state";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

function isInAppBrowser(): boolean {
  return /FBAN|FBAV|Instagram|Line|MicroMessenger/i.test(navigator.userAgent);
}

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Instalace musí zůstat použitelná i při blokovaném úložišti.
  }
}

function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Bez úložiště jen nelze rozhodnutí zapamatovat mezi návštěvami.
  }
}

function isSnoozed(): boolean {
  const until = Number(storageGet(SNOOZE_KEY) ?? "0");
  return Number.isFinite(until) && until > Date.now();
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [androidManual, setAndroidManual] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [nativePrompt, setNativePrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const cameraUsedRef = useRef(false);

  useEffect(() => {
    if (
      isStandalone() ||
      storageGet(INSTALLED_KEY) === "1" ||
      isSnoozed()
    ) {
      return;
    }

    const appleMobile = isIos();
    setIos(appleMobile);
    setInAppBrowser(isInAppBrowser());
    let androidTimer: number | undefined;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (androidTimer) window.clearTimeout(androidTimer);
      setNativePrompt(event as BeforeInstallPromptEvent);
      setAndroidManual(false);
      if (!cameraUsedRef.current) setVisible(true);
    };
    const onInstalled = () => {
      storageSet(INSTALLED_KEY, "1");
      storageRemove(SNOOZE_KEY);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const iosTimer = appleMobile
      ? window.setTimeout(() => {
          if (!cameraUsedRef.current) setVisible(true);
        }, 700)
      : undefined;
    if (!appleMobile && isAndroid()) {
      androidTimer = window.setTimeout(() => {
        if (cameraUsedRef.current) return;
        setAndroidManual(true);
        setVisible(true);
      }, 1500);
    }

    return () => {
      if (iosTimer) window.clearTimeout(iosTimer);
      if (androidTimer) window.clearTimeout(androidTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const onCameraState = (event: Event) => {
      const cameraOpen = (event as CustomEvent<{ open?: boolean }>).detail?.open === true;
      if (!cameraOpen) return;
      cameraUsedRef.current = true;
      setVisible(false);
    };
    window.addEventListener(CAMERA_STATE_EVENT, onCameraState);
    return () => window.removeEventListener(CAMERA_STATE_EVENT, onCameraState);
  }, []);

  useEffect(() => {
    if (!visible) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    };
  }, [visible]);

  const snooze = () => {
    storageSet(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    setVisible(false);
  };

  const alreadyInstalled = () => {
    storageSet(INSTALLED_KEY, "1");
    storageRemove(SNOOZE_KEY);
    setVisible(false);
  };

  const install = async () => {
    if (!nativePrompt) return;
    try {
      await nativePrompt.prompt();
      const choice = await nativePrompt.userChoice;
      setNativePrompt(null);
      if (choice.outcome === "accepted") {
        storageSet(INSTALLED_KEY, "1");
        storageRemove(SNOOZE_KEY);
      } else {
        storageSet(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
      }
      setVisible(false);
    } catch {
      snooze();
    }
  };

  if (!visible) return null;
  const manual = ios || androidManual || !nativePrompt;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-inkoust/75 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          snooze();
        } else if (event.key === "Tab") {
          const buttons = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
          );
          const first = buttons[0];
          const last = buttons.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <section className="w-full max-w-md rounded-3xl bg-kokos-50 p-5 text-inkoust shadow-karta">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-zapad-600">
              Rychlejší příště
            </p>
            <h2 id="install-title" className="mt-1">Přidat Longevity Bar na plochu?</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={snooze}
            className="grid min-h-11 min-w-11 place-items-center rounded-full bg-inkoust/10 text-xl font-black"
            aria-label="Připomenout zítra"
          >
            ×
          </button>
        </div>

        {manual ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-inkoust/75">
              {ios ? (
                inAppBrowser ? (
                  <>Otevři stránku v Safari a tam klepni na <strong>Sdílet</strong> → <strong>Přidat na plochu</strong>.</>
                ) : (
                  <>V Safari klepni na <strong>Sdílet</strong> a potom na <strong>Přidat na plochu</strong>.</>
                )
              ) : (
                <>V nabídce prohlížeče (⋮) zvol <strong>Přidat na plochu</strong> nebo <strong>Instalovat aplikaci</strong>.</>
              )}
            </p>
            {!inAppBrowser && (
              <button type="button" className="tlacitko-hlavni mt-4" onClick={alreadyInstalled}>
                Už mám na ploše
              </button>
            )}
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-inkoust/75">
              Otevřeš věrnostní kartu jedním klepnutím a zůstaneš přihlášený.
            </p>
            <button type="button" className="tlacitko-hlavni mt-4" onClick={install}>
              Přidat aplikaci
            </button>
          </>
        )}
        <button type="button" className="mt-3 w-full py-2 text-sm font-bold underline underline-offset-4" onClick={snooze}>
          Teď ne — připomeň zítra
        </button>
      </section>
    </div>
  );
}
