// Интерфейс трекера: состояние, рендер и обработчики. Логика — в domain.mjs.
import {
  createInitialTasks,
  addTask,
  removeTask,
  toggleTask,
  computeMetrics,
  filterTasks,
  validateTaskInput,
  isValidTaskList,
  FILTERS,
  ACCENT_PRESETS,
  normalizeSettings,
  clampAccent,
  findPreset,
  resolveTheme,
  accentTextColor,
} from './domain.mjs';

const STORAGE_KEY = 'study-tracker.tasks.v1';
const SETTINGS_KEY = 'study-tracker.settings.v1';
const HIGHLIGHT_MS = 1000;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const el = {
  form: $('task-form'),
  title: $('task-title'),
  hours: $('task-hours'),
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
// Enter в «Названии» или «Часах» вызывает неявную отправку формы (кнопка type=submit),
// поэтому кнопка и Enter проходят через один и тот же обработчик и одну валидацию.
el.form.addEventListener('submit', (event) => {
  event.preventDefault();
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
