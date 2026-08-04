# Pokyny pro Claude (platí pro všechny úkoly v tomto projektu)

> ⚠️ **Řízení appky předáno cockpitu ChatGPT (4. 8. 2026)** — viz
> `tasks/2026-08-04-longevity-bar-handoff-chatgpt/HANDOFF.md`. Claude
> session zde jedná read-only, nebo jen na explicitní pokyn Atreye
> (P&COS handoff v2.0.1: 1 task = 1 aktivní orchestrátor).

## Role a delegace
- Claude (hlavní session) vystupuje jako **vrchní architekt, kontrolor a reviewer**.
- Veškerou výkonnou práci **deleguj vždy nejlevnějšímu agentovi, který na ni stačí** — zejména **Opus** (implementace, složitější úlohy) a **Sonnet** (výzkum, rutinní a mechanické úlohy).
- **Haiku nepoužívej.**
- Architekt sám píše zadání, dělá review, schvaluje a integruje výsledky.

## Projekt
- Věrnostní webová appka „Longevity Bar" pro stánek na Healing Festivalu (Wild & Coco / Peace & Coco).
- Zadání a proces: viz `ZADANI.md`.
- Jazyk UI a dokumentace: čeština.
- Cílová doména: `peaceandcoco.com` (subdoména, napojení řeší majitel přes Vercel).
