// Приёмочные тесты T1–T5 (node:test). Запуск: node --test tests/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialTasks,
  addTask,
  removeTask,
  toggleTask,
  computeMetrics,
  filterTasks,
  validateTaskInput,
  isValidTaskList,
} from '../domain.mjs';

const titles = (tasks) => tasks.map((t) => t.title);
const findByTitle = (tasks, title) => tasks.find((t) => t.title === title);

describe('Операции над данными (1.2)', () => {
  test('addTask добавляет задачу с done=false и не мутирует исходный массив', () => {
    const tasks = createInitialTasks();
    const snapshot = structuredClone(tasks);
    const next = addTask(tasks, { title: 'Конспект', hours: 2 }, () => 'new-1');
    assert.deepEqual(tasks, snapshot);
    assert.equal(next.length, 4);
    assert.deepEqual(next[3], { id: 'new-1', title: 'Конспект', hours: 2, done: false });
    assert.deepEqual(computeMetrics(next), { count: 4, totalHours: 10, doneHours: 2, progress: 20 });
  });

  test('addTask с генератором по умолчанию даёт уникальные id', () => {
    let tasks = createInitialTasks();
    tasks = addTask(tasks, { title: 'A', hours: 1 });
    tasks = addTask(tasks, { title: 'B', hours: 1 });
    assert.equal(new Set(tasks.map((t) => t.id)).size, tasks.length);
  });

  test('removeTask удаляет задачу; неизвестный id не меняет данные', () => {
    const tasks = createInitialTasks();
    const snapshot = structuredClone(tasks);
    const next = removeTask(tasks, 't3');
    assert.deepEqual(tasks, snapshot);
    assert.deepEqual(titles(next), ['Чтение', 'Практика']);
    assert.deepEqual(computeMetrics(next), { count: 2, totalHours: 6, doneHours: 2, progress: 33 });
    assert.deepEqual(removeTask(tasks, 'нет-такого'), snapshot);
  });

  test('toggleTask не мутирует исходный массив; неизвестный id не меняет данные', () => {
    const tasks = createInitialTasks();
    const snapshot = structuredClone(tasks);
    toggleTask(tasks, 't2');
    assert.deepEqual(tasks, snapshot);
    assert.deepEqual(toggleTask(tasks, 'нет-такого'), snapshot);
  });

  test('createInitialTasks возвращает независимые копии', () => {
    const a = createInitialTasks();
    a[0].done = false;
    assert.equal(createInitialTasks()[0].done, true);
  });
});

describe('T1 · Исходный пример', () => {
  test('3 задачи, всего 8 ч, выполнено 2 ч, прогресс 25% по часам (не 33%)', () => {
    const tasks = createInitialTasks();
    assert.equal(tasks.length, 3);
    assert.deepEqual(
      tasks.map(({ title, hours, done }) => ({ title, hours, done })),
      [
        { title: 'Чтение', hours: 2, done: true },
        { title: 'Практика', hours: 4, done: false },
        { title: 'Повторение', hours: 2, done: false },
      ],
    );
    const m = computeMetrics(tasks);
    assert.deepEqual(m, { count: 3, totalHours: 8, doneHours: 2, progress: 25 });
    assert.notEqual(m.progress, Math.round((100 * 1) / 3));
  });
});

describe('T2 · Статус', () => {
  test('«Практика» выполнена → 6 из 8 ч, 75%; данные изменились', () => {
    const tasks = createInitialTasks();
    const id = findByTitle(tasks, 'Практика').id;
    const next = toggleTask(tasks, id);
    assert.equal(findByTitle(next, 'Практика').done, true);
    assert.deepEqual(computeMetrics(next), { count: 3, totalHours: 8, doneHours: 6, progress: 75 });
  });

  test('повторное переключение возвращает 2 из 8 ч и 25%', () => {
    const tasks = createInitialTasks();
    const id = findByTitle(tasks, 'Практика').id;
    const back = toggleTask(toggleTask(tasks, id), id);
    assert.equal(findByTitle(back, 'Практика').done, false);
    assert.deepEqual(computeMetrics(back), { count: 3, totalHours: 8, doneHours: 2, progress: 25 });
  });
});

