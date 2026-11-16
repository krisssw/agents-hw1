// Повторная проверка после дефекта 01: три режима открытия × обе версии.
const { chromium } = require('playwright');
const fs = require('fs');
const ROOT = '/home/user/workspace/agents-hw1';
const V = {
  direct: { port: 8080, title: '#title', hours: '#hours', progress: '#progress' },
  'with-spec': { port: 8081, title: '#task-title', hours: '#task-hours', progress: '#progress-value' },
};
const out = [];
(async () => {
  const b = await chromium.launch();
  for (const [v, c] of Object.entries(V)) {
    const modes = {
      'http': async p => { await p.goto(`http://127.0.0.1:${c.port}/`); return p.mainFrame(); },
      'file://': async p => { await p.goto(`file://${ROOT}/${v}/index.html`); return p.mainFrame(); },
      'iframe sandbox="allow-scripts"': async p => { await p.setContent(`<iframe sandbox="allow-scripts" src="http://127.0.0.1:${c.port}/" style="width:1260px;height:880px;border:0"></iframe>`); await p.waitForTimeout(800); return p.frames()[1]; },
      'iframe sandbox="allow-scripts allow-same-origin"': async p => { await p.setContent(`<iframe sandbox="allow-scripts allow-same-origin" src="http://127.0.0.1:${c.port}/" style="width:1260px;height:880px;border:0"></iframe>`); await p.waitForTimeout(800); return p.frames()[1]; },
    };
    for (const [mode, open] of Object.entries(modes)) {
      const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
      const errs = []; p.on('console', m => m.type() === 'error' && !/favicon|404/.test(m.text()) && errs.push(m.text().slice(0, 120))); p.on('pageerror', e => errs.push(e.message));
      const f = await open(p); await p.waitForTimeout(700);
      const cnt = () => f.locator('#task-list li').count();
      const prog = async () => (await f.locator(c.progress).textContent()).trim().replace('%', '');
      const r = {};
      r.T1 = `${await cnt()} задач, ${await prog()}%`;
      await f.fill(c.title, 'Enter-задача'); await f.fill(c.hours, '2'); await f.press(c.hours, 'Enter'); await p.waitForTimeout(150);
      r.enter = await cnt();
      await f.fill(c.title, 'Кнопка-задача'); await f.fill(c.hours, '2'); await f.click('#task-form button:has-text("Добавить")'); await p.waitForTimeout(150);
      r.button = await cnt();
      await f.fill(c.title, ''); await f.fill(c.hours, '-1'); await f.press(c.hours, 'Enter'); await p.waitForTimeout(100);
      r.invalid = await cnt();
      // удалить добавленные, вернуть исходные 3
      for (const t of ['Enter-задача', 'Кнопка-задача']) { const li = f.locator('#task-list li', { hasText: t }); if (await li.count()) await li.locator('button', { hasText: 'Удалить' }).click(); }
      await f.locator('#task-list li', { hasText: 'Практика' }).locator('label').first().click(); r.T2 = await prog();
      await f.locator('#task-list li', { hasText: 'Практика' }).locator('label').first().click();
      await f.locator('label', { has: f.locator('input[name=filter][value=active]') }).click(); r.T3 = `${await cnt()} в списке, ${await prog()}%`;
      await f.locator('label', { has: f.locator('input[name=filter][value=all]') }).click();
      await f.click('button[aria-label="Настройки"]'); await p.waitForTimeout(200); r.gear = await f.locator('#settings-panel').isVisible();
      await f.locator('#settings-panel label', { has: f.locator('input[name=theme][value=dark]') }).click(); await p.waitForTimeout(300);
      const bg0 = await f.evaluate(() => document.documentElement.dataset.theme + '|' + getComputedStyle(document.body).backgroundColor);
      await f.locator('#settings-panel label', { has: f.locator('input[name=theme][value=light]') }).click(); await p.waitForTimeout(300);
      const bg1 = await f.evaluate(() => document.documentElement.dataset.theme + '|' + getComputedStyle(document.body).backgroundColor); r.theme = bg0 !== bg1 || 'тот же';
      await p.keyboard.press('Escape');
      while (await cnt()) await f.locator('#task-list li').first().locator('button', { hasText: 'Удалить' }).click();
      r.T5 = `${await cnt()} задач, ${await prog()}%`;
      const ok = r.T1 === '3 задач, 25%' && r.enter === 4 && r.button === 5 && r.invalid === 5 && r.T2 === '75' && r.T3 === '2 в списке, 25%' && r.gear === true && r.theme === true && r.T5 === '0 задач, 0%' && errs.length === 0;
      const line = `${v.padEnd(9)} ${mode.padEnd(46)} ${ok ? 'PASS' : 'FAIL'}  T1 ${r.T1}; Enter→${r.enter}; кнопка→${r.button}; неверный ввод→${r.invalid}; T2 ${r.T2}%; T3 ${r.T3}; шестерёнка ${r.gear}; тема меняется ${r.theme}; T5 ${r.T5}; ошибки консоли: ${errs.join(' | ') || 'нет'}`;
      console.log(line); out.push({ v, mode, ok, ...r, errs });
      await p.close();
    }
  }
  await b.close();
  fs.writeFileSync(`${ROOT}/logs/browser-retest-bugfix01.json`, JSON.stringify(out, null, 2));
})();
