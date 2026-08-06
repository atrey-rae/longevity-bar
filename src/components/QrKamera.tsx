"use client";

import { useRouter } from "next/navigation";
import QrScanner from "qr-scanner";
import { useCallback, useEffect, useRef, useState } from "react";

import { useT } from "@/lib/i18n/client";
import type { Dict } from "@/lib/i18n/types";
import { parseLoyaltyScanTarget } from "@/lib/scan-url";

const CAMERA_STATE_EVENT = "wc:camera-state";

function cameraErrorMessage(error: unknown, host: string, t: Dict): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return t.sken.kameraZablokovana(host);
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return t.sken.kameraChybi;
  }
  return t.sken.kameraObecnaChyba;
}

function invalidQrMessage(raw: string, currentOrigin: string, t: Dict): string {
  try {
    const scanned = new URL(raw.trim());
    const current = new URL(currentOrigin);
    if (scanned.origin !== current.origin && /^\/scan\/[^/]+$/.test(scanned.pathname)) {
      return t.sken.jinaAdresa(scanned.host);
    }
  } catch {
    // Obecná hláška níže pokrývá text, který není URL.
  }
  return t.sken.neplatnyKod;
}

export default function QrKamera() {
  const t = useT();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const bottomCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const navigatingRef = useRef(false);
  const lastRejectedRef = useRef("");
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState("");

  const stopCamera = useCallback(() => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      scanner.stop();
      scanner.destroy();
    }
  }, []);

  const close = useCallback(() => {
    stopCamera();
    setOpen(false);
    setStarting(false);
    setMessage("");
    lastRejectedRef.current = "";
  }, [stopCamera]);

  useEffect(() => {
    if (!open || !videoRef.current) return;

    let cancelled = false;
    setStarting(true);
    setMessage("");

    const scanner = new QrScanner(
      videoRef.current,
      ({ data }) => {
        if (navigatingRef.current) return;
        const target = parseLoyaltyScanTarget(data, window.location.origin);
        if (!target) {
          if (lastRejectedRef.current !== data) {
            lastRejectedRef.current = data;
            setMessage(invalidQrMessage(data, window.location.origin, t));
          }
          return;
        }

        navigatingRef.current = true;
        stopCamera();
        setMessage(t.sken.nacteno);
        router.push(target);
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 12,
        returnDetailedScanResult: true,
      },
    );

    scannerRef.current = scanner;
    scanner
      .start()
      .then(() => {
        if (!cancelled) setStarting(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        stopCamera();
        setStarting(false);
        setMessage(cameraErrorMessage(error, window.location.host, t));
      });

    const stopWhenHidden = () => {
      if (document.visibilityState === "hidden") close();
    };
    const stopOnPageHide = () => close();
    document.addEventListener("visibilitychange", stopWhenHidden);
    window.addEventListener("pagehide", stopOnPageHide);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", stopWhenHidden);
      window.removeEventListener("pagehide", stopOnPageHide);
      stopCamera();
    };
  }, [close, open, router, stopCamera, t]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(CAMERA_STATE_EVENT, { detail: { open } }));
    return () => {
      if (open) window.dispatchEvent(new CustomEvent(CAMERA_STATE_EVENT, { detail: { open: false } }));
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    };
  }, [open]);

  return (
    <>
      <button type="button" className="tlacitko-hlavni" onClick={() => setOpen(true)}>
        <span aria-hidden>▣</span> {t.sken.naskenovat}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-inkoust/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-kamera-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            } else if (event.key === "Tab") {
              if (event.shiftKey && document.activeElement === closeRef.current) {
                event.preventDefault();
                bottomCloseRef.current?.focus();
              } else if (!event.shiftKey && document.activeElement === bottomCloseRef.current) {
                event.preventDefault();
                closeRef.current?.focus();
              }
            }
          }}
        >
          <section className="w-full max-w-md rounded-3xl bg-kokos-50 p-4 text-inkoust shadow-karta">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="qr-kamera-title">{t.sken.dialogNadpis}</h2>
                <p className="mt-1 text-sm text-inkoust/70">
                  {t.sken.dialogPopis}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="grid min-h-11 min-w-11 place-items-center rounded-full bg-inkoust/10 text-xl font-black"
                aria-label={t.sken.zavritKameru}
              >
                ×
              </button>
            </div>

            <div className="relative mt-4 overflow-hidden rounded-2xl bg-black aspect-square">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
                aria-label={t.sken.zivyObraz}
              />
              {starting && (
                <div className="absolute inset-0 grid place-items-center bg-black/60 px-5 text-center font-bold text-white">
                  {t.sken.spoustime}
                </div>
              )}
            </div>

            <p
              className="mt-3 min-h-6 text-center text-sm font-bold text-zapad-600"
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
            <button ref={bottomCloseRef} type="button" className="tlacitko-vedlejsi mt-2 !border-inkoust/20 !text-inkoust" onClick={close}>
              {t.spolecne.zavrit}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
