const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();for(const [v,u,t,h] of [['direct','http://127.0.0.1:8080/','#title','#hours'],['with-spec','http://127.0.0.1:8081/','#task-title','#task-hours']]){
const p=await b.newPage({reducedMotion:'reduce'});await p.goto(u);await p.waitForSelector('#task-list li');await p.fill(t,'А');await p.fill(h,'1');await p.press(h,'Enter');
const r=await p.locator('#task-list li',{hasText:/^\s*А/}).first().evaluate(e=>{const s=getComputedStyle(e);return s.animationName+' '+s.animationDuration+' / transition '+s.transitionDuration});
const two=await (async()=>{const p2=await b.newPage({viewport:{width:1000,height:800}});await p2.goto(u);await p2.waitForSelector('#task-list li');const a=await p2.locator('#task-form').boundingBox();const l=await p2.locator('#task-list').boundingBox();await p2.close();return l.x>a.x+a.width;})();
console.log(`${v} reduced-motion: новая строка — анимация ${r}; две колонки при 1000 px: ${two}`);}await b.close();})();
