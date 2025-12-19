
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  ko: { translation: { "search_placeholder": "검색어를 입력하세요", "search": "검색" } },
  en: { translation: { "search_placeholder": "Enter keyword", "search": "Search" } }
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'ko',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n

