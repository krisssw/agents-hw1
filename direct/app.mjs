import {
  createSampleTasks, addTask, removeTask, toggleTask, filterTasks,
  computeStats, formatHours, isValidTaskList,
  DEFAULT_SETTINGS, PRESET_ACCENTS, normalizeSettings, normalizeAccent,
  resolveTheme, findPreset, hslToCss, accentTextColor,
} from './domain.mjs';

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
