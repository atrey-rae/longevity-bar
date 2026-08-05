# Healing.app — produktová doporučení TOP 8 + rozšířený výběr

Datum schválení: 4. 8. 2026  
Schválil: Atrey  
Stav: schválený návrh před implementací

## Cíl

Výsledek profilového kvízu má nabídnout rychle pochopitelný prioritní výběr osmi produktů a současně umožnit zobrazit další relevantní produkty. Jeden profil smí mít 1–20 schválených produktových kandidátů. První obrazovka nesmí být zahlcená a žádný kandidát na pozici 9–20 nesmí zůstat nedostupnou konfigurací.

Výstup je vždy pouze produktová inspirace, nikoli diagnóza ani zdravotní doporučení. Odpovědi a profilové skóre zůstávají v prohlížeči.

## Schválené chování

1. Každý profil obsahuje seřazený seznam nejvýše 20 produktových aliasů. Pořadí vyjadřuje relevanci.
2. Výsledková obrazovka nejprve zobrazí nejvýše osm produktů v existující mobilní mřížce 2 × 4.
3. Pokud výsledek obsahuje více než osm produktů, pod mřížkou se zobrazí ovládací prvek „Zobrazit další vhodné produkty“.
4. Po rozbalení se zobrazí zbývající produkty, nejvýše do celkového počtu 20. Výběr produktu a navazující kupónový proces se nemění.
5. Ovládací prvek se nezobrazí, pokud výsledek obsahuje nejvýše osm platných unikátních produktů.
6. Po rozbalení lze sekci znovu sbalit. Sbalení nesmí změnit již vybraný produkt; pokud je vybraný produkt ve skryté části, UI jej musí nadále jednoznačně uvádět jako vybraný.

## Remízy profilů

Při shodném nejvyšším skóre se produkty skládají deterministicky round-robin mezi všemi vítěznými profily v pořadí P1 až P10:

- duplicity se odstraní podle produktového aliasu;
- neexistující aliasy se přeskočí;
- prvních osm výsledků tvoří TOP 8;
- stejným round-robin postupem se doplní rozšířená sada až na 20 produktů nebo do vyčerpání kandidátů;
- stejný vstup musí vždy vrátit stejné pořadí.

## Schválené profilové výjimky

- P6 doporučuje jednotlivé proteinové Cocofiry i 6packy. Aktuálně zahrnuje `SIXCH`, `SIXBL`, `SIXVNL` a `SIXMNG`.
- P7 nepotřebuje citlivější nebo užší výběr; může společně doporučit varianty Superhuman, No-vitC a oba Histabiotics.
- P9 musí doporučovat `JOGURT1L`, tedy produkt se SKU `YOG_ULT_1L`.
- P10 zůstává konzervativní, dokud nejsou dietní vlastnosti ověřeny z produktových dat nebo aktuálních etiket; názvy produktů samy o sobě nejsou dostatečný zdroj pro alergenní tvrzení.

## Datová pravidla

- Povoleným zdrojem produktů je schválený katalog 66 položek dodaný Atreyem a jeho aliasy v `src/lib/kviz.ts`.
- Profil nesmí obsahovat více než 20 aliasů.
- Alias musí existovat v produktovém katalogu.
- V rámci jednoho profilu se alias nesmí opakovat.
- Změna pořadí je produktové rozhodnutí, protože mění TOP 8.
- Chybějící produkt nesmí shodit kvíz; vyhodnocení jej bezpečně přeskočí.

## Dopad na datový model

Vyhodnocení musí vracet celou seřazenou sadu až 20 produktů. Rozdělení na prvních osm a zbytek je prezentační odpovědnost výsledkové komponenty. Konstanty mají rozlišovat:

- maximální počet výsledků: 20;
- počet produktů viditelných před rozbalením: 8.

Tím nevznikne druhý zdroj pravdy pro doporučení a produkty 9–20 zůstanou dosažitelné.

## Akceptační kritéria

- Jeden vítězný profil může vrátit 1–20 platných unikátních produktů ve schváleném pořadí.
- Remíza vrátí nejvýše 20 produktů v deterministickém round-robin pořadí.
- Výsledek s 8 nebo méně produkty nemá tlačítko pro rozbalení.
- Výsledek s 9–20 produkty nejprve ukáže přesně 8 a umožní zobrazit všechny zbývající.
- P6 obsahuje 6packy, P7 se nezužuje a P9 obsahuje `JOGURT1L` / `YOG_ULT_1L`.
- Automatická kontrola ověří maximální délku profilu, existenci aliasů, duplicity a všechny možné kombinace odpovědí.
- `tsc --noEmit` a produkční build proběhnou mimo zasekávající se iCloud cestu nebo v CI.
- Disclaimer „Tohle je produktová inspirace, ne zdravotní doporučení.“ zůstane na výsledkové obrazovce.

## Mimo rozsah

- změna bodovací matice kvízu;
- změna cen, slev nebo kupónového toku;
- přidávání produktů mimo schválený katalog;
- zdravotní personalizace nebo ukládání zdravotních odpovědí na server;
- deploy do produkce.
