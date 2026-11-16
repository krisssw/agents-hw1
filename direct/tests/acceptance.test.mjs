import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSampleTasks, addTask, removeTask, toggleTask, filterTasks,
  computeStats, validateHours, validateTitle,
} from '../domain.mjs';

const idOf = (tasks, title) => tasks.find((t) => t.title === title).id;

test('T1 · Исходный пример: 3 задачи, 8 ч, 2 ч, 25% по часам', () => {
  const tasks = createSampleTasks();
  const s = computeStats(tasks);
  assert.equal(tasks.length, 3);
  assert.equal(s.totalHours, 8);
  assert.equal(s.doneHours, 2);
  assert.equal(s.progress, 25);
  assert.notEqual(s.progress, Math.round(100 / 3)); // не 33% по числу задач
});

test('T2 · Статус: «Практика» готова → 6 из 8 ч, 75%', () => {
  const tasks = createSampleTasks();
  const next = toggleTask(tasks, idOf(tasks, 'Практика'));
  assert.equal(next.find((t) => t.title === 'Практика').done, true);
  const s = computeStats(next);
  assert.equal(s.doneHours, 6);
  assert.equal(s.totalHours, 8);
  assert.equal(s.progress, 75);
  // исходные данные не мутированы, повторное переключение возвращает 25%
  assert.equal(computeStats(tasks).progress, 25);
  assert.equal(computeStats(toggleTask(next, idOf(next, 'Практика'))).progress, 25);
});

test('T3 · Фильтр «активные» меняет только список, прогресс 25%', () => {
  const tasks = createSampleTasks();
  const visible = filterTasks(tasks, 'active');
  assert.deepEqual(visible.map((t) => t.title), ['Практика', 'Повторение']);
  assert.equal(computeStats(tasks).progress, 25);
  assert.equal(computeStats(tasks).totalHours, 8);
  assert.equal(tasks.length, 3);
  assert.deepEqual(filterTasks(tasks, 'done').map((t) => t.title), ['Чтение']);
  assert.equal(filterTasks(tasks, 'all').length, 3);
});

test('T4 · Ошибки ввода: некорректная задача не добавляется', () => {
  const tasks = createSampleTasks();
  const bad = [
    { title: '', hours: '2' },
    { title: '   ', hours: '2' },
    { title: 'Задача', hours: '' },
    { title: 'Задача', hours: '   ' },
    { title: 'Задача', hours: '-1' },
    { title: 'Задача', hours: '0' },
    { title: 'Задача', hours: '0.4' },
    { title: 'Задача', hours: '24.5' },
    { title: 'Задача', hours: '1.3' },
    { title: 'Задача', hours: 'abc' },
  ];
  for (const input of bad) {
    const res = addTask(tasks, input);
    assert.equal(res.ok, false, JSON.stringify(input));
    assert.ok(Object.values(res.errors).every((m) => typeof m === 'string' && m.length > 0));
    assert.equal(res.tasks.length, 3);
    assert.equal(computeStats(res.tasks).totalHours, 8);
  }
  // ошибка привязана к нужному полю
  assert.ok(addTask(tasks, { title: ' ', hours: '2' }).errors.title);
  assert.ok(addTask(tasks, { title: 'X', hours: '' }).errors.hours);
  // пустое значение не равно нулю
  assert.equal(validateHours('').ok, false);
  assert.notEqual(validateHours('').value, 0);
  // границы и шаг
  for (const ok of ['0.5', '0,5', '1', '1.5', '23.5', '24']) assert.equal(validateHours(ok).ok, true, ok);
  assert.equal(validateHours('0,5').value, 0.5);
  // корректный ввод добавляется, название обрезается
  const good = addTask(tasks, { title: '  Конспект  ', hours: '1,5' }, () => 'x1');
  assert.equal(good.ok, true);
  assert.equal(good.tasks.length, 4);
  assert.deepEqual(good.task, { id: 'x1', title: 'Конспект', hours: 1.5, done: false });
  assert.equal(validateTitle('  a ').value, 'a');
});

test('T5 · Пустое состояние: 0 ч и 0%, без NaN/Infinity', () => {
  let tasks = createSampleTasks();
  for (const t of createSampleTasks()) tasks = removeTask(tasks, t.id);
  assert.equal(tasks.length, 0);
  const s = computeStats(tasks);
  assert.equal(s.totalHours, 0);
  assert.equal(s.doneHours, 0);
  assert.equal(s.progress, 0);
  assert.ok(Number.isFinite(s.progress));
  assert.equal(filterTasks(tasks, 'active').length, 0);
  // после очистки работа продолжается
  const res = addTask(tasks, { title: 'Новая', hours: '2' });
  assert.equal(res.ok, true);
  assert.equal(computeStats(res.tasks).progress, 0);
  assert.equal(computeStats(toggleTask(res.tasks, res.task.id)).progress, 100);
});
