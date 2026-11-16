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
} from './domain.mjs';

const STORAGE_KEY = 'study-tracker.tasks.v1';

// ---------- Необязательное хранилище (localStorage) ----------
const storage = {
  available: true,
  load() {
    try {
      const raw = globalThis.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      const data = JSON.parse(raw);
      if (!isValidTaskList(data)) {
        showStorageMessage('Сохранённые данные повреждены — загружен стартовый пример.');
        return null;
      }
      return data;
    } catch {
      this.fail();
      return null;
    }
  },
  save(tasks) {
    if (!this.available) return;
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      this.fail();
    }
  },
  fail() {
    this.available = false;
    showStorageMessage(
      'Сохранение недоступно: задачи хранятся только до закрытия страницы. Трекер продолжает работать.',
    );
  },
};

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
};

function showStorageMessage(text) {
  if (!el.storageMessage) return;
  el.storageMessage.textContent = text;
  el.storageMessage.hidden = false;
}

// ---------- Состояние ----------
const state = {
  tasks: storage.load() ?? createInitialTasks(),
  filter: 'all',
};

function setTasks(next) {
  state.tasks = next;
  storage.save(state.tasks);
  render();
}

// ---------- Рендер ----------
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
  const hours = document.createElement('span');
  hours.className = 'task__hours';
  hours.textContent = ` · ${formatHours(task.hours)} ч`;
  const status = document.createElement('span');
  status.className = 'task__status';
  status.textContent = task.done ? 'Готово' : 'Активно';
  text.append(title, hours, status);

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

// ---------- Обработчики ----------
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
  setTasks(addTask(state.tasks, result.value));
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

el.filter.addEventListener('change', () => {
  state.filter = FILTERS.includes(el.filter.value) ? el.filter.value : 'all';
  renderList(); // фильтр влияет только на видимый список
});

render();
