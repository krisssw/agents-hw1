// СГЕНЕРИРОВАНО build.mjs из domain.mjs + app.mjs. Не редактировать вручную: node build.mjs
(function () {
'use strict';

// ----- domain.mjs -----
// Чистые расчёты и валидация мини-трекера. Без DOM и без побочных эффектов.

const HOURS_MIN = 0.5;
const HOURS_MAX = 24;
const HOURS_STEP = 0.5;

const FILTERS = Object.freeze(['all', 'active', 'done']);

function createSampleTasks() {
  return [
    { id: 't1', title: 'Чтение', hours: 2, done: true },
    { id: 't2', title: 'Практика', hours: 4, done: false },
    { id: 't3', title: 'Повторение', hours: 2, done: false },
  ];
}

/** Валидирует название. Возвращает { ok, value?, error? }. */
function validateTitle(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value === '') return { ok: false, error: 'Введите название задачи (не только пробелы).' };
  return { ok: true, value };
}

/** Валидирует часы. Пустая строка — ошибка, а не ноль. Допускается запятая как разделитель. */
function validateHours(raw) {
  if (raw === null || raw === undefined) return { ok: false, error: 'Укажите часы.' };
  const str = typeof raw === 'number' ? String(raw) : String(raw).trim();
  if (str === '') return { ok: false, error: 'Укажите часы.' };
  const normalized = str.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return { ok: false, error: 'Часы должны быть числом.' };
  const value = Number(normalized);
  if (!Number.isFinite(value)) return { ok: false, error: 'Часы должны быть числом.' };
  if (value < HOURS_MIN || value > HOURS_MAX) {
    return { ok: false, error: 'Часы должны быть от 0,5 до 24.' };
  }
  if (Math.round(value / HOURS_STEP) * HOURS_STEP !== value) {
    return { ok: false, error: 'Шаг часов — 0,5 (например, 1 или 1,5).' };
  }
  return { ok: true, value };
}

/** Валидирует форму целиком. errors — по полям. */
function validateTaskInput({ title, hours }) {
  const t = validateTitle(title);
  const h = validateHours(hours);
  const errors = {};
  if (!t.ok) errors.title = t.error;
  if (!h.ok) errors.hours = h.error;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title: t.value, hours: h.value } };
}

let counter = 0;
function makeId() {
  counter += 1;
  return `t${Date.now().toString(36)}${counter}`;
}

/** Возвращает новый массив с добавленной задачей или ошибки (массив не меняется). */
function addTask(tasks, input, idFactory = makeId) {
  const res = validateTaskInput(input);
  if (!res.ok) return { ok: false, errors: res.errors, tasks };
  const task = { id: idFactory(), title: res.value.title, hours: res.value.hours, done: false };
  return { ok: true, tasks: [...tasks, task], task };
}

function removeTask(tasks, id) {
  return tasks.filter((t) => t.id !== id);
}

