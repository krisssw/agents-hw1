# ДЗ №1 · Вариант B — мини-трекер: direct vs OpenSpec

Факультатив «Создание ИИ-агентов с нуля», ФКН НИУ ВШЭ. Модель обеих попыток: Claude Opus 5.5 (версия сборки неизвестна).

Одна задача (мини-трекер учебных задач, `brief.md`) реализована двумя независимыми способами:

| Папка | Способ | Обращений | Автотесты |
|---|---|---|---|
| [`direct/`](direct/) | прямое задание, без OpenSpec | 1 + 1 (дизайн) | 5/5 → после дизайна 11/11 |
| [`with-spec/`](with-spec/) | OpenSpec CLI 1.14.1: `/opsx-propose` → `openspec validate --strict` → `/opsx-apply` | 2 + 2 (дизайн) | 32/32 → после дизайна 51/51 |

Обе версии проходят T1–T5 в браузере. После сравнения обе версии доработаны по общему брифу `redesign-brief.md`: тёмный дашборд, настройки темы и цвета выделения, Enter. Исходная первая попытка сохранена в первом коммите, а её скриншоты лежат в `screenshots/`. **Отчёт: [REPORT.md](REPORT.md)**

## Что где лежит

- `brief.md` — общая постановка и проверки T1–T5. В каждую папку положена одинаковая копия.
- `direct/`, `with-spec/` — `index.html`, `styles.css`, `app.mjs`, `domain.mjs`, `build.mjs`, `tracker.js` (собирается из app.mjs и domain.mjs командой `node build.mjs`), `tests/acceptance.test.mjs`, отчёт ассистента `REPORT.md`.
- `bugfix-01.md` — описание дефекта 01 (шаги, ожидание, факт), переданное обеим попыткам.
- `with-spec/openspec/changes/build-tracker/` — спецификация: `proposal.md`, `specs/tracker/spec.md`, `design.md`, `tasks.md`.
- `prompts.md` — тексты всех обращений к ассистенту.
- `logs/` — реальные логи: `openspec init`, `openspec validate`, `node --test`, `node --check`, браузерные проверки, http-server.
- `screenshots/` — скриншоты исходных версий; `screenshots/redesign/` — после доработки дизайна (тёмная и светлая темы, панель настроек, свой цвет, 390 px).
- `tools/` — скрипты браузерной проверки (Playwright), которыми получены `logs/browser-*.log`.

## Запуск

Нужен Node.js 22.14+.

```bash
cd direct            # или with-spec
node --test tests/acceptance.test.mjs
node --check app.mjs && node --check domain.mjs
npx --yes http-server@14.1.1 . -p 8080 -c-1
# открыть http://127.0.0.1:8080, остановить сервер: Ctrl+C
```

После исправления дефекта 01 (`bugfix-01.md`) страницу можно открыть и двойным щелчком по `index.html` (file://): браузер подключает классический `tracker.js`. После правок в `app.mjs` или `domain.mjs` выполните `node build.mjs`.

Проверка спецификации:

```bash
npm install -g @fission-ai/openspec@1.14.1
cd with-spec && openspec validate build-tracker --strict --no-interactive
```

Ключей доступа, `.env` и `node_modules` в репозитории нет.
