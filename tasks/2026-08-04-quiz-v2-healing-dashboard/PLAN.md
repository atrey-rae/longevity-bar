# PLAN — Kvíz v2, dashboardy a manuály

1. Zmapovat oba kódy, zdrojový Sheet, role a současné testy.
2. Připravit Supabase migraci pro `quiz_variant` a nastavení bavičů.
3. Implementovat druhý lokálně vyhodnocovaný kvíz a aktualizovat GDPR text.
4. Přidat chráněné interní statistické a konfigurační API v bar.app.
5. Přidat D1 oprávnění bavičů, týmové poznámky, proxy API a mobilní dashboardy
   do healing.app.
6. Přidat testy oprávnění, skórování, filtrování a agregací; spustit všechny
   lokální gate.
7. Vytvořit a vyrenderovat čtyři manuály, vizuálně je zkontrolovat.
8. Připravit release bundle a vyžádat GO pro migrace, secrets a deploy.

## Test-first pořadí

- RED: skórovací matice v2 a absence zdravotních odpovědí v payloadu.
- RED: serverové oprávnění vlastní bavič / Atrey / běžný člen.
- RED: statistiky kuponů a zvolených produktů, loyalty `redeemed`, personální
  stravenky pouze s `issued_at`.
- RED: poznámku založí přihlášený člen, anonym ne; manager ji vidí.
- GREEN: minimální implementace; REFACTOR až po zelených testech.

