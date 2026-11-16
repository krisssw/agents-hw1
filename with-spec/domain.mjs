// Предметная логика трекера: чистые функции без DOM и глобального состояния.
// Задача: { id: string, title: string, hours: number, done: boolean }

export const MIN_HOURS = 0.5;
export const MAX_HOURS = 24;
export const HOURS_STEP = 0.5;
export const FILTERS = ['all', 'active', 'done'];

/** Стартовый пример (новая копия при каждом вызове). */
export function createInitialTasks() {
  return [
    { id: 't1', title: 'Чтение', hours: 2, done: true },
    { id: 't2', title: 'Практика', hours: 4, done: false },
    { id: 't3', title: 'Повторение', hours: 2, done: false },
  ];
}

let idCounter = 0;
/** Генератор id по умолчанию. */
export function defaultMakeId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  idCounter += 1;
  return `id-${Date.now().toString(36)}-${idCounter}`;
}

/** Добавить задачу (вход уже провалидирован). Новая задача — done=false. */
export function addTask(tasks, { title, hours }, makeId = defaultMakeId) {
  return [...tasks, { id: String(makeId()), title, hours, done: false }];
}

/** Удалить задачу по id. Неизвестный id — данные без изменений. */
export function removeTask(tasks, id) {
  return tasks.filter((t) => t.id !== id);
}

/** Инвертировать done у задачи с данным id. */
export function toggleTask(tasks, id) {
  return tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

/** Метрики по ВСЕМ переданным задачам. Без NaN/Infinity. */
export function computeMetrics(tasks) {
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
export function filterTasks(tasks, filter) {
  if (filter === 'active') return tasks.filter((t) => !t.done);
  if (filter === 'done') return tasks.filter((t) => t.done);
  return tasks.slice();
}

/**
 * Валидация сырых значений формы.
 * → { ok: true, value: { title, hours } } | { ok: false, errors: { title?, hours? } }
 */
export function validateTaskInput({ title, hours } = {}) {
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
export function isValidTaskList(data) {
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

export const THEMES = ['dark', 'light', 'system'];

export const ACCENT_PRESETS = [
  { id: 'lilac', name: 'Сиреневый', h: 320, s: 35, l: 68 },
  { id: 'blue', name: 'Синий', h: 217, s: 85, l: 62 },
  { id: 'emerald', name: 'Изумрудный', h: 158, s: 60, l: 48 },
  { id: 'amber', name: 'Янтарный', h: 38, s: 92, l: 56 },
  { id: 'coral', name: 'Коралловый', h: 8, s: 80, l: 64 },
];

export const ACCENT_LIMITS = {
  h: { min: 0, max: 360 },
  s: { min: 0, max: 100 },
  l: { min: 20, max: 80 },
};

const presetAccent = (p) => ({ preset: p.id, h: p.h, s: p.s, l: p.l });

/** Настройки по умолчанию (новая копия при каждом вызове). */
export function defaultSettings() {
  return { theme: 'system', accent: presetAccent(ACCENT_PRESETS[0]) };
}
export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system',
  accent: Object.freeze(presetAccent(ACCENT_PRESETS[0])),
});

const clampNumber = (value, { min, max }, fallback) => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/** Ограничить h/s/l диапазонами; нечисловое значение → значение по умолчанию. */
export function clampAccent(accent = {}) {
  const def = ACCENT_PRESETS[0];
  const a = accent && typeof accent === 'object' ? accent : {};
  return {
    h: clampNumber(a.h, ACCENT_LIMITS.h, def.h),
    s: clampNumber(a.s, ACCENT_LIMITS.s, def.s),
    l: clampNumber(a.l, ACCENT_LIMITS.l, def.l),
  };
}

/** id пресета, если h/s/l совпадают с пресетом, иначе null. */
export function findPreset(accent) {
  if (!accent) return null;
  const p = ACCENT_PRESETS.find((x) => x.h === accent.h && x.s === accent.s && x.l === accent.l);
  return p ? p.id : null;
}

/** Привести любые данные к корректным настройкам. */
export function normalizeSettings(raw) {
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
export function resolveTheme(theme, prefersDark) {
  if (theme === 'dark' || theme === 'light') return theme;
  return prefersDark ? 'dark' : 'light';
}

/** HSL (h 0–360, s/l 0–100) → sRGB 0–255. */
export function hslToRgb({ h, s, l }) {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
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

/** Контраст двух яркостей по WCAG. */
export function contrastRatio(l1, l2) {
  const [a, b] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

/** Цвет текста на акценте: '#000' или '#fff' — тот, у которого контраст выше. */
export function accentTextColor(accent) {
  const lum = relativeLuminance(hslToRgb(clampAccent(accent)));
  return contrastRatio(lum, 0) >= contrastRatio(lum, 1) ? '#000' : '#fff';
}
