# DECISIONS — Kvíz v2 a healing dashboard

- **4. 8. 2026 · Atrey:** Vznikne druhá varianta kvízu podle Google Sheetu
  `1QU_uDoq0bVLJvnaxTIXYQf4HJN8Q0Ctlqlpzbm5DEG4`.
- **4. 8. 2026 · Atrey:** Bavič si volí variantu kvízu; Atrey ji může nastavit
  každému baviči. Bavič i Atrey vidí vydané kupony a vybrané produkty.
- **4. 8. 2026 · Atrey:** Všichni administrátoři healing.app vidí bezplatné
  věrnostní i personální výdeje po produktech.
- **4. 8. 2026 · Atrey:** GDPR shrnutí nemá používat obecné „marketingové
  komunikace“; má přímo uvést Longevity tipy zasílané do konce roku 2026.
- **4. 8. 2026 · technické bezpečnostní rozhodnutí:** Odpovědi na otázky o
  zdravotních projevech se skórují lokálně a nikdy se neukládají ani
  neposílají serveru. Uloží se až zvolený produkt a varianta.
- **4. 8. 2026 · architektura:** Supabase/bar.app je jediný zdroj pravdy pro
  kvízové leady, kupony, volbu variant a věrnostní odměny. Healing.app čte a
  mění jen přes autentizované interní API; D1 zůstává zdrojem pravdy pro
  uživatele, směny, poznámky a personální stravenky.
- **4. 8. 2026 · Atrey:** Týmové poznámky se vedení nezobrazují v samostatném
  dashboardu, ale na obrazovce **Novinky**. Vidí je vedoucí směny a hlavní tým.
  Ikona Novinky má počet nepřečtených položek; změna hlavní novinky ji znovu
  označí jako nepřečtenou pro každého uživatele.
