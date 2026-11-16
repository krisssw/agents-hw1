// Браузерная проверка T1–T5 + узкий экран + localStorage для обеих версий.
// Запуск: node check.js  (Chromium headless, Playwright 1.59)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/home/user/workspace/agents-hw1/screenshots/redesign';
fs.mkdirSync(OUT, { recursive: true });

const V = {
  direct: { url: 'http://127.0.0.1:8080/', title: '#title', hours: '#hours', titleErr: '#title-error', hoursErr: '#hours-error',
    progress: '#progress', setFilter: async (p, v) => p.locator('label', { has: p.locator(`input[name=filter][value=${v}]`) }).click() },
  'with-spec': { url: 'http://127.0.0.1:8081/', title: '#task-title', hours: '#task-hours', titleErr: '#task-title-error', hoursErr: '#task-hours-error',
    progress: '#progress-value', setFilter: async (p, v) => p.locator('label', { has: p.locator(`input[name=filter][value=${v}]`) }).click() },
};

const results = [];
function rec(ver, id, name, ok, fact) { results.push({ ver, id, name, ok, fact }); console.log(`${ver.padEnd(9)} ${id.padEnd(5)} ${ok ? 'PASS' : 'FAIL'}  ${name}: ${fact}`); }

async function state(p, c) {
  return {
    n: await p.locator('#task-list li').count(),
    items: (await p.locator('#task-list li').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()),
    total: (await p.textContent('#total-hours')).trim(),
    done: (await p.textContent('#done-hours')).trim(),
    progress: (await p.textContent(c.progress)).trim().replace('%', ''),
    body: await p.innerText('body'),
  };
}
async function errText(p, sel) { const l = p.locator(sel); return (await l.isVisible()) ? (await l.innerText()).trim() : ''; }

