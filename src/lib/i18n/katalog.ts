/**
 * Skládání jazykové vrstvy nad produktovými katalogy.
 *
 * Názvy produktů se NEPŘEKLÁDAJÍ (jsou to obchodní názvy), překládá se popis,
 * USP štítky a formát tam, kde obsahuje slovo („10 kapslí“ → „10 capsules“).
 *
 * Obě jazykové verze se skládají touhle jednou funkcí, takže mají z principu
 * stejné klíče i stejný počet USP — parita katalogu se pak nemůže rozejít
 * dopsáním položky jen do jednoho jazyka.
 */

export type KatalogTexty = {
  description: string;
  usps: string[];
  /** `null` = beze slova, použije se formát ze zdrojového katalogu. */
  format: string | null;
};

/** Co smí překlad přepsat. Cokoli nevyplněného se bere ze zdroje. */
export type KatalogPreklad = {
  description?: string;
  usps?: string[];
  format?: string;
};

type ZdrojovaPolozka = {
  id: string;
  description: string;
  usps: string[];
  format?: string;
};

/**
 * Poskládá texty katalogu pro jeden jazyk.
 *
 * `preklady` chybí u češtiny (zdroj JE čeština) a u angličtiny nese přeložené
 * popisy. Nesoulad v počtu USP shodí modul hned při startu — na obrazovce by
 * se projevil až chybějícím štítkem u konkrétní položky.
 */
export function katalogTexty(
  polozky: readonly ZdrojovaPolozka[],
  preklady: Record<string, KatalogPreklad> = {},
  jmenoKatalogu = "katalog",
): Record<string, KatalogTexty> {
  const vysledek: Record<string, KatalogTexty> = {};

  for (const polozka of polozky) {
    const preklad = preklady[polozka.id];
    if (preklad?.usps && preklad.usps.length !== polozka.usps.length) {
      throw new Error(
        `${jmenoKatalogu}: položka ${polozka.id} má ${preklad.usps.length} přeložených USP, ` +
          `zdroj jich má ${polozka.usps.length}`,
      );
    }
    vysledek[polozka.id] = {
      description: preklad?.description ?? polozka.description,
      usps: preklad?.usps ?? polozka.usps,
      format: preklad?.format ?? polozka.format ?? null,
    };
  }

  for (const id of Object.keys(preklady)) {
    if (!vysledek[id]) {
      throw new Error(`${jmenoKatalogu}: překlad pro neznámou položku ${id}`);
    }
  }

  return vysledek;
}