function toggleTask(tasks, id) {
  return tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

function filterTasks(tasks, filter) {
  if (filter === 'active') return tasks.filter((t) => !t.done);
  if (filter === 'done') return tasks.filter((t) => t.done);
  return tasks.slice();
}

/** Метрики всегда по всем задачам, независимо от фильтра. */
function computeStats(tasks) {
  const totalHours = tasks.reduce((s, t) => s + t.hours, 0);
  const doneHours = tasks.filter((t) => t.done).reduce((s, t) => s + t.hours, 0);
  const progress = totalHours > 0 ? Math.round((100 * doneHours) / totalHours) : 0;
  return { count: tasks.length, totalHours, doneHours, progress };
}

function formatHours(h) {
  return String(h).replace('.', ',');
}

/** Проверка структуры данных из хранилища. */
function isValidTaskList(data) {
  return (
    Array.isArray(data) &&
    data.every(
      (t) =>
        t && typeof t.id === 'string' && typeof t.title === 'string' && t.title.trim() !== '' &&
        typeof t.done === 'boolean' && validateHours(t.hours).ok,
    )
  );
}

// ---------- Доработка: настройки темы и акцента ----------

const THEMES = Object.freeze(['dark', 'light', 'system']);
const THEME_LABELS = Object.freeze({ dark: 'Тёмная', light: 'Светлая', system: 'Системная' });

const ACCENT_LIMITS = Object.freeze({
  h: { min: 0, max: 360 },
  s: { min: 0, max: 100 },
  l: { min: 20, max: 80 },
});

const PRESET_ACCENTS = Object.freeze([
  Object.freeze({ id: 'lilac', name: 'Сиреневый', h: 320, s: 35, l: 68 }),
  Object.freeze({ id: 'blue', name: 'Синий', h: 217, s: 85, l: 62 }),
  Object.freeze({ id: 'emerald', name: 'Изумрудный', h: 158, s: 60, l: 48 }),
  Object.freeze({ id: 'amber', name: 'Янтарный', h: 38, s: 92, l: 56 }),
  Object.freeze({ id: 'coral', name: 'Коралловый', h: 8, s: 80, l: 64 }),
]);

const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system',
  accent: Object.freeze({ h: 320, s: 35, l: 68 }),
});

function clampNumber(value, min, max, fallback) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Ограничивает компоненты HSL допустимыми диапазонами; мусор → значение по умолчанию. */
function normalizeAccent(raw) {
  const d = DEFAULT_SETTINGS.accent;
  const a = raw && typeof raw === 'object' ? raw : {};
  return {
    h: clampNumber(a.h, ACCENT_LIMITS.h.min, ACCENT_LIMITS.h.max, d.h),
    s: clampNumber(a.s, ACCENT_LIMITS.s.min, ACCENT_LIMITS.s.max, d.s),
    l: clampNumber(a.l, ACCENT_LIMITS.l.min, ACCENT_LIMITS.l.max, d.l),
  };
}

/** Нормализует настройки: неизвестная тема → «system», акцент ограничивается диапазонами. */
function normalizeSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const theme = THEMES.includes(r.theme) ? r.theme : 'system';
  return { theme, accent: normalizeAccent(r.accent) };
}

/** Итоговая тема с учётом системной настройки. */
function resolveTheme(theme, prefersDark) {
  if (theme === 'dark' || theme === 'light') return theme;
  return prefersDark ? 'dark' : 'light';
}

/** Пресет, совпадающий с акцентом, или null (свой цвет). */
function findPreset(accent) {
  const a = normalizeAccent(accent);
  return PRESET_ACCENTS.find((p) => p.h === a.h && p.s === a.s && p.l === a.l) || null;
}

function hslToCss({ h, s, l }) {
  return `hsl(${h} ${s}% ${l}%)`;
}

/** HSL (h 0–360, s,l 0–100) → RGB 0–255. */
function hslToRgb({ h, s, l }) {
  const S = s / 100;
  const L = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

/** Относительная яркость по WCAG 2.x. */
function relativeLuminance([r, g, b]) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(l1, l2) {
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

/** Цвет текста на акценте: чёрный или белый — тот, у которого контраст выше. */
function accentTextColor(accent) {
  const lum = relativeLuminance(hslToRgb(normalizeAccent(accent)));
  return contrastRatio(lum, 0) >= contrastRatio(lum, 1) ? '#000000' : '#ffffff';
}

// ----- app.mjs -----
const STORAGE_KEY = 'mini-tracker-tasks-v1';
const SETTINGS_KEY = 'mini-tracker-settings-v1';
const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

const state = {
  tasks: createSampleTasks(),
  filter: 'all',
  storageOk: true,
  lastAddedId: null,
  settings: normalizeSettings(DEFAULT_SETTINGS),
};

// ---------- Хранилище ----------
function showStorageMsg(text) {
  const el = $('storage-msg');
  el.textContent = text;
  el.hidden = false;
}

function storageFailed() {
  if (!state.storageOk) return;
  state.storageOk = false;
  showStorageMsg('Хранилище браузера недоступно: задачи и настройки работают в памяти и не сохранятся после перезагрузки.');
}

// Непрозрачный origin (file://, iframe sandbox без allow-same-origin) бросает SecurityError
// уже при обращении к window.localStorage — поэтому доступ к хранилищу только через try.
function getStorage() {
  if (!state.storageOk) return null;
  try {
    const s = window.localStorage;
    if (!s) throw new Error('localStorage отсутствует');
    return s;
  } catch {
    storageFailed();
    return null;
  }
}

function readJson(key) {
  const storage = getStorage();
  if (!storage) return undefined;
  let raw;
  try {
    raw = storage.getItem(key);
  } catch {
    storageFailed();
    return undefined;
  }
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined; // повреждённые данные — используем значения по умолчанию
  }
}

function writeJson(key, value) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    storageFailed();
  }
}

