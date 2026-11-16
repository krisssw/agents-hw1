// Проверка доработки D1–D3 (дизайн, настройки, Enter) для обеих версий.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/home/user/workspace/agents-hw1/screenshots/redesign';
fs.mkdirSync(OUT, { recursive: true });
const V = {
  direct: { url: 'http://127.0.0.1:8080/', title: '#title', hours: '#hours', panel: '#settings-panel', h: '#acc-h', s: '#acc-s', l: '#acc-l' },
  'with-spec': { url: 'http://127.0.0.1:8081/', title: '#task-title', hours: '#task-hours', panel: '#settings-panel', h: '#accent-h', s: '#accent-s', l: '#accent-l' },
};
const res = [];
const rec = (v, id, name, ok, fact) => { res.push({ v, id, name, ok, fact }); console.log(`${v.padEnd(9)} ${id.padEnd(4)} ${ok ? 'PASS' : 'FAIL'}  ${name}: ${fact}`); };
const lum = c => { const m = c.match(/[\d.]+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };

(async () => {
  const b = await chromium.launch();
  for (const [v, c] of Object.entries(V)) {
    const open = async (opts = {}) => { const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, ...opts }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(c.url); await p.waitForSelector('#task-list li'); return { ctx, p, errs }; };
    const gear = p => p.locator('button[aria-label="Настройки"]');
    const panelVisible = p => p.locator(c.panel).isVisible();
    const addBg = p => p.locator('#task-form [type=submit]').evaluate(el => { const s = getComputedStyle(el); return s.backgroundImage + '|' + s.backgroundColor + '|' + s.color; });
    const bodyBg = p => p.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Тёмная системная тема, первый вид
    let { ctx, p, errs } = await open({ colorScheme: 'dark' });
    await p.screenshot({ path: `${OUT}/${v}-dark-desktop.png`, fullPage: true });
    const darkL = lum(await bodyBg(p));
    // D3: Enter в поле часов
    await p.fill(c.title, 'Конспект'); await p.fill(c.hours, '2'); await p.press(c.hours, 'Enter');
    await p.waitForTimeout(150);
    const n = await p.locator('#task-list li').count();
    const focusTitle = await p.evaluate(sel => document.activeElement === document.querySelector(sel), c.title);
    const newHi = await p.locator('#task-list li', { hasText: 'Конспект' }).evaluate(el => el.className);
    await p.screenshot({ path: `${OUT}/${v}-after-add.png` });
    rec(v, 'D3', 'Enter в поле «Часы» добавляет задачу', n === 4 && focusTitle, `задач ${n}, фокус в «Название»: ${focusTitle}, класс новой строки: «${newHi}»`);
    // Enter с ошибкой
    await p.fill(c.title, 'Ошибка'); await p.fill(c.hours, '-3'); await p.press(c.hours, 'Enter');
    rec(v, 'D3b', 'Enter с неверными часами', (await p.locator('#task-list li').count()) === 4, `задач ${await p.locator('#task-list li').count()} (не добавлено)`);
    // Клик по флажку через видимый элемент (без force)
    let clickOk = true; try { await p.locator('#task-list li', { hasText: 'Практика' }).locator('label').first().click({ timeout: 2000 }); } catch { clickOk = false; }
    const prog = (await p.locator('#progress, #progress-value').first().textContent()).trim();
    rec(v, 'CB', 'флажок кликается мышью', clickOk && /60/.test(prog), `клик ${clickOk ? 'ок' : 'не прошёл'}, прогресс ${prog} (ожидалось 60% = 6/10 ч)`);

    // D2: панель настроек
    await gear(p).click();
    const opened = await panelVisible(p);
    await p.screenshot({ path: `${OUT}/${v}-settings-open.png` });
    await p.keyboard.press('Escape'); const escClosed = !(await panelVisible(p));
    await gear(p).click(); await p.mouse.click(30, 840); const outClosed = !(await panelVisible(p));
    await gear(p).click(); await p.locator(`${c.panel} button`, { hasText: /Закрыть/ }).first().click().catch(async () => p.click('#settings-close')); const btnClosed = !(await panelVisible(p));
    rec(v, 'P', 'панель: открытие и 3 способа закрыть', opened && escClosed && outClosed && btnClosed, `открылась ${opened}, Esc ${escClosed}, клик вне ${outClosed}, «Закрыть» ${btnClosed}`);

    // Темы
    await gear(p).click();
    const pickTheme = t => p.locator(`${c.panel} label`, { has: p.locator(`input[name=theme][value=${t}]`) }).click();
    await pickTheme('light'); await p.waitForTimeout(400); const lightL = lum(await bodyBg(p));
    await p.screenshot({ path: `${OUT}/${v}-light-settings.png` });
    await pickTheme('dark'); await p.waitForTimeout(400); const darkExplicit = lum(await bodyBg(p));
    rec(v, 'TH', 'светлая / тёмная тема', lightL > 0.8 && darkExplicit < 0.2 && darkL < 0.2, `яркость фона: системная(тёмная ОС) ${darkL.toFixed(2)}, светлая ${lightL.toFixed(2)}, тёмная ${darkExplicit.toFixed(2)}`);
    await pickTheme('system'); await p.emulateMedia({ colorScheme: 'light' }); await p.waitForTimeout(400);
    const sysLight = lum(await bodyBg(p));
    rec(v, 'SYS', 'системная тема следует за ОС', sysLight > 0.8, `после смены ОС на светлую фон ${sysLight.toFixed(2)}`);
    await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(300);

    // Пресеты
    const names = ['Сиреневый', 'Синий', 'Изумрудный', 'Янтарный', 'Коралловый'];
    const seen = new Set(); let found = 0;
    for (const nm of names) {
      const sw = p.locator(`.swatch[aria-label="${nm}"], .swatch:has([aria-label="${nm}"])`).first();
      if (await sw.count()) { found++; await sw.click(); await p.waitForTimeout(80); seen.add(await addBg(p)); }
    }
    const amber = p.locator(`.swatch[aria-label="Янтарный"], .swatch:has([aria-label="Янтарный"])`).first(); await amber.click(); await p.waitForTimeout(80);
    const amberText = (await addBg(p)).split('|')[2];
    rec(v, 'PR', '5 готовых цветов', found === 5 && seen.size === 5, `найдено ${found}, разных стилей кнопки ${seen.size}; текст на янтарной кнопке ${amberText}`);

    // Свои цвета ползунками
    const setRange = async (sel, val) => p.locator(sel).evaluate((el, x) => { el.value = String(x); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, val);
    const before = await addBg(p);
    await setRange(c.h, 270); await setRange(c.s, 70); await setRange(c.l, 40); await p.waitForTimeout(150);
    const after = await addBg(p);
    const sliderLabels = await p.evaluate(sels => sels.map(s => { const el = document.querySelector(s); return el.labels?.[0]?.textContent.trim() || el.getAttribute('aria-label'); }), [c.h, c.s, c.l]);
    const noColorInput = (await p.locator('input[type=color]').count()) === 0;
    await p.screenshot({ path: `${OUT}/${v}-custom-color.png` });
    rec(v, 'CU', 'свой цвет ползунками', before !== after && noColorInput, `стиль кнопки изменился: ${before !== after}; подписи: ${sliderLabels.join(' / ')}; input type=color нет: ${noColorInput}`);

    // Сохранение настроек после перезагрузки
    await pickTheme('light'); await p.waitForTimeout(200);
    const saved = await addBg(p);
    await p.reload(); await p.waitForSelector('#task-list li'); await p.waitForTimeout(300);
    const restored = await addBg(p); const lightAfter = lum(await bodyBg(p));
    rec(v, 'SV', 'настройки после перезагрузки', restored === saved && lightAfter > 0.8, `цвет совпал: ${restored === saved}; светлая тема сохранилась: ${lightAfter > 0.8}`);
    await p.screenshot({ path: `${OUT}/${v}-light-desktop.png`, fullPage: true });
    if (errs.length) rec(v, 'JS', 'ошибки JS', false, errs.join(' | '));
    await ctx.close();

    // 390 px с открытой панелью
    ({ ctx, p } = await open({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }));
    await p.screenshot({ path: `${OUT}/${v}-390-dark.png`, fullPage: true });
    await gear(p).click(); await p.waitForTimeout(200);
    const box = await p.locator(c.panel).boundingBox();
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    await p.screenshot({ path: `${OUT}/${v}-390-settings.png` });
    rec(v, 'M', '390 px, панель в пределах экрана', sw[0] <= sw[1] && box && box.x >= 0 && box.x + box.width <= 391, `scrollWidth ${sw[0]}/${sw[1]}, панель x=${Math.round(box?.x)}..${Math.round(box?.x + box?.width)}`);
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync('/home/user/workspace/agents-hw1/logs/browser-settings.json', JSON.stringify(res, null, 2));
})();
