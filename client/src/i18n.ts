import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend'; // <-- Импортируем плагин загрузки

i18n
  // 1. Подключаем загрузчик JSON-файлов
  .use(HttpBackend)
  // 2. Подключаем автоматическое определение языка пользователя
  .use(LanguageDetector)
  // 3. Интегрируем i18n с React
  .use(initReactI18next)
  // 4. Инициализируем настройки
  .init({
    fallbackLng: 'ru', // Если язык не найден, включаем русский
    debug: false,      // Поставь true, если захочешь видеть логи загрузки в консоли браузера
    keySeparator: false,
    nsSeparator: false,
    backend: {
      // Путь, откуда плагин будет забирать файлы перевода.
      // {{lng}} автоматически заменится на 'ru' или 'en', а {{ns}} на 'translation'

      // for local
    //   loadPath: '/src/locales/{{lng}}/{{ns}}.json', 
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      // for vercel
    },

    interpolation: {
      escapeValue: false, // React сам защищает от XSS атак
    },
  });

export default i18n;