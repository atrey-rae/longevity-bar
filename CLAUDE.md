# Pokyny pro Claude (platí pro všechny úkoly v tomto projektu)

> ℹ️ **Řízení: Claude Max (od 5. 8. 2026, pokyn Atreye)** — převzato zpět
> od ChatGPT/Codex dle `_data/longevity-bar/HANDOFF_CLAUDE_MAX_2026-08-05.md`
> (kanonický technický handoff; ctít jeho sekci 14 „Co nesmí budoucí Claude
> omylem vrátit zpět"). Historie: 4. 8. Claude→ChatGPT
> (`tasks/2026-08-04-longevity-bar-handoff-chatgpt/`), 5. 8. ChatGPT→Claude.

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
