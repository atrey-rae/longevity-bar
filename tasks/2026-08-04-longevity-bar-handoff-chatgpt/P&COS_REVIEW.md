# P&COS_REVIEW — Longevity Bar vs. produkční požadavky P&COS

Stav k předání 4. 8. 2026. Hodnotí požadavky handoffu v2.0.1 §4
(process card produkční appky). Legenda: ✅ splněno · ⚠️ částečně · ⛔ chybí.

| Požadavek | Stav | Poznámka |
|---|---|---|
| Process owner | ✅ | Atrey (festival = jeho projekt, Accountable Owner) |
| Technical owner | ⚠️ | dosud Claude Code session; TÍMTO HANDOFFEM přechází na cockpit ChatGPT |
| Backup (osoba) | ⛔ | nejmenován — appka je festivalová (5 dní); po festivalu buď zaniká, nebo formalizovat |
| KPI | ✅ | leady + uplatněné kupóny 21 % → podpora cíle 1 M Kč tržeb stánku; měřitelné v `quiz_leads` + CS (skupina HEALING-DYNAMIC) |
| SoT | ✅ | leady = Supabase `quiz_leads`; kupóny = CloudSailor; razítka = Supabase; žádná paralelní pravda |
| SLA | ⚠️ | neformální: festival 7–22:30, kontrola 1× ráno dle RUNBOOK §2 |
| SOP / školení | ✅ | RUNBOOK.md + docs/TAHAK-POKLADNA.md + know-how Doc; školení týmu ÚT 4. 8. |
| Monitoring | ⚠️ | manuální (RUNBOOK §2) + fallback e-mail notifikace kvízu; žádný automatický alerting |
| Audit | ✅ | git historie + quiz_leads + CS kupóny (createdAt, usesCount) + Resend log |
| Rollback | ✅ | RUNBOOK §4 (Vercel promote předchozí deploy; DB aditivní) |
| Release evidence | ✅ | EVIDENCE.md v tomto Task Packu |
| Security review | ⚠️ | app-security-reviewer agent: kvíz PASS-with-notes (LOW hardeningy zapracovány); formální lidský review neproběhl |
| **Filip Páral tech review** | ⛔ | NEPROBĚHL — festival timeline; appka šla live pod explicitními GO Atreye per krok. Doporučeno: dodatečný review po festivalu, pokud appka přežije festival |
| **Tadeáš acceptance** | ⛔ | NEPROBĚHL — dtto |
| GDPR | ✅ | /pravidla (telefon, marketing 6 zpráv/6 měsíců, výmazové lhůty) — text zadal Atrey 4. 8. |

**Závěr:** appka je provozuschopná pro festivalový týden s vědomými
výjimkami z gates (rozhodnutí Atreye pod časovým tlakem, zdokumentováno).
Pro případný poprázdninový provoz (kupóny žijí do 31. 12.) je podmínkou
doplnit: backup osobu, Filipův review, Tadeášovu acceptance.
