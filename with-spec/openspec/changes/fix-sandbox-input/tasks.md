# Tasks

## 1. Данные: чистая функция клавиши (domain.mjs)

- [x] 1.1 Добавить в `domain.mjs` `export function isEnterSubmit({ key, shiftKey, isComposing, keyCode })` по правилу из design D1, не меняя прежние функции; проверить тестами: Enter → true; Shift+Enter, `isComposing`, `keyCode 229`, «a» → false; прежние строки `domain.mjs` не изменились (diff)

## 2. Сборка (build.mjs)

- [x] 2.1 Создать `build.mjs` на чистом Node: `BANNER`, `buildTracker({domainSource, appSource})` (снятие `export`, удаление блока `import … from './domain.mjs'`, обёртка IIFE из design D3, нормализация `\n`), запуск как скрипта пишет `tracker.js` атомарно; проверить: `node build.mjs` создаёт `tracker.js`, `node --check tracker.js` — ok
- [x] 2.2 Обработать ошибки контракта: `export default`/`export {`/`export *`, посторонний `import`, импорт несуществующего имени → исключение с понятным текстом, код выхода 1, `tracker.js` не перезаписан; проверить тестами на `buildTracker` и ручным запуском на временной копии вне проекта
- [x] 2.3 Детерминизм: проверить тестом (два вызова дают одинаковый результат) и командой — двойной `node build.mjs` даёт одинаковую контрольную сумму `tracker.js`

## 3. Интерфейс (app.mjs, index.html)

- [x] 3.1 В `app.mjs` вынести добавление в `addFromForm()`; кнопка — `click`, поля «Название» и «Часы» — `keydown` с `isEnterSubmit` и `preventDefault`, запасной `submit` — `preventDefault` и `addFromForm()`; проверить дымовым прогоном собранного `tracker.js` на заглушке DOM: кнопка и Enter в обоих полях добавляют ровно одну задачу, Shift+Enter не добавляет, ошибки и сохранение значений как раньше
- [x] 3.2 Убедиться, что все обращения к `localStorage` находятся только внутри `try/catch` адаптера (включая геттер); проверить `grep` и дымовым прогоном, где геттер `localStorage` бросает `SecurityError`: нет исключений, сообщение одно, задачи и настройки работают
- [x] 3.3 В `index.html` заменить `<script type="module" src="app.mjs">` на `<script src="tracker.js" defer></script>`, кнопке «Добавить» задать `type="button"`; проверить статически: нет `type="module"` и `type="submit"`
- [x] 3.4 Пересобрать `node build.mjs` после правок 1.1 и 3.1–3.2; проверить: `tracker.js` обновлён, `node --check tracker.js` — ok

## 4. Тесты сборки и регрессия (tests/acceptance.test.mjs)

- [x] 4.1 Дописать тест актуальности (`buildTracker(исходники) === tracker.js` с сообщением «выполните node build.mjs»), синтаксиса (`vm.Script`, `node --check`, нет `import`/`export`, есть BANNER) и чувствительности к правке `appSource`; проверить `node --test tests/acceptance.test.mjs`
- [x] 4.2 Дописать тест изоляции: выполнение `tracker.js` в `vm` с минимальной заглушкой DOM без исключений и без новых глобальных имён; тест `index.html`: подключён `tracker.js` без `type="module"`, у «Добавить» `type="button"`; проверить `node --test tests/acceptance.test.mjs`
- [x] 4.3 Регрессия: `node --test tests/acceptance.test.mjs` — 0 fail; прежние 51 тест присутствуют без изменений (diff старых строк пуст); `node --check` для `app.mjs`, `domain.mjs`, `build.mjs`, `tracker.js`, теста
- [x] 4.4 Проверить, что тест актуальности ловит устаревший файл: на временной копии проекта вне рабочей папки изменить `app.mjs` без пересборки и убедиться, что тест падает с подсказкой `node build.mjs`

## 5. Повторная проверка в браузере (оператор)

- [x] 5.1 http-сервер (`python3 -m http.server`): T1–T5, Enter и кнопка «Добавить», шестерёнка и настройки
- [x] 5.2 `file://` (двойной щелчок): нет ошибки CORS; T1–T5, Enter, кнопка, настройки; поведение хранилища описано
- [x] 5.3 iframe `sandbox="allow-scripts"` и `sandbox="allow-scripts allow-same-origin"`: нет `Blocked form submission` и необработанных `SecurityError`; T1–T5, Enter, кнопка, настройки работают

## 6. Отчёт

- [x] 6.1 Дописать в `REPORT.md` раздел о fix-sandbox-input: причина, что изменено, порядок «правка → `node build.mjs` → тесты», вывод тестов, фактические проверки отдельно от проверок оператора, без заявлений о запуске браузера


> Пункты 5.1–5.3 отметил оператор 16.11.2026 после повторной проверки в Chromium (Playwright): http, file://, iframe с `sandbox="allow-scripts"` и с `allow-scripts allow-same-origin` — все PASS, ошибок консоли нет. Лог: `logs/browser-retest-bugfix01.log`. Вместо `python3 -m http.server` использован `npx http-server@14.1.1`.
