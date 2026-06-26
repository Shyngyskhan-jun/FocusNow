import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Импортируем файлы напрямую из твоей текущей папки src
import translationRU from './locales/ru/translation.json';
import translationEN from './locales/en/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: {
        translation: translationRU
      },
      en: {
        translation: translationEN
      }
    },
    lng: localStorage.getItem('i18nextLng') || 'ru', // текущий язык
    fallbackLng: 'ru',
    
    // Отключаем разделение по точкам, так как у нас плоский JSON
    keySeparator: false, 
    nsSeparator: false,

    interpolation: {
      escapeValue: false, 
    }
  });

export default i18n;