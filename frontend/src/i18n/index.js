// Configurare i18next: limba implicită = română (publicul țintă e RO), cu
// suport pentru engleză. Detectorul citește localStorage > navigator.language,
// astfel încât alegerea utilizatorului persistă între sesiuni.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ro from './locales/ro.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ro: { translation: ro }, en: { translation: en } },
    fallbackLng: 'ro',
    supportedLngs: ['ro', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'notite_lang',
      caches: ['localStorage'],
    },
    returnNull: false,
  });

export default i18n;

// Mic helper pentru a folosi traducerea în afara componentelor (ex: în axios
// interceptors sau în funcții utilitare).
export const t = (key, options) => i18n.t(key, options);
