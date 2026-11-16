# ДЗ №1 · Вариант B — мини-трекер: direct vs OpenSpec

Факультатив «Создание ИИ-агентов с нуля», ФКН НИУ ВШЭ. Модель обеих попыток: Claude Opus 5.5 (версия сборки неизвестна).

Одна задача (мини-трекер учебных задач, `brief.md`) реализована двумя независимыми способами:

| Папка | Способ | Обращений | Автотесты |
|---|---|---|---|
| [`direct/`](direct/) | прямое задание, без OpenSpec | 1 | 5/5 pass |
| [`with-spec/`](with-spec/) | OpenSpec CLI 1.14.1: `/opsx-propose` → `openspec validate --strict` → `/opsx-apply` | 2 | 32/32 pass |

Обе версии проходят T1–T5 в браузере. **Отчёт: [REPORT.md](REPORT.md)**

## Что где лежит

- `brief.md` — общая постановка и проверки T1–T5. В каждую папку положена одинаковая копия.
- `direct/`, `with-spec/` — `index.html`, `styles.css`, `app.mjs`, `domain.mjs`, `tests/acceptance.test.mjs`, отчёт ассистента `REPORT.md`.
- `with-spec/openspec/changes/build-tracker/` — спецификация: `proposal.md`, `specs/tracker/spec.md`, `design.md`, `tasks.md`.
- `prompts.md` — тексты всех обращений к ассистенту.
- `logs/` — реальные логи: `openspec init`, `openspec validate`, `node --test`, `node --check`, браузерные проверки, http-server.
- `screenshots/` — скриншоты T1, T3, T4, T5 и ширины 390 px для обеих версий.
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

Через `file://` страница не заработает: браузер блокирует ES-модули. Нужен локальный сервер.

Проверка спецификации:

```bash
npm install -g @fission-ai/openspec@1.14.1
cd with-spec && openspec validate build-tracker --strict --no-interactive
```

Ключей доступа, `.env` и `node_modules` в репозитории нет.
