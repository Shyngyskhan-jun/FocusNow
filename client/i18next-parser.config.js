// i18next-parser.config.js
module.exports = {
  // Какие языки генерировать
  locales: ['ru', 'en'],
  
  // Функция поиска в коде (ищет все вызовы t('...'))
  lexers: {
    ts: ['JsxLexer'],
    tsx: ['JsxLexer'],
    js: ['JsxLexer'],
    jsx: ['JsxLexer'],
    default: ['JsxLexer'],
  },

  // Путь, по которому будут создаваться JSON-файлы. 
  // $LOCALE подставит 'ru' или 'en', а $NAMESPACE — имя файла (по умолчанию 'translation')
  output: 'src/locales/$LOCALE/$NAMESPACE.json',

  // Пути к файлам проекта, которые нужно отсканировать (все файлы в src)
  input: ['src/**/*.{js,jsx,ts,tsx}'],

  // Сохранять ли старые переводы при повторном сканировании (обязательно true)
  keepRemoved: true,
  
  // Что подставлять в качестве значения для новых найденных ключей (пустую строку)
  defaultValue: '',
};