describe('T3 · Фильтр', () => {
  test('«active» → только Практика и Повторение; прогресс по всем задачам остаётся 25%', () => {
    const tasks = createInitialTasks();
    const visible = filterTasks(tasks, 'active');
    assert.deepEqual(titles(visible), ['Практика', 'Повторение']);
    assert.deepEqual(computeMetrics(tasks), { count: 3, totalHours: 8, doneHours: 2, progress: 25 });
    assert.equal(tasks.length, 3, 'фильтр не меняет данные');
  });

  test('«done» → только Чтение; метрики не меняются', () => {
    const tasks = createInitialTasks();
    assert.deepEqual(titles(filterTasks(tasks, 'done')), ['Чтение']);
    assert.equal(computeMetrics(tasks).progress, 25);
  });

  test('«all» и неизвестный фильтр → все задачи', () => {
    const tasks = createInitialTasks();
    assert.deepEqual(titles(filterTasks(tasks, 'all')), titles(tasks));
    assert.deepEqual(titles(filterTasks(tasks, 'что-то')), titles(tasks));
  });

  test('фильтр без совпадений → пустой видимый список, метрики по всем задачам', () => {
    const tasks = toggleTask(createInitialTasks(), 't1'); // выполненных нет
    assert.deepEqual(filterTasks(tasks, 'done'), []);
    assert.deepEqual(computeMetrics(tasks), { count: 3, totalHours: 8, doneHours: 0, progress: 0 });
  });
});

describe('T4 · Ошибки ввода', () => {
  const rejectTitle = [
    ['пустое название', ''],
    ['название из пробелов', '   '],
  ];
  for (const [name, title] of rejectTitle) {
    test(`${name} отклоняется с ошибкой у поля названия`, () => {
      const r = validateTaskInput({ title, hours: '2' });
      assert.equal(r.ok, false);
      assert.ok(r.errors.title);
      assert.equal(r.errors.hours, undefined);
    });
  }

  const rejectHours = [
    ['пустые часы (не равны нулю)', ''],
    ['часы из пробелов', '  '],
    ['отрицательные часы', '-1'],
    ['ноль', '0'],
    ['меньше 0,5', '0.25'],
    ['больше 24', '24.5'],
    ['не кратно 0,5', '1.3'],
    ['не число', 'abc'],
  ];
  for (const [name, hours] of rejectHours) {
    test(`${name} (${JSON.stringify(hours)}) отклоняются с ошибкой у поля часов`, () => {
      const r = validateTaskInput({ title: 'Тест', hours });
      assert.equal(r.ok, false);
      assert.ok(r.errors.hours);
      assert.equal(r.errors.title, undefined);
    });
  }

  const acceptHours = [
    ['0.5', 0.5],
    ['0,5', 0.5],
    ['24', 24],
    ['1.5', 1.5],
    [' 3 ', 3],
  ];
  for (const [raw, expected] of acceptHours) {
    test(`часы ${JSON.stringify(raw)} принимаются как ${expected}`, () => {
      const r = validateTaskInput({ title: '  Лабораторная  ', hours: raw });
      assert.equal(r.ok, true);
      assert.deepEqual(r.value, { title: 'Лабораторная', hours: expected });
    });
  }

  test('обе ошибки собираются одновременно', () => {
    const r = validateTaskInput({ title: ' ', hours: '-2' });
    assert.equal(r.ok, false);
    assert.ok(r.errors.title);
    assert.ok(r.errors.hours);
  });

  test('некорректная задача не добавляется (поток «валидация → добавление»)', () => {
    let tasks = createInitialTasks();
    for (const input of [
      { title: '', hours: '2' },
      { title: '   ', hours: '2' },
      { title: 'Тест', hours: '' },
      { title: 'Тест', hours: '-1' },
    ]) {
      const r = validateTaskInput(input);
      if (r.ok) tasks = addTask(tasks, r.value);
    }
    assert.equal(tasks.length, 3);
    assert.equal(computeMetrics(tasks).progress, 25);
  });
});

