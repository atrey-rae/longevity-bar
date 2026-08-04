# BRIEF — Předání appky Longevity Bar do řízení ChatGPT

- **TASK_ID:** 2026-08-04-longevity-bar-handoff-chatgpt
- **Zadal:** Atrey, 4. 8. 2026 ráno (chat, Claude Code cockpit)
- **Objective:** Dokončit vývojovou fázi appky (věrnostní program + kvíz
  bavičů), ověřit správnost nastavení (git, dokumentace, kód, secrets)
  a předat řízení appky cockpitu ChatGPT dle P&COS handoff metodiky v2.0.1.
- **Scope:** repo `atrey-rae/longevity-bar` + jeho produkční stopa
  (Vercel/Supabase/Resend/CS kupóny/CF DNS záznam `bar`).
- **Non-goals:** týmová appka healing.peaceandcoco.com (samostatné repo
  `healing-festival-bar`, zůstává mimo tento handoff); změny textů kvízu
  (schváleny Atreyem 4. 8.); přejmenování default větve před festivalem.
- **Akceptační kritéria:** cold-start test — nový controller z Task Packu
  pozná cíl, ověřený stav, rizika, schválení a další 3 kroky bez chat
  historie. Repo bez secrets (gitleaks clean), dokumentace odpovídá kódu.
- **Verifikace:** `npx tsc --noEmit` EXIT 0 · `npx tsx scripts/check-kviz.ts`
  80/80 · gitleaks no leaks · produkce živá (kvíz 200, pravidla 200).
