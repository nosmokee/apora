'use strict';
const{chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.OPORA_CHROMIUM||'/usr/local/bin/chromium',args:['--no-sandbox']}),p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.waitForSelector('#subject-search');
 let checks=0;const ok=(x,m)=>{assert.ok(x,m);checks++};
 async function inspect(scope,label){const report=await p.evaluate(scope=>{
  const root=document.querySelector(scope),buttons=[...root.querySelectorAll('button,input:not([type="checkbox"]):not([type="radio"]),select,textarea')].filter(e=>e.getClientRects().length&&!e.closest('.card,.calc-keypad,.periodic-grid,.element-grid'));
  const issues=[];
  for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){
   const a=buttons[i].getBoundingClientRect(),b=buttons[j].getBoundingClientRect(),dx=Math.max(a.left-b.right,b.left-a.right),dy=Math.max(a.top-b.bottom,b.top-a.bottom);
   if((dx<7.5&&dy<-2)||(dy<7.5&&dx<-2))issues.push({a:buttons[i].id||buttons[i].textContent.trim().slice(0,24),b:buttons[j].id||buttons[j].textContent.trim().slice(0,24),dx,dy});
  }
  const textIssues=[];
  const texts=[...root.querySelectorAll('p,h2,h3,label,summary')].filter(t=>t.textContent.trim()&&t.checkVisibility()&&t.getClientRects().length&&!t.closest('button,.card,.calc-keypad,.periodic-grid,.element-grid'));
  for(const button of buttons.filter(e=>e.tagName==='BUTTON'))for(const text of texts){
   if(text.contains(button)||button.contains(text))continue;
   const a=button.getBoundingClientRect(),b=text.getBoundingClientRect();
   const dx=Math.max(a.left-b.right,b.left-a.right),dy=Math.max(a.top-b.bottom,b.top-a.bottom);
   if(dx<-4&&dy<7.5)textIssues.push({button:button.id||button.textContent.trim().slice(0,25),text:text.textContent.trim().slice(0,35),dy});
  }
  return{issues,textIssues,overflow:document.documentElement.scrollWidth>innerWidth+1};
 },scope);ok(report.issues.length===0,label+' touching controls '+JSON.stringify(report.issues));ok(!report.overflow,label+' page overflow');ok(report.textIssues.length===0,label+' text/action spacing '+JSON.stringify(report.textIssues));}
 const views=['subjects','reading','essays','geography','periodic','translate','subject-practice','calculator','solver','practice','favorites','homework','offline-exams','about','schedule','personalization','reader','textbooks'];
 for(const width of [320,360,390,768,1024,1366]){
  await p.setViewportSize({width,height:900});
  for(const theme of ['light','dark']){
   await p.evaluate(t=>applyTheme(t),theme);
   for(const v of views){await p.evaluate(v=>setView(v),v);await inspect('#view',`${width}/${theme}/${v}`);if([320,390,1366].includes(width)&&['offline-exams','about','schedule','personalization','reader','textbooks'].includes(v)){await p.evaluate(()=>document.querySelectorAll('#view details').forEach(d=>d.open=true));await inspect('#view',`${width}/${theme}/${v}/expanded`);}}
   for(const id of ['work-war','essay10-science-limits','bio10-dihybrid']){await p.evaluate(id=>openCard(id),id);await inspect('#dialog-body',`${width}/${theme}/${id}`);if([320,390,1366].includes(width)){await p.evaluate(()=>document.querySelectorAll('#dialog-body details').forEach(d=>d.open=true));await inspect('#dialog-body',`${width}/${theme}/${id}/expanded`);}await p.locator('#close-dialog').click();}
  }
 }
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{applyTheme('light');setView('offline-exams');document.getElementById('offline-input').scrollIntoView({block:'start'});});
 const out=process.env.OPORA_QA_OUTPUT||'/data';fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,'button-spacing-mobile.png')});
 const gaps=await p.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();return{sample:r('#exam-paste').top-r('#exam-template').bottom,submit:r('#exam-input-form button').top-r('#exam-condition').bottom,panels:r('#offline-input').top-document.querySelector('#offline-input').previousElementSibling.getBoundingClientRect().bottom};});
 ok(gaps.sample>=16&&gaps.submit>=16&&gaps.panels>=24,'explicit 16px form spacing');
 await p.evaluate(()=>{setView('homework');document.getElementById('hw-title').value='Проверка отступов';document.getElementById('hw-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));setView('offline-exams');});ok(await p.evaluate(()=>OporaHomework.getNotes().some(n=>n.title==='Проверка отступов')),'notes preserved');
 ok(await p.locator('.nav [data-view]').last().getAttribute('data-view')==='homework','desktop DZ last');ok(await p.locator('.footer-nav [data-view]').last().getAttribute('data-view')==='homework','phone DZ last');ok(errors.length===0,'no runtime errors '+errors.join(';'));
 fs.writeFileSync(path.join(out,'button-spacing-results.json'),JSON.stringify({checks,gaps,errors},null,2));console.log(JSON.stringify({checks,gaps,errors}));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
