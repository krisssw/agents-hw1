// Сборка классического скрипта tracker.js из domain.mjs + app.mjs.
// Чистый Node, без зависимостей. Запуск: node build.mjs
// tracker.js — сгенерированный файл, вручную не редактировать.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
export const SOURCES = ['domain.mjs', 'app.mjs'];
export const OUTPUT = 'tracker.js';

/** Убирает import/export из исходника модуля (только формы, используемые в проекте). */
export function stripModuleSyntax(code, name) {
  let out = code.replace(/^import\s[\s\S]*?\sfrom\s+['"][^'"]+['"];?[ \t]*\r?\n/gm, '');
  out = out.replace(/^import\s+['"][^'"]+['"];?[ \t]*\r?\n/gm, '');
  out = out.replace(/^export\s+(?=(?:async\s+)?function\b|const\b|let\b|var\b|class\b)/gm, '');
  const rest = out.match(/^\s*(import|export)\b.*$/m);
  if (rest) throw new Error(`${name}: неподдерживаемый синтаксис модуля: ${rest[0].trim()}`);
  return out;
}

/** Возвращает текст tracker.js по текущим исходникам. */
export function buildTracker(root = ROOT) {
  const parts = SOURCES.map((f) => {
    const src = readFileSync(join(root, f), 'utf8').replace(/\r\n/g, '\n');
    return `// ----- ${f} -----\n${stripModuleSyntax(src, f).trim()}\n`;
  });
  return (
    '// СГЕНЕРИРОВАНО build.mjs из ' + SOURCES.join(' + ') + '. Не редактировать вручную: node build.mjs\n' +
    '(function () {\n' +
    "'use strict';\n\n" +
    parts.join('\n') +
    '})();\n'
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(ROOT, OUTPUT), buildTracker(), 'utf8');
  console.log(`${OUTPUT} собран из ${SOURCES.join(' + ')}`);
}
