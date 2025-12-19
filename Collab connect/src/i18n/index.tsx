import en from "./en.json"
import fr from "./fr.json"
import ko from "./ko.json"

const translations: Record<string, Record<string, string>> = {
  en,
  fr,
  ko,
}

// `t` function: returns the translated string for a key and language
export  function t(key: string, lang: string): string {
  return translations[lang]?.[key] || translations["en"][key] || key
}
