// tracker.js — СГЕНЕРИРОВАНО build.mjs из domain.mjs + app.mjs. Не редактировать вручную: правьте исходники и запустите `node build.mjs`.
(function () {
  'use strict';
  const domain = (function () {
    // --- domain.mjs ---
// Предметная логика трекера: чистые функции без DOM и глобального состояния.
// Задача: { id: string, title: string, hours: number, done: boolean }

const MIN_HOURS = 0.5;
const MAX_HOURS = 24;
const HOURS_STEP = 0.5;
const FILTERS = ['all', 'active', 'done'];

/** Стартовый пример (новая копия при каждом вызове). */
function createInitialTasks() {
  return [
    { id: 't1', title: 'Чтение', hours: 2, done: true },
    { id: 't2', title: 'Практика', hours: 4, done: false },
    { id: 't3', title: 'Повторение', hours: 2, done: false },
  ];
}

let idCounter = 0;
/** Генератор id по умолчанию. */
function defaultMakeId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  idCounter += 1;
  return `id-${Date.now().toString(36)}-${idCounter}`;
}

/** Добавить задачу (вход уже провалидирован). Новая задача — done=false. */
function addTask(tasks, { title, hours }, makeId = defaultMakeId) {
  return [...tasks, { id: String(makeId()), title, hours, done: false }];
}

/** Удалить задачу по id. Неизвестный id — данные без изменений. */
function removeTask(tasks, id) {
  return tasks.filter((t) => t.id !== id);
}

/** Инвертировать done у задачи с данным id. */
function toggleTask(tasks, id) {
  return tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

/** Метрики по ВСЕМ переданным задачам. Без NaN/Infinity. */
function computeMetrics(tasks) {
  let totalHours = 0;
  let doneHours = 0;
  for (const t of tasks) {
    const h = Number.isFinite(t.hours) ? t.hours : 0;
    totalHours += h;
    if (t.done) doneHours += h;
  }
  const progress = totalHours > 0 ? Math.round((100 * doneHours) / totalHours) : 0;
  return { count: tasks.length, totalHours, doneHours, progress };
}

/** Видимый список по фильтру; неизвестный фильтр трактуется как 'all'. */
function filterTasks(tasks, filter) {
  if (filter === 'active') return tasks.filter((t) => !t.done);
  if (filter === 'done') return tasks.filter((t) => t.done);
  return tasks.slice();
}

/**
 * Валидация сырых значений формы.
 * → { ok: true, value: { title, hours } } | { ok: false, errors: { title?, hours? } }
 */
function validateTaskInput({ title, hours } = {}) {
  const errors = {};

  const cleanTitle = String(title ?? '').trim();
  if (cleanTitle === '') {
    errors.title = 'Введите название задачи';
  }

  let value = NaN;
  const rawHours = typeof hours === 'number' ? String(hours) : String(hours ?? '').trim();
  if (rawHours === '') {
    errors.hours = 'Укажите количество часов';
  } else {
    value = Number(rawHours.replace(',', '.'));
    if (!Number.isFinite(value)) {
      errors.hours = 'Часы должны быть числом';
    } else if (value < MIN_HOURS || value > MAX_HOURS) {
      errors.hours = 'Часы должны быть от 0,5 до 24';
    } else if (!Number.isInteger(value / HOURS_STEP)) {
      errors.hours = 'Шаг часов — 0,5';
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { title: cleanTitle, hours: value } };
}

/** Проверка, что загруженные данные — корректный массив задач. */
function isValidTaskList(data) {
  return (
    Array.isArray(data) &&
    data.every(
      (t) =>
        t &&
        typeof t.id === 'string' &&
        typeof t.title === 'string' &&
        t.title.trim() !== '' &&
        validateTaskInput({ title: t.title, hours: t.hours }).ok &&
        typeof t.done === 'boolean',
    )
  );
}

// ---------- Настройки интерфейса (redesign-ui) ----------
// Settings = { theme: 'dark'|'light'|'system', accent: { preset: id|null, h, s, l } }

const THEMES = ['dark', 'light', 'system'];

const ACCENT_PRESETS = [
  { id: 'lilac', name: 'Сиреневый', h: 320, s: 35, l: 68 },
  { id: 'blue', name: 'Синий', h: 217, s: 85, l: 62 },
  { id: 'emerald', name: 'Изумрудный', h: 158, s: 60, l: 48 },
  { id: 'amber', name: 'Янтарный', h: 38, s: 92, l: 56 },
  { id: 'coral', name: 'Коралловый', h: 8, s: 80, l: 64 },
];

const ACCENT_LIMITS = {
  h: { min: 0, max: 360 },
  s: { min: 0, max: 100 },
  l: { min: 20, max: 80 },
};

const presetAccent = (p) => ({ preset: p.id, h: p.h, s: p.s, l: p.l });

/** Настройки по умолчанию (новая копия при каждом вызове). */
function defaultSettings() {
  return { theme: 'system', accent: presetAccent(ACCENT_PRESETS[0]) };
}
const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system',
  accent: Object.freeze(presetAccent(ACCENT_PRESETS[0])),
});

const clampNumber = (value, { min, max }, fallback) => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/** Ограничить h/s/l диапазонами; нечисловое значение → значение по умолчанию. */
function clampAccent(accent = {}) {
  const def = ACCENT_PRESETS[0];
  const a = accent && typeof accent === 'object' ? accent : {};
  return {
    h: clampNumber(a.h, ACCENT_LIMITS.h, def.h),
    s: clampNumber(a.s, ACCENT_LIMITS.s, def.s),
    l: clampNumber(a.l, ACCENT_LIMITS.l, def.l),
  };
}

/** id пресета, если h/s/l совпадают с пресетом, иначе null. */
function findPreset(accent) {
  if (!accent) return null;
  const p = ACCENT_PRESETS.find((x) => x.h === accent.h && x.s === accent.s && x.l === accent.l);
  return p ? p.id : null;
}

/** Привести любые данные к корректным настройкам. */
function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaultSettings();
  const theme = THEMES.includes(raw.theme) ? raw.theme : 'system';
  const a = raw.accent;
  let accent;
  if (a && typeof a === 'object') {
    const preset = ACCENT_PRESETS.find((p) => p.id === a.preset);
    if (preset) {
      accent = presetAccent(preset);
    } else {
      const c = clampAccent(a);
      accent = { preset: findPreset(c), ...c };
    }
  } else {
    accent = presetAccent(ACCENT_PRESETS[0]);
  }
  return { theme, accent };
}

/** Вычисленная тема: 'dark' | 'light'. */
function resolveTheme(theme, prefersDark) {
  if (theme === 'dark' || theme === 'light') return theme;
  return prefersDark ? 'dark' : 'light';
}

/** HSL (h 0–360, s/l 0–100) → sRGB 0–255. */
function hslToRgb({ h, s, l }) {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
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

/** Контраст двух яркостей по WCAG. */
function contrastRatio(l1, l2) {
  const [a, b] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

/** Цвет текста на акценте: '#000' или '#fff' — тот, у которого контраст выше. */
function accentTextColor(accent) {
  const lum = relativeLuminance(hslToRgb(clampAccent(accent)));
  return contrastRatio(lum, 0) >= contrastRatio(lum, 1) ? '#000' : '#fff';
}

// ---------- Ввод (fix-sandbox-input) ----------

/**
 * Нужно ли по этому keydown добавить задачу: Enter без Shift и не во время IME-композиции.
 * keyCode 229 — признак композиции в Chromium (дополнительно к isComposing).
 */
function isEnterSubmit({ key, shiftKey = false, isComposing = false, keyCode } = {}) {
  return key === 'Enter' && !shiftKey && !isComposing && keyCode !== 229;
}
    return Object.freeze({ ACCENT_LIMITS, ACCENT_PRESETS, DEFAULT_SETTINGS, FILTERS, HOURS_STEP, MAX_HOURS, MIN_HOURS, THEMES, accentTextColor, addTask, clampAccent, computeMetrics, contrastRatio, createInitialTasks, defaultMakeId, defaultSettings, filterTasks, findPreset, hslToRgb, isEnterSubmit, isValidTaskList, normalizeSettings, relativeLuminance, removeTask, resolveTheme, toggleTask, validateTaskInput });
  })();
  (function () {
    const { createInitialTasks, addTask, removeTask, toggleTask, computeMetrics, filterTasks, validateTaskInput, isValidTaskList, FILTERS, ACCENT_PRESETS, normalizeSettings, clampAccent, findPreset, resolveTheme, accentTextColor, isEnterSubmit } = domain;
    // --- app.mjs ---
// Интерфейс трекера: состояние, рендер и обработчики. Логика — в domain.mjs.

const STORAGE_KEY = 'study-tracker.tasks.v1';
const SETTINGS_KEY = 'study-tracker.settings.v1';
const HIGHLIGHT_MS = 1000;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const el = {
  form: $('task-form'),
  title: $('task-title'),
  hours: $('task-hours'),
  addButton: $('task-add'),
  titleError: $('task-title-error'),
  hoursError: $('task-hours-error'),
  filter: $('task-filter'),
  list: $('task-list'),
  empty: $('empty-message'),
  total: $('total-hours'),
  done: $('done-hours'),
  progress: $('progress-value'),
  progressBar: $('progress-bar'),
  storageMessage: $('storage-message'),
  settingsToggle: $('settings-toggle'),
  settingsPanel: $('settings-panel'),
  settingsClose: $('settings-close'),
  themeOptions: $('theme-options'),
  accentPresets: $('accent-presets'),
  accentH: $('accent-h'),
  accentS: $('accent-s'),
  accentL: $('accent-l'),
  accentHValue: $('accent-h-value'),
  accentSValue: $('accent-s-value'),
  accentLValue: $('accent-l-value'),
  accentSampleText: $('accent-sample-text'),
};

function showStorageMessage(text) {
  if (!el.storageMessage) return;
  el.storageMessage.textContent = text;
  el.storageMessage.hidden = false;
}

// ---------- Необязательное хранилище (localStorage) ----------
// Общий флаг доступности для задач и настроек; сообщение показывается один раз.
const storage = {
  available: true,
  read(key) {
    if (!this.available) return null;
    try {
      const raw = globalThis.localStorage.getItem(key);
      return raw === null ? null : raw;
    } catch {
      this.fail();
      return null;
    }
  },
  write(key, value) {
    if (!this.available) return;
    try {
      globalThis.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      this.fail();
    }
  },
  fail() {
    if (!this.available) return;
    this.available = false;
    showStorageMessage(
      'Сохранение недоступно: задачи и настройки хранятся только до закрытия страницы. Трекер продолжает работать.',
    );
  },
};

function loadTasks() {
  const raw = storage.read(STORAGE_KEY);
  if (raw === null) return null;
  try {
    const data = JSON.parse(raw);
    if (isValidTaskList(data)) return data;
  } catch {
    /* повреждённый JSON — ниже */
  }
  showStorageMessage('Сохранённые данные повреждены — загружен стартовый пример.');
  return null;
}

function loadSettings() {
  const raw = storage.read(SETTINGS_KEY);
  if (raw === null) return normalizeSettings(null);
  try {
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return normalizeSettings(null);
  }
}

// ---------- Состояние ----------
const state = {
  tasks: loadTasks() ?? createInitialTasks(),
  filter: 'all',
  lastAddedId: null,
  settings: loadSettings(),
  panelOpen: false,
};

function setTasks(next) {
  state.tasks = next;
  storage.write(STORAGE_KEY, state.tasks);
  render();
}

// ---------- Настройки: тема и акцент ----------
const colorScheme =
  typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia('(prefers-color-scheme: dark)') : null;

function applyTheme() {
  const prefersDark = colorScheme ? colorScheme.matches : true;
  document.documentElement.dataset.theme = resolveTheme(state.settings.theme, prefersDark);
}

function applyAccent() {
  const { h, s, l } = state.settings.accent;
  const root = document.documentElement.style;
  root.setProperty('--accent-h', String(h));
  root.setProperty('--accent-s', `${s}%`);
  root.setProperty('--accent-l', `${l}%`);
  root.setProperty('--on-accent', accentTextColor({ h, s, l }));
}

function syncSettingsControls() {
  const { theme, accent } = state.settings;
  for (const input of el.themeOptions.querySelectorAll('input[name="theme"]')) {
    input.checked = input.value === theme;
  }
  for (const input of el.accentPresets.querySelectorAll('input[name="accent-preset"]')) {
    input.checked = input.value === accent.preset;
  }
  el.accentH.value = String(accent.h);
  el.accentS.value = String(accent.s);
  el.accentL.value = String(accent.l);
  el.accentHValue.textContent = String(accent.h);
  el.accentSValue.textContent = `${accent.s}%`;
  el.accentLValue.textContent = `${accent.l}%`;
  el.accentSampleText.textContent = `hsl(${accent.h} ${accent.s}% ${accent.l}%)`;
}

function applySettings() {
  applyTheme();
  applyAccent();
  syncSettingsControls();
}

function saveSettings() {
  storage.write(SETTINGS_KEY, state.settings);
}

function setSettings(patch, { persist = true } = {}) {
  state.settings = normalizeSettings({ ...state.settings, ...patch });
  applySettings();
  if (persist) saveSettings();
}

if (colorScheme) {
  const onSchemeChange = () => {
    if (state.settings.theme === 'system') applyTheme();
  };
  if (typeof colorScheme.addEventListener === 'function') {
    colorScheme.addEventListener('change', onSchemeChange);
  } else if (typeof colorScheme.addListener === 'function') {
    colorScheme.addListener(onSchemeChange);
  }
}

// ---------- Панель настроек ----------
function openPanel() {
  state.panelOpen = true;
  el.settingsPanel.hidden = false;
  el.settingsToggle.setAttribute('aria-expanded', 'true');
  const first = el.settingsPanel.querySelector('input:checked') ?? el.settingsClose;
  first?.focus();
}

function closePanel({ returnFocus = true } = {}) {
  if (!state.panelOpen) return;
  state.panelOpen = false;
  el.settingsPanel.hidden = true;
  el.settingsToggle.setAttribute('aria-expanded', 'false');
  if (returnFocus) el.settingsToggle.focus();
}

el.settingsToggle.addEventListener('click', () => {
  if (state.panelOpen) closePanel();
  else openPanel();
});

el.settingsClose.addEventListener('click', () => closePanel());

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.panelOpen) {
    event.preventDefault();
    closePanel();
  }
});

document.addEventListener('pointerdown', (event) => {
  if (!state.panelOpen) return;
  const t = event.target;
  if (el.settingsPanel.contains(t) || el.settingsToggle.contains(t)) return;
  closePanel({ returnFocus: false });
});

el.themeOptions.addEventListener('change', (event) => {
  if (event.target.name === 'theme') setSettings({ theme: event.target.value });
});

el.accentPresets.addEventListener('change', (event) => {
  if (event.target.name !== 'accent-preset') return;
  const preset = ACCENT_PRESETS.find((p) => p.id === event.target.value);
  if (preset) setSettings({ accent: { preset: preset.id, h: preset.h, s: preset.s, l: preset.l } });
});

function readSliders() {
  const accent = clampAccent({ h: el.accentH.value, s: el.accentS.value, l: el.accentL.value });
  return { preset: findPreset(accent), ...accent };
}

for (const slider of [el.accentH, el.accentS, el.accentL]) {
  // input — мгновенное применение; change — запись в хранилище.
  slider.addEventListener('input', () => setSettings({ accent: readSliders() }, { persist: false }));
  slider.addEventListener('change', () => setSettings({ accent: readSliders() }));
}

// ---------- Рендер задач ----------
const formatHours = (h) => String(h).replace('.', ',');

function renderSummary() {
  // Метрики — всегда по полному списку, независимо от фильтра.
  const m = computeMetrics(state.tasks);
  el.total.textContent = formatHours(m.totalHours);
  el.done.textContent = formatHours(m.doneHours);
  el.progress.textContent = String(m.progress);
  el.progressBar.value = m.progress;
  el.progressBar.textContent = `${m.progress}%`;
}

function renderTask(task) {
  const li = document.createElement('li');
  li.className = task.done ? 'task task--done' : 'task';
  if (task.id === state.lastAddedId) li.className += ' task--new';
  li.dataset.id = task.id;

  const label = document.createElement('label');
  label.className = 'task__toggle';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.dataset.action = 'toggle';
  checkbox.setAttribute('aria-label', `Выполнено: ${task.title}`);

  const text = document.createElement('span');
  text.className = 'task__text';
  const title = document.createElement('span');
  title.className = 'task__title';
  title.textContent = task.title;

  const meta = document.createElement('span');
  meta.className = 'task__meta';
  const hours = document.createElement('span');
  hours.className = 'task__hours';
  hours.textContent = `${formatHours(task.hours)} ч`;
  const status = document.createElement('span');
  status.className = task.done ? 'badge badge--done' : 'badge';
  status.textContent = task.done ? 'Готово' : 'Активно';
  meta.append(hours, status);

  text.append(title, meta);
  label.append(checkbox, text);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn btn--remove';
  remove.dataset.action = 'remove';
  remove.textContent = 'Удалить';
  remove.setAttribute('aria-label', `Удалить «${task.title}»`);

  li.append(label, remove);
  return li;
}

function renderList() {
  const visible = filterTasks(state.tasks, state.filter);
  el.list.replaceChildren(...visible.map(renderTask));

  if (state.tasks.length === 0) {
    el.empty.textContent = 'Задач нет — добавьте первую.';
    el.empty.hidden = false;
  } else if (visible.length === 0) {
    el.empty.textContent = 'Нет задач для этого фильтра.';
    el.empty.hidden = false;
  } else {
    el.empty.hidden = true;
    el.empty.textContent = '';
  }
}

function render() {
  renderSummary();
  renderList();
}

// ---------- Ошибки формы ----------
function setFieldError(input, errorEl, message) {
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  } else {
    errorEl.textContent = '';
    errorEl.hidden = true;
    input.removeAttribute('aria-invalid');
  }
}