describe('T5 · Пустое состояние', () => {
  test('удаление всех задач → 0 ч и 0%, без NaN/Infinity', () => {
    let tasks = createInitialTasks();
    for (const t of createInitialTasks()) tasks = removeTask(tasks, t.id);
    assert.equal(tasks.length, 0);
    const m = computeMetrics(tasks);
    assert.deepEqual(m, { count: 0, totalHours: 0, doneHours: 0, progress: 0 });
    for (const v of Object.values(m)) assert.ok(Number.isFinite(v));
    assert.deepEqual(filterTasks(tasks, 'active'), []);
  });

  test('после пустого состояния добавление работает и метрики пересчитываются', () => {
    let tasks = [];
    const r = validateTaskInput({ title: 'Новая', hours: '4' });
    assert.equal(r.ok, true);
    tasks = addTask(tasks, r.value, () => 'n1');
    assert.deepEqual(computeMetrics(tasks), { count: 1, totalHours: 4, doneHours: 0, progress: 0 });
    tasks = toggleTask(tasks, 'n1');
    assert.equal(computeMetrics(tasks).progress, 100);
  });
});

describe('Проверка загружаемых данных (необязательное хранилище)', () => {
  test('isValidTaskList принимает корректный список и отклоняет мусор', () => {
    assert.equal(isValidTaskList(createInitialTasks()), true);
    assert.equal(isValidTaskList([]), true);
    assert.equal(isValidTaskList(null), false);
    assert.equal(isValidTaskList([{ id: 'a', title: 'x', hours: 'NaN', done: false }]), false);
    assert.equal(isValidTaskList([{ id: 'a', title: '', hours: 1, done: false }]), false);
  });
});

// ---------- redesign-ui: чистые функции настроек ----------
import {
  ACCENT_PRESETS,
  DEFAULT_SETTINGS,
  defaultSettings,
  clampAccent,
  normalizeSettings,
  resolveTheme,
  findPreset,
  hslToRgb,
  relativeLuminance,
  contrastRatio,
  accentTextColor,
} from '../domain.mjs';

describe('redesign-ui · Пресеты и настройки по умолчанию (1.1)', () => {
  test('5 пресетов со значениями из брифа', () => {
    assert.deepEqual(
      ACCENT_PRESETS.map(({ id, name, h, s, l }) => [id, name, h, s, l]),
      [
        ['lilac', 'Сиреневый', 320, 35, 68],
        ['blue', 'Синий', 217, 85, 62],
        ['emerald', 'Изумрудный', 158, 60, 48],
        ['amber', 'Янтарный', 38, 92, 56],
        ['coral', 'Коралловый', 8, 80, 64],
      ],
    );
  });

  test('по умолчанию: тема «Системная», акцент Сиреневый', () => {
    const expected = { theme: 'system', accent: { preset: 'lilac', h: 320, s: 35, l: 68 } };
    assert.deepEqual(DEFAULT_SETTINGS, expected);
    assert.deepEqual(defaultSettings(), expected);
    const a = defaultSettings();
    a.accent.h = 1;
    assert.equal(defaultSettings().accent.h, 320, 'независимые копии');
  });
});

