import assert from "node:assert/strict";

import { postLoginDestinationForDayQr } from "../src/lib/scan-entry";

const token = "stary-denni-token";

assert.equal(
  postLoginDestinationForDayQr(token, { active: true, date: "2026-08-03" }, "2026-08-04"),
  "/",
  "Starý denní QR má po přihlášení otevřít aplikaci bez pokusu o razítko.",
);
assert.equal(
  postLoginDestinationForDayQr(token, { active: false, date: "2026-08-03" }, "2026-08-04"),
  "/",
  "Starý deaktivovaný denní QR má pořád otevřít registraci do aplikace.",
);
assert.equal(
  postLoginDestinationForDayQr(token, { active: true, date: "2026-08-05" }, "2026-08-04"),
  "/",
  "Budoucí denní QR má umožnit registraci, ale ne předčasné razítko.",
);
assert.equal(
  postLoginDestinationForDayQr(token, { active: true, date: "2026-08-04" }, "2026-08-04"),
  "/scan/stary-denni-token",
  "Dnešní aktivní QR má po přihlášení pokračovat k připsání razítka.",
);
assert.equal(
  postLoginDestinationForDayQr(token, null, "2026-08-04"),
  "/scan/stary-denni-token",
  "Neznámý token musí zůstat ve scan flow, aby se zobrazila bezpečná chyba.",
);

console.log("stale QR entry checks: OK");
