import fr from "./fr.json";

type Translations = typeof fr;
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<Translations>;

const translations: Record<string, Translations> = { fr };

function getNested(obj: Record<string, unknown>, path: string): string {
  const value = path.split(".").reduce<unknown>((o, k) => {
    if (o && typeof o === "object") {
      return (o as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
  return typeof value === "string" ? value : path;
}

/**
 * Hook de traduction léger. Retourne la fonction t().
 * Ajouter d'autres langues dans l'objet `translations`.
 *
 * Usage:
 *   const { t } = useTranslation();
 *   <h1>{t("app.title")}</h1>
 */
export function useTranslation(lang: string = "fr") {
  const dict = translations[lang] ?? translations.fr;

  function t(key: TranslationKey): string {
    return getNested(dict as unknown as Record<string, unknown>, key);
  }

  return { t, lang };
}