// ---------- Подсветка новой задачи ----------
let highlightTimer = null;
function highlightNew(id) {
  state.lastAddedId = id;
  if (highlightTimer) clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => {
    highlightTimer = null;
    state.lastAddedId = null;
    const row = el.list.querySelector('.task--new');
    if (row) row.classList.remove('task--new');
  }, HIGHLIGHT_MS);
}

// ---------- Обработчики задач ----------
// Добавление не зависит от отправки формы (iframe sandbox без allow-forms блокирует submit):
// кнопка — click, Enter в полях — keydown; оба пути и запасной submit вызывают addFromForm().
function addFromForm() {
  const result = validateTaskInput({ title: el.title.value, hours: el.hours.value });

  if (!result.ok) {
    // Значения полей не трогаем — они сохраняются.
    setFieldError(el.title, el.titleError, result.errors.title);
    setFieldError(el.hours, el.hoursError, result.errors.hours);
    (result.errors.title ? el.title : el.hours).focus();
    return;
  }

  setFieldError(el.title, el.titleError, null);
  setFieldError(el.hours, el.hoursError, null);
  const next = addTask(state.tasks, result.value);
  highlightNew(next[next.length - 1].id);
  setTasks(next);
  el.form.reset();
  el.title.focus();
}

el.addButton.addEventListener('click', () => addFromForm());

for (const field of [el.title, el.hours]) {
  field.addEventListener('keydown', (event) => {
    if (!isEnterSubmit(event)) return;
    event.preventDefault();
    addFromForm();
  });
}

// Запасной путь: если форма всё же отправляется, отменяем отправку и добавляем тем же способом.
el.form.addEventListener('submit', (event) => {
  event.preventDefault();
  addFromForm();
});

el.list.addEventListener('change', (event) => {
  const target = event.target;
  if (target.dataset.action !== 'toggle') return;
  const id = target.closest('.task')?.dataset.id;
  if (id) setTasks(toggleTask(state.tasks, id));
});

el.list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="remove"]');
  if (!button) return;
  const id = button.closest('.task')?.dataset.id;
  if (id) setTasks(removeTask(state.tasks, id));
});

el.filter.addEventListener('change', (event) => {
  if (event.target.name !== 'filter') return;
  state.filter = FILTERS.includes(event.target.value) ? event.target.value : 'all';
  renderList(); // фильтр влияет только на видимый список
});

applySettings();
render();
  })();
})();
