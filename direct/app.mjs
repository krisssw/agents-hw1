import {
  createSampleTasks, addTask, removeTask, toggleTask, filterTasks,
  computeStats, formatHours, isValidTaskList,
} from './domain.mjs';

const STORAGE_KEY = 'mini-tracker-tasks-v1';
const $ = (id) => document.getElementById(id);

const state = { tasks: createSampleTasks(), filter: 'all', storageOk: true };

function showStorageMsg(text) {
  const el = $('storage-msg');
  el.textContent = text;
  el.hidden = false;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return;
    const data = JSON.parse(raw);
    if (isValidTaskList(data)) state.tasks = data;
  } catch {
    state.storageOk = false;
    showStorageMsg('Хранилище браузера недоступно: задачи работают в памяти и не сохранятся после перезагрузки.');
  }
}

function save() {
  if (!state.storageOk) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  } catch {
    state.storageOk = false;
    showStorageMsg('Не удалось сохранить задачи: работа продолжается в памяти.');
  }
}

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

    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = t.done;
    cb.addEventListener('change', () => update(toggleTask(state.tasks, t.id)));
    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = t.title;
    const hours = document.createElement('span');
    hours.className = 'task-hours';
    hours.textContent = `${formatHours(t.hours)} ч`;
    label.append(cb, title, hours);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'secondary';
    del.textContent = 'Удалить';
    del.setAttribute('aria-label', `Удалить задачу «${t.title}»`);
    del.addEventListener('click', () => update(removeTask(state.tasks, t.id)));

    li.append(label, del);
    list.append(li);
  }
  $('empty').hidden = visible.length > 0;
  $('empty').textContent = state.tasks.length === 0 ? 'Задач нет. Добавьте первую.' : 'Нет задач для выбранного фильтра.';
}

function update(tasks) {
  state.tasks = tasks;
  save();
  render();
}

function setError(field, msg) {
  $(`${field}-error`).textContent = msg || '';
  $(field).setAttribute('aria-invalid', msg ? 'true' : 'false');
}

$('task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = { title: $('title').value, hours: $('hours').value };
  const res = addTask(state.tasks, input);
  setError('title', res.ok ? '' : res.errors.title);
  setError('hours', res.ok ? '' : res.errors.hours);
  if (!res.ok) return; // значения формы не сбрасываются
  e.target.reset();
  update(res.tasks);
  $('title').focus();
});

for (const r of document.querySelectorAll('input[name="filter"]')) {
  r.addEventListener('change', () => { state.filter = r.value; render(); });
}

load();
render();
