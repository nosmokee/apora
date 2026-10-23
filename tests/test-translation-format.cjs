'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.OPORA_CHROMIUM||'/usr/local/bin/chromium',args:['--no-sandbox']});
 const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.evaluate(()=>setView('translate'));
 let checks=0;const equal=(a,b,m)=>{assert.deepEqual(a,b,m);checks++},ok=(a,m)=>{assert.ok(a,m);checks++};
 const data=await p.evaluate(()=>{
  const {formatTranslationText:f,translationPlan:plan,translationChunks:chunks}=OporaV07;
  const sample='The first sentence is complete. '.repeat(18)+'Another sentence.\n\nSecond paragraph.\nThird line.';
  const items=plan(sample);
  return {formatted:f('  Привет ,мир !Как дела ?\n\nЭто  пример .Следующее предложение.  '),safe:f('Цена 3,14. Время 12:30. Версия 1.0.0.\nhttps://example.com/a,b?q=1.2 test@example.com example.ru Dr.Smith\n\uE0000\uE001'),noInvented:f('если завтра будет дождь мы останемся дома'),rejoined:items.map(x=>x.text??x.separator).join(''),sample,bounded:items.filter(x=>x.text).every(x=>new TextEncoder().encode(x.text).length<=450),whole:chunks('A short sentence. '+ 'B'.repeat(440)),emoji:chunks('😀'.repeat(300)),native:plan('First.\n\nSecond.',true)};
 });
 equal(data.formatted,'Привет, мир! Как дела?\n\nЭто пример. Следующее предложение.','conservative punctuation spaces and paragraphs');
 equal(data.safe,'Цена 3,14. Время 12:30. Версия 1.0.0.\nhttps://example.com/a,b?q=1.2 test@example.com example.ru Dr.Smith\n\uE0000\uE001','URLs, decimals, times, versions, abbreviations and private Unicode unchanged');
 equal(data.noInvented,'если завтра будет дождь мы останемся дома','no guessed semantic commas or full stops');
 equal(data.rejoined,data.sample,'paragraph plan lossless');ok(data.bounded,'UTF8 API bound');equal(data.whole[0],'A short sentence. ','complete sentence preferred');equal(data.emoji.join(''),'😀'.repeat(300),'Unicode lossless');ok(data.emoji.every(s=>Buffer.byteLength(s)<=450),'Unicode bound');equal(data.native,[{text:'First.'},{separator:'\n\n'},{text:'Second.'}],'native paragraph plan');
 const requests=[];await p.route('https://**/*',r=>{requests.push(r.request().url());r.abort()});
 ok(await p.locator('#translation-submit').isDisabled(),'web translation unavailable');equal(await p.locator('#translation-mode option[value=online]').count(),0,'online mode removed');
 const out=process.env.OPORA_QA_OUTPUT||'/data/translation-qa';fs.mkdirSync(out,{recursive:true});await p.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,0)});await p.screenshot({path:path.join(out,'translator-mobile.png'),fullPage:true});
 await p.locator('#translation-source').fill('Hello ,world !');await p.locator('#translation-format-source').click();equal(await p.locator('#translation-source').inputValue(),'Hello, world!','explicit source formatting');equal(requests.length,0,'no network');equal(await p.locator('#translation-output').textContent(),'','format source clears stale result');
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(()=>{window.calls=[];window.OporaFiles={offlineTranslation(id,action,text,from){calls.push({action,text,from});setTimeout(()=>oporaTranslationResult(id,action==='status'?{ready:true}:{translatedText:from==='en'?(text==='First.'?'Первый .':'Второй !'):(text==='Первый.'?'First .':'Second !')}),0);}};});
 const n=await context.newPage();n.on('pageerror',e=>errors.push(e.message));await n.goto('file://'+path.resolve(__dirname,'../index.html'));await n.evaluate(()=>setView('translate'));await context.setOffline(true);
 await n.locator('#translation-source').fill('First.\n\nSecond!');await n.locator('#translation-submit').click();await n.waitForFunction(()=>document.querySelector('#translation-copy').hidden===false);equal(await n.locator('#translation-output').textContent(),'Первый.\n\nВторой!','offline bridge preserves paragraphs');
 await n.locator('#translation-swap').click();await n.locator('#translation-submit').click();await n.waitForFunction(()=>document.querySelector('#translation-copy').hidden===false);equal(await n.locator('#translation-output').textContent(),'First.\n\nSecond!','offline reverse preserves paragraphs');ok(await n.locator('#translation-attribution').isVisible(),'MLKit attribution retained');
 await n.evaluate(()=>applyTheme('dark'));await n.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,0)});await n.screenshot({path:path.join(out,'translator-native-dark.png'),fullPage:true});
 equal(errors,[],'no runtime errors');fs.writeFileSync(path.join(out,'translation-results.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
