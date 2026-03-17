import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'

const LANGUAGE_KEY = 'matrix-web-language'

function getStoredLanguage(): string {
  try {
    return localStorage.getItem(LANGUAGE_KEY) || 'en'
  }
  catch {
    return 'en'
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'en': { translation: en },
      'zh-CN': { translation: zhCN },
    },
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, lng)
    document.documentElement.lang = lng
  }
  catch {
    // localStorage unavailable
  }
})

export default i18n
export { LANGUAGE_KEY }