describe('redesign-ui · Нормализация настроек (1.2)', () => {
  test('неизвестная тема → «Системная»; известные темы сохраняются', () => {
    assert.equal(normalizeSettings({ theme: 'neon' }).theme, 'system');
    assert.equal(normalizeSettings({ theme: 'dark' }).theme, 'dark');
    assert.equal(normalizeSettings({ theme: 'light' }).theme, 'light');
    assert.equal(normalizeSettings({ theme: 'system' }).theme, 'system');
  });

  for (const raw of [null, undefined, 'строка', 42, [], {}]) {
    test(`мусор ${JSON.stringify(raw)} → настройки по умолчанию`, () => {
      assert.deepEqual(normalizeSettings(raw), DEFAULT_SETTINGS);
    });
  }

  test('известный пресет восстанавливается из таблицы (подмена h/s/l игнорируется)', () => {
    assert.deepEqual(normalizeSettings({ theme: 'dark', accent: { preset: 'blue', h: 1, s: 1, l: 1 } }), {
      theme: 'dark',
      accent: { preset: 'blue', h: 217, s: 85, l: 62 },
    });
  });

  test('свой цвет ограничивается диапазонами', () => {
    assert.deepEqual(clampAccent({ h: 400, s: 50, l: 95 }), { h: 360, s: 50, l: 80 });
    assert.deepEqual(clampAccent({ h: -5, s: -10, l: 5 }), { h: 0, s: 0, l: 20 });
    assert.deepEqual(clampAccent({ h: '200', s: '40.4', l: '33.6' }), { h: 200, s: 40, l: 34 });
    assert.deepEqual(normalizeSettings({ theme: 'light', accent: { preset: null, h: 400, s: 50, l: 95 } }), {
      theme: 'light',
      accent: { preset: null, h: 360, s: 50, l: 80 },
    });
  });

  test('нечисловые компоненты → значения Сиреневого', () => {
    assert.deepEqual(clampAccent({ h: 'abc', s: NaN, l: Infinity }), { h: 320, s: 35, l: 68 });
    assert.deepEqual(clampAccent(null), { h: 320, s: 35, l: 68 });
  });

  test('свой цвет, совпадающий с пресетом, получает id пресета', () => {
    assert.equal(normalizeSettings({ accent: { preset: null, h: 38, s: 92, l: 56 } }).accent.preset, 'amber');
  });
});

describe('redesign-ui · Цвет текста на акценте (2.1)', () => {
  test('hslToRgb на опорных цветах', () => {
    assert.deepEqual(hslToRgb({ h: 0, s: 100, l: 50 }), [255, 0, 0]);
    assert.deepEqual(hslToRgb({ h: 120, s: 100, l: 50 }), [0, 255, 0]);
    assert.deepEqual(hslToRgb({ h: 0, s: 0, l: 100 }), [255, 255, 255]);
    assert.ok(Math.abs(contrastRatio(relativeLuminance([255, 255, 255]), 0) - 21) < 1e-9);
  });

  test('Янтарный → чёрный текст', () => {
    assert.equal(accentTextColor({ h: 38, s: 92, l: 56 }), '#000');
  });

  test('яркость 25% → белый текст', () => {
    assert.equal(accentTextColor({ h: 217, s: 85, l: 25 }), '#fff');
    assert.equal(accentTextColor({ h: 0, s: 0, l: 25 }), '#fff');
  });

  test('для каждого пресета контраст выбранного цвета текста ≥ 4.5', () => {
    for (const p of ACCENT_PRESETS) {
      const lum = relativeLuminance(hslToRgb(p));
      const text = accentTextColor(p);
      const ratio = contrastRatio(lum, text === '#000' ? 0 : 1);
      assert.ok(ratio >= 4.5, `${p.name}: ${ratio.toFixed(2)}`);
    }
  });
});

describe('redesign-ui · Тема и поиск пресета (2.2)', () => {
  test('resolveTheme', () => {
    assert.equal(resolveTheme('system', true), 'dark');
    assert.equal(resolveTheme('system', false), 'light');
    assert.equal(resolveTheme('light', true), 'light');
    assert.equal(resolveTheme('dark', false), 'dark');
    assert.equal(resolveTheme('neon', true), 'dark');
  });

  test('findPreset', () => {
    assert.equal(findPreset({ h: 158, s: 60, l: 48 }), 'emerald');
    assert.equal(findPreset({ h: 200, s: 60, l: 48 }), null);
    assert.equal(findPreset(null), null);
  });
});

// ---------- fix-sandbox-input: клавиша Enter ----------
import { isEnterSubmit } from '../domain.mjs';

