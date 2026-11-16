const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [ver, url, prog, dir] of [['direct','http://127.0.0.1:8080/','#progress','direct'],['with-spec','http://127.0.0.1:8081/','#progress-value','with-spec']]) {
    const ctx = await b.newContext(); 
    await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }); });
    const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    const n = await p.locator('#task-list li').count();
    const notice = (await p.locator('[role=status]').first().innerText().catch(()=> '')).trim();
    await p.locator('#task-list li', { hasText: 'Практика' }).locator('input[type=checkbox]').check();
    console.log(`${ver} LS-off: задач ${n}, сообщение: «${notice}», после отметки прогресс ${(await p.textContent(prog)).trim()}, ошибки JS: ${errs.length ? errs.join('|') : 'нет'}`);
    await ctx.close();
    const c2 = await b.newContext(); const p2 = await c2.newPage();
    await p2.goto('file:///home/user/workspace/agents-hw1/' + dir + '/index.html'); await p2.waitForTimeout(800);
    console.log(`${ver} file://: задач в списке ${await p2.locator('#task-list li').count()} (ES-модули через file:// в Chromium блокируются CORS)`);
    await c2.close();
  }
  await b.close();
})();