function load() {
  const tasks = readJson(STORAGE_KEY);
  if (isValidTaskList(tasks)) state.tasks = tasks;
  const settings = readJson(SETTINGS_KEY);
  if (settings !== undefined) state.settings = normalizeSettings(settings);
}

const saveTasks = () => writeJson(STORAGE_KEY, state.tasks);
const saveSettings = () => writeJson(SETTINGS_KEY, state.settings);

// ---------- Задачи ----------
function render() {
  const stats = computeStats(state.tasks);
  $('total-hours').textContent = formatHours(stats.totalHours);
  $('done-hours').textContent = formatHours(stats.doneHours);
  $('progress').textContent = `${stats.progress}%`;
  $('progress-fill').style.width = `${stats.progress}%`;
  $('progress-bar').setAttribute('aria-valuenow', String(stats.progress));

  const list = $('task-list');
  list.replaceChildren();
  const visible = filterTasks(state.tasks, state.filter);
  for (const t of visible) {
    const li = document.createElement('li');
    li.className = 'task' + (t.done ? ' done' : '');
    if (t.id === state.lastAddedId && !reducedMotion.matches) li.classList.add('flash');

    const label = document.createElement('label');
    label.className = 'task-main';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = t.done;
    cb.setAttribute('aria-label', `Выполнено: ${t.title}`);
    cb.addEventListener('change', () => update(toggleTask(state.tasks, t.id)));
    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = t.title;
    label.append(cb, title);

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    const hours = document.createElement('span');
    hours.className = 'task-hours';
    hours.textContent = `${formatHours(t.hours)} ч`;
    const badge = document.createElement('span');
    badge.className = 'badge' + (t.done ? ' done' : '');
    badge.textContent = t.done ? 'Готово' : 'Активно';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn-delete';
    del.textContent = 'Удалить';
    del.setAttribute('aria-label', `Удалить задачу «${t.title}»`);
    del.addEventListener('click', () => update(removeTask(state.tasks, t.id)));
    meta.append(hours, badge, del);

    li.append(label, meta);
    list.append(li);
  }
  state.lastAddedId = null;
  $('empty').hidden = visible.length > 0;
  $('empty').textContent = state.tasks.length === 0 ? 'Задач нет. Добавьте первую.' : 'Нет задач для выбранного фильтра.';
}

function update(tasks) {
  state.tasks = tasks;
  saveTasks();
  render();
}

function setError(field, msg) {
  $(`${field}-error`).textContent = msg || '';
  $(field).setAttribute('aria-invalid', msg ? 'true' : 'false');
}

// Добавление не зависит от отправки формы: в iframe sandbox без allow-forms submit блокируется.
// Кнопка (click), Enter в полях (keydown) и submit (обычное открытие) вызывают одну функцию.
function handleAdd() {
  const btn = $('add-btn');
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 140);

  const input = { title: $('title').value, hours: $('hours').value };
  const res = addTask(state.tasks, input);
  setError('title', res.ok ? '' : res.errors.title);
  setError('hours', res.ok ? '' : res.errors.hours);
  if (!res.ok) {
    $(res.errors.title ? 'title' : 'hours').focus();
    return; // значения формы не сбрасываются
  }
  $('title').value = '';
  $('hours').value = '';
  state.lastAddedId = res.task.id;
  update(res.tasks);
  $('title').focus();
}