describe('fix-sandbox-input · isEnterSubmit (1.1)', () => {
  test('Enter → добавить', () => {
    assert.equal(isEnterSubmit({ key: 'Enter' }), true);
    assert.equal(isEnterSubmit({ key: 'Enter', shiftKey: false, isComposing: false, keyCode: 13 }), true);
  });
  test('Shift+Enter, IME-композиция, keyCode 229, другая клавиша → не добавлять', () => {
    assert.equal(isEnterSubmit({ key: 'Enter', shiftKey: true }), false);
    assert.equal(isEnterSubmit({ key: 'Enter', isComposing: true }), false);
    assert.equal(isEnterSubmit({ key: 'Enter', keyCode: 229 }), false);
    assert.equal(isEnterSubmit({ key: 'a' }), false);
    assert.equal(isEnterSubmit(), false);
  });
});

// ---------- fix-sandbox-input: сборка tracker.js ----------
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { BANNER, buildTracker } from '../build.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (name) => readFileSync(new URL(name, ROOT), 'utf8');
const sources = () => ({ domainSource: read('domain.mjs'), appSource: read('app.mjs') });

describe('fix-sandbox-input · Актуальность и синтаксис tracker.js (4.1)', () => {
  test('tracker.js совпадает со сборкой из текущих domain.mjs + app.mjs', () => {
    assert.ok(
      buildTracker(sources()) === read('tracker.js'),
      'tracker.js устарел — выполните `node build.mjs`',
    );
  });

  test('tracker.js — корректный классический скрипт без import/export, с пометкой о генерации', () => {
    const code = read('tracker.js');
    assert.doesNotThrow(() => new vm.Script(code, { filename: 'tracker.js' }));
    const check = spawnSync(process.execPath, ['--check', new URL('tracker.js', ROOT).pathname], { encoding: 'utf8' });
    assert.equal(check.status, 0, check.stderr);
    assert.ok(code.startsWith(BANNER));
    assert.equal(/^\s*(import|export)\b/m.test(code), false);
  });

  test('правка app.mjs без пересборки меняет результат (тест актуальности упал бы)', () => {
    const s = sources();
    const changed = buildTracker({ ...s, appSource: s.appSource + '\n// правка\n' });
    assert.notEqual(changed, buildTracker(s));
    assert.notEqual(changed, read('tracker.js'));
  });

  test('сборка детерминирована и не зависит от переводов строк CRLF', () => {
    const s = sources();
    assert.equal(buildTracker(s), buildTracker(s));
    const crlf = { domainSource: s.domainSource.replace(/\n/g, '\r\n'), appSource: s.appSource.replace(/\n/g, '\r\n') };
    assert.equal(buildTracker(crlf), buildTracker(s));
  });
});

describe('fix-sandbox-input · Ошибки контракта сборки (2.2)', () => {
  const s = sources();
  test('export default в domain.mjs → ошибка', () => {
    assert.throws(() => buildTracker({ ...s, domainSource: s.domainSource + '\nexport default 1;\n' }), /domain\.mjs:\d+: неподдерживаемый export/);
  });
  test('export { … } в domain.mjs → ошибка', () => {
    assert.throws(() => buildTracker({ ...s, domainSource: s.domainSource + '\nexport { MIN_HOURS as X };\n' }), /неподдерживаемый export/);
  });
  test('посторонний import в app.mjs → ошибка', () => {
    assert.throws(() => buildTracker({ ...s, appSource: s.appSource + "\nimport fs from 'node:fs';\n" }), /app\.mjs:\d+: неподдерживаемый import/);
  });
  test('import в domain.mjs → ошибка', () => {
    assert.throws(() => buildTracker({ ...s, domainSource: "import x from './x.mjs';\n" + s.domainSource }), /не должен ничего импортировать/);
  });
  test('импорт несуществующего имени → ошибка', () => {
    const bad = s.appSource.replace('  isEnterSubmit,\n', '  isEnterSubmit,\n  nope,\n');
    assert.throws(() => buildTracker({ ...s, appSource: bad }), /«nope» отсутствует среди export/);
  });
  test('нет блока импорта из domain.mjs → ошибка', () => {
    assert.throws(() => buildTracker({ ...s, appSource: 'console.log(1);\n' }), /не найден блок import/);
  });
});

