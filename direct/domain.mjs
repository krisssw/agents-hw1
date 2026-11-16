// Чистые расчёты и валидация мини-трекера. Без DOM и без побочных эффектов.

export const HOURS_MIN = 0.5;
export const HOURS_MAX = 24;
export const HOURS_STEP = 0.5;

export const FILTERS = Object.freeze(['all', 'active', 'done']);

export function createSampleTasks() {
  return [
    { id: 't1', title: 'Чтение', hours: 2, done: true },
    { id: 't2', title: 'Практика', hours: 4, done: false },
    { id: 't3', title: 'Повторение', hours: 2, done: false },
  ];
}

/** Валидирует название. Возвращает { ok, value?, error? }. */
export function validateTitle(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value === '') return { ok: false, error: 'Введите название задачи (не только пробелы).' };
  return { ok: true, value };
}

/** Валидирует часы. Пустая строка — ошибка, а не ноль. Допускается запятая как разделитель. */
export function validateHours(raw) {
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
export function validateTaskInput({ title, hours }) {
  const t = validateTitle(title);
  const h = validateHours(hours);
  const errors = {};
  if (!t.ok) errors.title = t.error;
  if (!h.ok) errors.hours = h.error;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title: t.value, hours: h.value } };
}

let counter = 0;
export function makeId() {
  counter += 1;
  return `t${Date.now().toString(36)}${counter}`;
}

/** Возвращает новый массив с добавленной задачей или ошибки (массив не меняется). */
export function addTask(tasks, input, idFactory = makeId) {
  const res = validateTaskInput(input);
  if (!res.ok) return { ok: false, errors: res.errors, tasks };
  const task = { id: idFactory(), title: res.value.title, hours: res.value.hours, done: false };
  return { ok: true, tasks: [...tasks, task], task };
}

export function removeTask(tasks, id) {
  return tasks.filter((t) => t.id !== id);
}

export function toggleTask(tasks, id) {
  return tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

export function filterTasks(tasks, filter) {
  if (filter === 'active') return tasks.filter((t) => !t.done);
  if (filter === 'done') return tasks.filter((t) => t.done);
  return tasks.slice();
}

/** Метрики всегда по всем задачам, независимо от фильтра. */
export function computeStats(tasks) {
  const totalHours = tasks.reduce((s, t) => s + t.hours, 0);
  const doneHours = tasks.filter((t) => t.done).reduce((s, t) => s + t.hours, 0);
  const progress = totalHours > 0 ? Math.round((100 * doneHours) / totalHours) : 0;
  return { count: tasks.length, totalHours, doneHours, progress };
}

export function formatHours(h) {
  return String(h).replace('.', ',');
}

/** Проверка структуры данных из хранилища. */
export function isValidTaskList(data) {
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

export const THEMES = Object.freeze(['dark', 'light', 'system']);
export const THEME_LABELS = Object.freeze({ dark: 'Тёмная', light: 'Светлая', system: 'Системная' });

export const ACCENT_LIMITS = Object.freeze({
  h: { min: 0, max: 360 },
  s: { min: 0, max: 100 },
  l: { min: 20, max: 80 },
});

export const PRESET_ACCENTS = Object.freeze([
  Object.freeze({ id: 'lilac', name: 'Сиреневый', h: 320, s: 35, l: 68 }),
  Object.freeze({ id: 'blue', name: 'Синий', h: 217, s: 85, l: 62 }),
  Object.freeze({ id: 'emerald', name: 'Изумрудный', h: 158, s: 60, l: 48 }),
  Object.freeze({ id: 'amber', name: 'Янтарный', h: 38, s: 92, l: 56 }),
  Object.freeze({ id: 'coral', name: 'Коралловый', h: 8, s: 80, l: 64 }),
]);

export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system',
  accent: Object.freeze({ h: 320, s: 35, l: 68 }),
});

function clampNumber(value, min, max, fallback) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Ограничивает компоненты HSL допустимыми диапазонами; мусор → значение по умолчанию. */
export function normalizeAccent(raw) {
  const d = DEFAULT_SETTINGS.accent;
  const a = raw && typeof raw === 'object' ? raw : {};
  return {
    h: clampNumber(a.h, ACCENT_LIMITS.h.min, ACCENT_LIMITS.h.max, d.h),
    s: clampNumber(a.s, ACCENT_LIMITS.s.min, ACCENT_LIMITS.s.max, d.s),
    l: clampNumber(a.l, ACCENT_LIMITS.l.min, ACCENT_LIMITS.l.max, d.l),
  };
}

/** Нормализует настройки: неизвестная тема → «system», акцент ограничивается диапазонами. */
export function normalizeSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const theme = THEMES.includes(r.theme) ? r.theme : 'system';
  return { theme, accent: normalizeAccent(r.accent) };
}

/** Итоговая тема с учётом системной настройки. */
export function resolveTheme(theme, prefersDark) {
  if (theme === 'dark' || theme === 'light') return theme;
  return prefersDark ? 'dark' : 'light';
}

/** Пресет, совпадающий с акцентом, или null (свой цвет). */
export function findPreset(accent) {
  const a = normalizeAccent(accent);
  return PRESET_ACCENTS.find((p) => p.h === a.h && p.s === a.s && p.l === a.l) || null;
}

export function hslToCss({ h, s, l }) {
  return `hsl(${h} ${s}% ${l}%)`;
}

/** HSL (h 0–360, s,l 0–100) → RGB 0–255. */
export function hslToRgb({ h, s, l }) {
  const S = s / 100;
  const L = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

/** Относительная яркость по WCAG 2.x. */
export function relativeLuminance([r, g, b]) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(l1, l2) {
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

/** Цвет текста на акценте: чёрный или белый — тот, у которого контраст выше. */
export function accentTextColor(accent) {
  const lum = relativeLuminance(hslToRgb(normalizeAccent(accent)));
  return contrastRatio(lum, 0) >= contrastRatio(lum, 1) ? '#000000' : '#ffffff';
}