$('add-btn').addEventListener('click', handleAdd);
for (const id of ['title', 'hours']) {
  $(id).addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    handleAdd();
  });
}
$('task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  handleAdd();
});

for (const r of document.querySelectorAll('input[name="filter"]')) {
  r.addEventListener('change', () => { state.filter = r.value; render(); });
}

// ---------- Тема и акцент ----------
function applySettings() {
  const { theme, accent } = state.settings;
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(theme, darkQuery.matches);
  root.style.setProperty('--ah', String(accent.h));
  root.style.setProperty('--as', String(accent.s));
  root.style.setProperty('--al', String(accent.l));
  root.style.setProperty('--on-accent', accentTextColor(accent));
  syncSettingsUi();
}

function syncSettingsUi() {
  const { theme, accent } = state.settings;
  for (const r of document.querySelectorAll('input[name="theme"]')) r.checked = r.value === theme;
  const preset = findPreset(accent);
  for (const b of document.querySelectorAll('.swatch')) {
    const on = preset !== null && b.dataset.id === preset.id;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on || (preset === null && b.dataset.id === PRESET_ACCENTS[0].id) ? 0 : -1;
  }
  for (const k of ['h', 's', 'l']) {
    $(`acc-${k}`).value = String(accent[k]);
    $(`acc-${k}-out`).textContent = k === 'h' ? `${accent.h}°` : `${accent[k]}%`;
  }
  $('accent-name').textContent = preset ? preset.name : `Свой цвет · ${hslToCss(accent)}`;
}

function setSettings(patch) {
  state.settings = normalizeSettings({ ...state.settings, ...patch });
  saveSettings();
  applySettings();
}

function buildSwatches() {
  const box = $('swatches');
  for (const p of PRESET_ACCENTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.id = p.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', p.name);
    b.title = p.name;
    b.style.background = hslToCss(p);
    b.addEventListener('click', () => setSettings({ accent: { h: p.h, s: p.s, l: p.l } }));
    box.append(b);
  }
  // стрелки внутри группы цветов
  box.addEventListener('keydown', (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const btns = [...box.querySelectorAll('.swatch')];
    const i = Math.max(0, btns.indexOf(document.activeElement));
    const next = btns[(i + keys[e.key] + btns.length) % btns.length];
    next.click();
    next.focus();
  });
}

for (const r of document.querySelectorAll('input[name="theme"]')) {
  r.addEventListener('change', () => setSettings({ theme: r.value }));
}
for (const k of ['h', 's', 'l']) {
  $(`acc-${k}`).addEventListener('input', (e) => {
    setSettings({ accent: normalizeAccent({ ...state.settings.accent, [k]: Number(e.target.value) }) });
  });
}
darkQuery.addEventListener('change', () => {
  if (state.settings.theme === 'system') applySettings();
});

// ---------- Панель настроек ----------
const panel = $('settings-panel');
const gear = $('settings-btn');

function openPanel() {
  panel.hidden = false;
  gear.setAttribute('aria-expanded', 'true');
  $('settings-close').focus();
}
function closePanel(returnFocus = true) {
  if (panel.hidden) return;
  panel.hidden = true;
  gear.setAttribute('aria-expanded', 'false');
  if (returnFocus) gear.focus();
}
gear.addEventListener('click', () => (panel.hidden ? openPanel() : closePanel()));
$('settings-close').addEventListener('click', () => closePanel());
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !panel.hidden) closePanel();
});
document.addEventListener('pointerdown', (e) => {
  if (!panel.hidden && !panel.contains(e.target) && !gear.contains(e.target)) closePanel(false);
});

// ---------- Старт ----------
buildSwatches();
load();
applySettings();
render();
})();
