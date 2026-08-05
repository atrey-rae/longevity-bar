# BRIEF — Kvíz v2, týmové dashboardy a provozní manuály

- **TASK_ID:** `2026-08-04-quiz-v2-healing-dashboard`
- **Zadal:** Atrey, 4. 8. 2026
- **Objective:** Přidat druhou variantu kvízu podle zdrojového Google Sheetu,
  dát bavičům a Atreyovi řízení varianty a provozní statistiky v
  `healing.peaceandcoco.com`, doplnit manažerské statistiky bezplatných výdejů
  a připravit čtyři praktické manuály.
- **Aplikace:** `bar.peaceandcoco.com` (Next.js + Supabase, zdroj pravdy pro
  kvíz, kupony a věrnost) a `healing.peaceandcoco.com` (Cloudflare Worker +
  D1, týmové rozhraní a personální stravenky).
- **Non-goals:** změna mechaniky věrnostního programu, změna výše slevy,
  ukládání odpovědí na zdravotní otázky, automatický produkční deploy bez GO.

## Akceptační kritéria

1. Druhý kvíz zachová devět otázek a vážené profily ze zdrojového Sheetu,
   ale nepoužije diagnostické ani léčebné tvrzení.
2. Odpovědi zůstávají pouze v prohlížeči; do Supabase se zapíše jen bavič,
   varianta kvízu, vybraný produkt, kupon a kontaktní údaje.
3. Každý přiřazený bavič vidí jen svůj počet kuponů a rozpad vybraných
   produktů a může si změnit svoji variantu. Atrey vidí a nastaví všechny.
4. Všichni manažeři v healing.app vidí vydané věrnostní odměny podle produktu
   a skutečně vydané personální stravenky podle produktu.
5. Člen týmu může v healing.app napsat krátkou poznámku pro vedení; autor a
   čas se evidují, cizí poznámku nemůže měnit. Poznámky se zobrazují v
   Novinkách jen vedoucím směny a hlavnímu týmu.
6. Rozhraní a API vynucují oprávnění na serveru, ne pouze skrytím tlačítka.
7. Vzniknou čtyři samostatné české manuály: tým, pokladní, bavič fronty,
   Šimon/support. Každý obsahuje odpovídající FAQ; pokladní a bavič také FAQ
   zákazníků.
8. GDPR text jasně říká, že kontakt slouží k odeslání kuponu a Longevity tipů
   nejdéle do 31. 12. 2026, souhlas lze odvolat. Zdravotní odpovědi se
   neukládají.
9. Novinky ukazují číselný badge nepřečtených položek per uživatel. Nová
   týmová poznámka se započítá oprávněnému vedení; upravená hlavní novinka se
   znovu započítá všem.

## Approval gates

- Lokální implementace, migrace jako soubory a testy: v rozsahu zadání.
- Vzdálená Supabase/D1 migrace, nastavení sdíleného secretu, Vercel/Worker
  deploy, push/merge: až po výslovném **GO od Atreye**.
