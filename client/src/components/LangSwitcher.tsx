import { useTranslation } from 'react-i18next';

export function LangSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('ru') ? 'en' : 'ru';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
  onClick={toggleLanguage}
  className="btn btn--outline btn--sm flex items-center gap-2 h-10 px-3 
             bg-transparent border border-transparent 
             text-slate-700 dark:text-slate-200
             hover:bg-slate-100 dark:hover:bg-slate-800 
             active:bg-slate-200 dark:active:bg-slate-700
             focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
>
  {/* Иконка */}
  <span className="text-xl leading-none select-none">🌐</span>

  {/* Текст */}
  <span className="leading-none pr-[1rem]">
    {i18n.language.startsWith('ru') ? 'English' : 'Русский'}
  </span>
</button>
  );
}