(async () => {
  const browser = await chromium.launch();
  for (const [ver, c] of Object.entries(V)) {
    const fresh = async (w = 1000) => { const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text())); await p.goto(c.url); await p.waitForSelector('#task-list li'); return { ctx, p, errs }; };
    const submit = async (p, t, h) => { await p.fill(c.title, t); await p.fill(c.hours, h); await p.click('#task-form [type=submit]'); };

    // T1
    let { ctx, p, errs } = await fresh();
    let s = await state(p, c);
    rec(ver, 'T1', 'исходный пример', s.n === 3 && s.total === '8' && s.done === '2' && s.progress === '25', `задач ${s.n}, всего ${s.total} ч, выполнено ${s.done} ч, прогресс ${s.progress}%`);
    await p.screenshot({ path: `${OUT}/${ver}-T1-desktop.png`, fullPage: true });
    // T2
    await p.locator('#task-list li', { hasText: 'Практика' }).locator('input[type=checkbox]').check({ force: true });
    s = await state(p, c);
    const cb = await p.locator('#task-list li', { hasText: 'Практика' }).locator('input[type=checkbox]').isChecked();
    rec(ver, 'T2', '«Практика» готова', s.done === '6' && s.total === '8' && s.progress === '75' && cb, `выполнено ${s.done} из ${s.total} ч, прогресс ${s.progress}%, флажок=${cb}`);
    // localStorage после перезагрузки (доп.)
    await p.reload(); await p.waitForSelector('#task-list li'); s = await state(p, c);
    rec(ver, 'LS', 'сохранение после перезагрузки (доп.)', s.progress === '75', `после reload прогресс ${s.progress}%`);
    if (errs.length) rec(ver, 'JS', 'ошибки консоли', false, errs.join(' | '));
    await ctx.close();

    // T3
    ({ ctx, p } = await fresh());
    await c.setFilter(p, 'active');
    s = await state(p, c);
    const t3names = s.items.map(i => i.match(/Чтение|Практика|Повторение/)?.[0]).join(', ');
    rec(ver, 'T3', 'фильтр «активные»', s.n === 2 && /Практика/.test(t3names) && /Повторение/.test(t3names) && s.progress === '25' && s.total === '8', `видно: ${t3names}; всего ${s.total} ч, прогресс ${s.progress}%`);
    await p.screenshot({ path: `${OUT}/${ver}-T3-filter-active.png`, fullPage: true });
    await ctx.close();

    // T4
    ({ ctx, p } = await fresh());
    const bad = [['', '2', 'пустое название'], ['   ', '2', 'пробелы'], ['Тест', '', 'пустые часы'], ['Тест', '-1', 'отрицательные'], ['Тест', '0', 'ноль'], ['Тест', '0.4', 'ниже 0,5'], ['Тест', '24.5', 'выше 24'], ['Тест', '0.7', 'шаг 0,7'], ['Тест', 'abc', 'не число']];
    const t4 = []; let t4ok = true;
    for (const [t, h, name] of bad) {
      const before = await p.locator('#task-list li').count();
      await submit(p, t, h);
      const after = await p.locator('#task-list li').count();
      const e = (await errText(p, c.titleErr)) || (await errText(p, c.hoursErr));
      const kept = (await p.inputValue(c.title)) === t && (await p.inputValue(c.hours)) === h;
      const ok = after === before && e.length > 0 && kept; t4ok &&= ok;
      t4.push(`${name}: ${ok ? 'ок' : 'ОШИБКА'} («${e}»${kept ? '' : ', значения сброшены'})`);
      if (name === 'отрицательные') await p.screenshot({ path: `${OUT}/${ver}-T4-error.png`, fullPage: true });
    }
    for (const [t, h, name] of [['Граница мин', '0,5', '0,5 с запятой'], ['Граница макс', '24', '24'], ['Шаг', '1.5', '1.5']]) {
      const before = await p.locator('#task-list li').count();
      await submit(p, t, h);
      const after = await p.locator('#task-list li').count();
      const ok = after === before + 1; t4ok &&= ok; t4.push(`${name}: ${ok ? 'добавлено' : 'НЕ добавлено'}`);
    }
    rec(ver, 'T4', 'ошибки ввода и границы', t4ok, t4.join('; '));
    await ctx.close();

    // T5
    ({ ctx, p } = await fresh());
    while (await p.locator('#task-list li').count()) await p.locator('#task-list li').first().locator('button', { hasText: 'Удалить' }).click();
    s = await state(p, c);
    const nan = /NaN|Infinity/.test(s.body);
    await p.screenshot({ path: `${OUT}/${ver}-T5-empty.png`, fullPage: true });
    await submit(p, 'Новая', '2'); const s2 = await state(p, c);
    rec(ver, 'T5', 'пустое состояние', s.total === '0' && s.progress === '0' && !nan && s2.n === 1, `всего ${s.total} ч, прогресс ${s.progress}%, NaN/Infinity: ${nan ? 'есть' : 'нет'}; после добавления задач ${s2.n}, прогресс ${s2.progress}%`);
    await ctx.close();

    // Узкий экран 390 px
    ({ ctx, p } = await fresh(390));
    const sw = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    await submit(p, '', ''); // показать ошибки на узком экране
    const sw2 = await p.evaluate(() => document.documentElement.scrollWidth);
    const unlabeled = await p.evaluate(() => [...document.querySelectorAll('input,select,button')].filter(el => !(el.labels?.length || el.getAttribute('aria-label') || (el.tagName === 'BUTTON' && el.textContent.trim()))).length);
    await p.screenshot({ path: `${OUT}/${ver}-390px.png`, fullPage: true });
    rec(ver, 'W390', 'ширина 390 px, подписи', sw.sw <= sw.cw && sw2 <= sw.cw && unlabeled === 0, `scrollWidth ${sw.sw}/${sw2} при ширине ${sw.cw}; элементов без подписи: ${unlabeled}`);
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync('/home/user/workspace/agents-hw1/logs/browser-checks-redesign.json', JSON.stringify(results, null, 2));
})();
