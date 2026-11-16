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