// Минимальная заглушка DOM для выполнения tracker.js в vm (не браузер).
function makeDom(html) {
  class El {
    constructor(tag, attrs = {}) {
      this.tagName = tag; this.attrs = { ...attrs }; this.children = []; this.parent = null; this.listeners = {};
      this.dataset = {}; this.textContent = ''; this.value = ''; this.checked = false; this.type = attrs.type ?? '';
      this.hidden = 'hidden' in attrs; this.className = attrs.class ?? ''; this._style = {};
      this.style = { setProperty: (k, v) => { this._style[k] = v; } };
    }
    get classList() {
      const self = this;
      const list = () => self.className.split(' ').filter(Boolean);
      return {
        add: (c) => { if (!list().includes(c)) self.className = [...list(), c].join(' '); },
        remove: (c) => { self.className = list().filter((x) => x !== c).join(' '); },
        contains: (c) => list().includes(c),
      };
    }
    append(...c) { for (const x of c) { x.parent = this; this.children.push(x); } }
    replaceChildren(...c) { this.children = []; this.append(...c); }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    removeAttribute(k) { delete this.attrs[k]; }
    getAttribute(k) { return this.attrs[k] ?? null; }
    addEventListener(t, f) { (this.listeners[t] ??= []).push(f); }
    dispatch(type, props = {}) {
      const ev = { type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...props };
      for (const f of this.listeners[type] ?? []) f(ev);
      return ev;
    }
    focus() { dom.focused = this; }
    reset() { dom.byId['task-title'].value = ''; dom.byId['task-hours'].value = ''; }
    contains(n) { for (; n; n = n.parent) if (n === this) return true; return false; }
    *walk() { for (const c of this.children) { yield c; yield* c.walk(); } }
    matches(sel) {
      if (sel === '.task') return this.classList.contains('task');
      if (sel === '.task--new') return this.classList.contains('task--new');
      const m = sel.match(/^\[data-action="(\w+)"\]$/);
      return m ? this.dataset.action === m[1] : false;
    }
    closest(sel) { for (let n = this; n; n = n.parent) if (n.matches(sel)) return n; return null; }
    querySelectorAll(sel) { return [...this.walk()].filter((n) => n.matches(sel)); }
    querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
  }
  const dom = { byId: {}, focused: null, docListeners: {} };
  for (const m of html.matchAll(/<(\w+)([^>]*\sid="([^"]+)"[^>]*)>/g)) {
    const attrs = {};
    for (const a of m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[a[1]] = a[2] ?? '';
    dom.byId[m[3]] = new El(m[1], attrs);
  }
  dom.document = {
    getElementById: (id) => dom.byId[id] ?? null,
    createElement: (t) => new El(t),
    documentElement: new El('html'),
    addEventListener: (t, f) => { (dom.docListeners[t] ??= []).push(f); },
  };
  return dom;
}

function runTracker({ storage = 'security-error' } = {}) {
  const dom = makeDom(read('index.html'));
  const sandbox = {
    document: dom.document,
    matchMedia: () => ({ matches: true, addEventListener() {} }),
    setTimeout, clearTimeout, console,
  };
  if (storage === 'security-error') {
    // Непрозрачный origin: сам геттер localStorage бросает SecurityError.
    Object.defineProperty(sandbox, 'localStorage', {
      get() { const e = new Error('The document is sandboxed and lacks the allow-same-origin flag.'); e.name = 'SecurityError'; throw e; },
    });
  }
  const context = vm.createContext(sandbox);
  const before = new Set(Object.getOwnPropertyNames(context));
  new vm.Script(read('tracker.js'), { filename: 'tracker.js' }).runInContext(context);
  const added = Object.getOwnPropertyNames(context).filter((k) => !before.has(k));
  const $ = (id) => dom.byId[id];
  const summary = () => `${$('total-hours').textContent}/${$('done-hours').textContent}/${$('progress-value').textContent}%`;
  return { dom, $, summary, added };
}

describe('fix-sandbox-input · tracker.js в vm с заглушкой DOM (3.1, 3.2, 4.2)', () => {
  test('выполняется без исключений при SecurityError на localStorage и не создаёт глобальных имён', () => {
    const { $, summary, added } = runTracker();
    assert.deepEqual(added, []);
    assert.equal(summary(), '8/2/25%');
    assert.equal($('storage-message').hidden, false, 'видно сообщение о работе без сохранения');
  });

  test('кнопка «Добавить» (click) добавляет ровно одну задачу', () => {
    const { $, summary, dom } = runTracker();
    $('task-title').value = 'Тест'; $('task-hours').value = '2';
    $('task-add').dispatch('click');
    assert.equal(summary(), '10/2/20%');
    assert.equal($('task-list').children.length, 4);
    assert.equal(dom.focused, $('task-title'));
    assert.equal($('task-title').value, '');
  });

  for (const field of ['task-hours', 'task-title']) {
    test(`Enter в поле ${field} добавляет ровно одну задачу и отменяет действие по умолчанию`, () => {
      const { $, summary } = runTracker();
      $('task-title').value = 'Тест'; $('task-hours').value = '2';
      const ev = $(field).dispatch('keydown', { key: 'Enter', shiftKey: false, isComposing: false, keyCode: 13 });
      assert.equal(ev.defaultPrevented, true);
      assert.equal(summary(), '10/2/20%');
      assert.equal($('task-list').children.length, 4);
    });
  }

  test('Shift+Enter и IME-композиция не добавляют задачу и не показывают ошибку', () => {
    const { $, summary } = runTracker();
    $('task-title').value = 'Тест'; $('task-hours').value = '2';
    $('task-hours').dispatch('keydown', { key: 'Enter', shiftKey: true });
    $('task-hours').dispatch('keydown', { key: 'Enter', isComposing: true });
    $('task-hours').dispatch('keydown', { key: 'Enter', keyCode: 229 });
    assert.equal(summary(), '8/2/25%');
    assert.equal($('task-title-error').hidden, true);
    assert.equal($('task-hours-error').hidden, true);
  });

  test('ошибка ввода через кнопку: задача не добавлена, ошибка у поля, значения сохранены', () => {
    const { $, summary } = runTracker();
    $('task-title').value = ''; $('task-hours').value = '2';
    $('task-add').dispatch('click');
    assert.equal(summary(), '8/2/25%');
    assert.equal($('task-title-error').hidden, false);
    assert.equal($('task-hours').value, '2');
  });

  test('запасной submit отменяется и добавляет ровно одну задачу', () => {
    const { $, summary } = runTracker();
    $('task-title').value = 'Тест'; $('task-hours').value = '2';
    const ev = $('task-form').dispatch('submit');
    assert.equal(ev.defaultPrevented, true);
    assert.equal(summary(), '10/2/20%');
  });

  test('шестерёнка открывает и закрывает панель настроек при недоступном хранилище', () => {
    const { $ } = runTracker();
    $('settings-toggle').dispatch('click');
    assert.equal($('settings-panel').hidden, false);
    $('settings-close').dispatch('click');
    assert.equal($('settings-panel').hidden, true);
  });
});

describe('fix-sandbox-input · index.html (3.3)', () => {
  const html = read('index.html');
  test('подключён классический tracker.js с defer, без type="module"', () => {
    assert.match(html, /<script src="tracker\.js" defer><\/script>/);
    assert.equal(/type="module"/.test(html), false);
  });
  test('кнопка «Добавить» — type="button", кнопок type="submit" нет', () => {
    assert.match(html, /<button id="task-add" type="button"/);
    assert.equal(/type="submit"/.test(html), false);
  });
});
