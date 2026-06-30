import type { Locale } from "./types";
import type { Dictionary } from "./dictionaries/en";
import en from "./dictionaries/en";
import pl from "./dictionaries/pl";
import ja from "./dictionaries/ja";
import el from "./dictionaries/el";
import it from "./dictionaries/it";
import es from "./dictionaries/es";

const dictionaries: Record<Locale, Dictionary> = { en, pl, ja, el, it, es };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}
