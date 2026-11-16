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
