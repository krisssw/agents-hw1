// Сборка классического скрипта tracker.js из domain.mjs + app.mjs (без зависимостей).
// Запуск: node build.mjs
// Зачем: браузер не загружает ES-модули через file:// и при непрозрачном origin (iframe sandbox).
import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

export const BANNER =
  '// tracker.js — СГЕНЕРИРОВАНО build.mjs из domain.mjs + app.mjs. Не редактировать вручную: ' +
  'правьте исходники и запустите `node build.mjs`.';

class BuildError extends Error {
  constructor(file, line, message) {
    super(`${file}${line ? `:${line}` : ''}: ${message}`);
    this.name = 'BuildError';
  }
}

const normalize = (src) => String(src).replace(/\r\n?/g, '\n');
// Код исходников переносится без отступов: так не меняется содержимое многострочных строк.

/** domain.mjs: снять `export` у const/let/function/class, собрать имена; прочее — ошибка. */
function transformDomain(source) {
  const lines = normalize(source).split('\n');
  const names = [];
  const out = lines.map((line, i) => {
    const m = line.match(/^export\s+(const|let|function|class)\s+([A-Za-z_$][\w$]*)/);
    if (m) {
      names.push(m[2]);
      return line.replace(/^export\s+/, '');
    }
    if (/^\s*export\b/.test(line)) {
      throw new BuildError('domain.mjs', i + 1, `неподдерживаемый export: «${line.trim()}»`);
    }
    if (/^\s*import\b/.test(line)) {
      throw new BuildError('domain.mjs', i + 1, `domain.mjs не должен ничего импортировать: «${line.trim()}»`);
    }
    return line;
  });
  if (names.length === 0) throw new BuildError('domain.mjs', 0, 'не найдено ни одного export');
  if (new Set(names).size !== names.length) throw new BuildError('domain.mjs', 0, 'повторяющиеся имена export');
  return { code: out.join('\n'), names };
}

/** app.mjs: удалить единственный import { … } from './domain.mjs'; прочие import/export — ошибка. */
function transformApp(source, exported) {
  const src = normalize(source);
  const re = /^import\s*\{([^}]*)\}\s*from\s*['"]\.\/domain\.mjs['"];?[ \t]*\n?/m;
  const m = src.match(re);
  if (!m) throw new BuildError('app.mjs', 0, "не найден блок import { … } from './domain.mjs'");
  const imported = m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const name of imported) {
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
      throw new BuildError('app.mjs', 0, `неподдерживаемый импорт «${name}» (переименование не поддерживается)`);
    }
    if (!exported.includes(name)) {
      throw new BuildError('app.mjs', 0, `импорт «${name}» отсутствует среди export в domain.mjs`);
    }
  }
  const rest = src.replace(re, '');
  rest.split('\n').forEach((line, i) => {
    if (/^\s*(import|export)\b/.test(line)) {
      throw new BuildError('app.mjs', i + 1, `неподдерживаемый import/export: «${line.trim()}»`);
    }
  });
  return { code: rest, imported };
}

/** Чистая функция сборки: исходники → текст tracker.js (детерминированно). */
export function buildTracker({ domainSource, appSource }) {
  const domain = transformDomain(domainSource);
  const app = transformApp(appSource, domain.names);
  const exportsList = [...domain.names].sort().join(', ');
  return [
    BANNER,
    '(function () {',
    "  'use strict';",
    '  const domain = (function () {',
    '    // --- domain.mjs ---',
    domain.code.trimEnd(),
    `    return Object.freeze({ ${exportsList} });`,
    '  })();',
    '  (function () {',
    `    const { ${app.imported.join(', ')} } = domain;`,
    '    // --- app.mjs ---',
    app.code.trimEnd(),
    '  })();',
    '})();',
    '',
  ].join('\n');
}

/** Прочитать исходники из каталога и собрать. */
export function buildFromDir(dir) {
  return buildTracker({
    domainSource: readFileSync(join(dir, 'domain.mjs'), 'utf8'),
    appSource: readFileSync(join(dir, 'app.mjs'), 'utf8'),
  });
}

function main() {
  const dir = dirname(fileURLToPath(import.meta.url));
  const target = join(dir, 'tracker.js');
  let output;
  try {
    output = buildFromDir(dir);
  } catch (err) {
    console.error(`Сборка не выполнена: ${err.message}`);
    console.error('tracker.js не изменён.');
    process.exitCode = 1;
    return;
  }
  const tmp = `${target}.tmp`;
  try {
    writeFileSync(tmp, output);
    renameSync(tmp, target);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      /* временного файла нет */
    }
    console.error(`Не удалось записать tracker.js: ${err.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`tracker.js собран (${output.length} символов).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
