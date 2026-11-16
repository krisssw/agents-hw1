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
