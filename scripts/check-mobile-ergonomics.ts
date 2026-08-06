import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cs } from "../src/lib/i18n/cs";
import { en } from "../src/lib/i18n/en";
import { parseLoyaltyScanTarget } from "../src/lib/scan-url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let checks = 0;

function ok(condition: unknown, message: string): asserts condition {
  checks += 1;
  if (!condition) throw new Error(message);
}

const origin = "https://bar.peaceandcoco.com";
ok(
  parseLoyaltyScanTarget(`${origin}/scan/STREDA-ABC`, origin) ===
    "/scan/STREDA-ABC",
  "platný vlastní QR musí projít",
);
for (const bad of [
  "https://evil.example/scan/STREDA-ABC",
  `${origin}/scan/`,
  `${origin}/scan/a/b`,
  `${origin}/kviz/a1`,
  `${origin}/scan/ABC?next=/admin`,
  `${origin}/scan/ABC#fragment`,
  `${origin}/scan/%2F`,
  `${origin}/scan/%5C`,
  "není url",
]) {
  ok(parseLoyaltyScanTarget(bad, origin) === null, `musí odmítnout: ${bad}`);
}

const scanner = fs.readFileSync(
  path.join(root, "src/components/QrKamera.tsx"),
  "utf8",
);
function readTypeScriptTree(directory: string): string {
  return fs.readdirSync(directory, { withFileTypes: true }).map((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readTypeScriptTree(fullPath);
    return /\.tsx?$/.test(entry.name) ? fs.readFileSync(fullPath, "utf8") : "";
  }).join("\n");
}
const guardedSources = readTypeScriptTree(path.join(root, "src"));
for (const forbidden of [
  /type=["']file["']/i,
  /scanImage\s*\(/,
  /FileReader/,
  /createObjectURL/,
]) {
  ok(!forbidden.test(guardedSources), `zdrojový strom nesmí obsahovat ${forbidden}`);
}
ok(!/clipboard/i.test(scanner), "QR skener nesmí číst schránku");
// Popisky bydlí od 6. 8. 2026 ve slovníku (`lib/i18n/cs.ts`), ne v komponentě.
// Kontroluje se proto obojí: že české znění zůstalo doslova stejné a že ho
// komponenta opravdu bere ze slovníku.
ok(
  cs.sken.naskenovat === "Naskenovat QR kód",
  "české znění tlačítka skeneru se nesmí měnit",
);
for (const required of [
  "t.sken.naskenovat",
  'preferredCamera: "environment"',
  'document.addEventListener("visibilitychange"',
  'window.addEventListener("pagehide"',
  "scanner.stop()",
  "scanner.destroy()",
  "parseLoyaltyScanTarget",
  "router.push(target)",
  "wc:camera-state",
]) {
  ok(scanner.includes(required), `skeneru chybí ${required}`);
}

const installer = fs.readFileSync(
  path.join(root, "src/components/InstallPrompt.tsx"),
  "utf8",
);
ok(
  cs.instalace.uzMamNaPlose === "Už mám na ploše",
  "české znění potvrzení instalace se nesmí měnit",
);
ok(
  cs.instalace.iosPridatNaPlochu === "Přidat na plochu",
  "české znění návodu na plochu se nesmí měnit",
);
for (const required of [
  'matchMedia("(display-mode: standalone)")',
  'window.addEventListener("beforeinstallprompt"',
  'window.addEventListener("appinstalled"',
  "24 * 60 * 60 * 1000",
  "t.instalace.uzMamNaPlose",
  "t.instalace.iosPridatNaPlochu",
]) {
  ok(installer.includes(required), `instalátoru chybí ${required}`);
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "public/manifest.webmanifest"), "utf8"),
) as { short_name?: string; icons?: Array<{ src: string; sizes: string }> };
ok(manifest.short_name === "Longevity Bar", "manifest musí pojmenovat Longevity Bar");
ok(
  manifest.icons?.some((icon) => icon.sizes === "192x192") &&
    manifest.icons?.some((icon) => icon.sizes === "512x512"),
  "manifest musí mít 192px a 512px ikonu",
);
for (const icon of manifest.icons ?? []) {
  ok(fs.existsSync(path.join(root, "public", icon.src)), `chybí ikona ${icon.src}`);
}
ok(
  fs.existsSync(path.join(root, "public/apple-touch-icon.png")),
  "chybí Apple touch ikona",
);

const loyaltyDashboard = fs.readFileSync(
  path.join(root, "src/app/odmeny/page.tsx"),
  "utf8",
);
ok(loyaltyDashboard.includes("<QrKamera />"), "přihlášená karta musí obsahovat skener");
ok(loyaltyDashboard.includes("<InstallPrompt />"), "přihlášená karta musí obsahovat instalaci");
ok(loyaltyDashboard.includes("!sken && !jeVyhra"), "instalace nesmí překrýt výsledek skenu");

const excludedInstallSources = [
  path.join(root, "src/app/layout.tsx"),
  ...fs
    .readdirSync(path.join(root, "src/app/kviz/[bavic]"))
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => path.join(root, "src/app/kviz/[bavic]", name)),
]
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
ok(!/QrKamera|InstallPrompt/.test(excludedInstallSources), "layout ani kvíz nesmí montovat skener či instalaci");

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as { scripts?: Record<string, string> };
ok(packageJson.scripts?.check?.includes("check-mobile-ergonomics.ts"), "standardní npm run check musí hlídat mobilní kontrakt");

const login = fs.readFileSync(
  path.join(root, "src/app/prihlaseni/page.tsx"),
  "utf8",
);
// Text přihlášení je ve slovníku; hlídá se jeho znění i to, že ho stránka
// bere odtamtud. Slib razítka před validací dne se nesmí vrátit v ŽÁDNÉ
// jazykové mutaci.
for (const [jazyk, podnadpis] of [
  ["cs", cs.prihlaseni.podnadpisSken],
  ["en", en.prihlaseni.podnadpisSken],
] as const) {
  ok(
    !/hned připíšeme razítko|add the stamp right away/i.test(podnadpis),
    `login (${jazyk}) nesmí slibovat razítko před validací dne`,
  );
}
ok(
  cs.prihlaseni.podnadpisSken.includes("pokud je QR kód platný právě dnes"),
  "login musí vysvětlit denní validaci",
);
ok(
  en.prihlaseni.podnadpisSken.includes("valid today"),
  "anglický login musí vysvětlit denní validaci taky",
);
ok(
  login.includes("t.prihlaseni.podnadpisSken"),
  "login musí brát text ze slovníku",
);

// 40 původních + 6 nových kolem dvojjazyčnosti (znění ve slovníku a jeho
// zapojení v komponentách skeneru, instalace a přihlášení).
const EXPECTED_CHECKS = 46 + (manifest.icons?.length ?? 0);
if (checks !== EXPECTED_CHECKS) throw new Error(`čekali jsme ${EXPECTED_CHECKS} kontrol, proběhlo ${checks}`);
console.log(`✓ check-mobile-ergonomics: ${checks}/${EXPECTED_CHECKS} kontrol OK`);
