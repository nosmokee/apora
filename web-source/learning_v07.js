// v0.7: explicit online translation, worked-topic practice and bounded storage.
const v07SetView=setView;
let translationRun=0,translationAbort=null;
setView=function(v){
 if(translationAbort){translationAbort.abort();translationAbort=null;}translationRun++;
 if(!['translate','subject-practice'].includes(v))return v07SetView(v);
 activeView=v;document.body.dataset.screen=v;
 $$('[data-view]').forEach(b=>{const on=b.dataset.view===v;b.classList.toggle('active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 $('#page-title').textContent=v==='translate'?'Переводчик':'Задачи по предметам';
 $('#page-intro').textContent=v==='translate'?'Английский → русский':'Числовые модели с объяснением. Работают без интернета.';
 if(v==='translate')renderTranslator();else renderSubjectPractice();window.scrollTo(0,0);
};
function translationChunks(text,maxBytes=450){
 const out=[];let chunk='';const enc=new TextEncoder();
 // Prefer word boundaries; split a single oversized token by Unicode code point.
 for(const word of (String(text).match(/\s+|\S+\s*/gu)||[])){
  if(enc.encode(chunk+word).length<=maxBytes){chunk+=word;continue;}
  if(chunk){out.push(chunk);chunk='';}
  for(const ch of word){if(enc.encode(chunk+ch).length>maxBytes){out.push(chunk);chunk='';}chunk+=ch;}
 }
 if(chunk)out.push(chunk);return out;
}
const nativeTranslations=new Map();let nativeSequence=0;
window.oporaTranslationResult=function(id,payload){const request=nativeTranslations.get(id);if(!request)return;nativeTranslations.delete(id);clearTimeout(request.timer);payload.error?request.reject(Error(payload.error)):request.resolve(payload);};
function nativeTranslate(text,signal){return new Promise((resolve,reject)=>{
 const id=String(++nativeSequence),timer=setTimeout(()=>{nativeTranslations.delete(id);reject(Error('Сервис не ответил вовремя.'));},20000);
 const fail=()=>{clearTimeout(timer);nativeTranslations.delete(id);reject(new DOMException('Отменено','AbortError'));};
 if(signal.aborted){fail();return;}signal.addEventListener('abort',fail,{once:true});
 nativeTranslations.set(id,{timer,resolve:p=>{signal.removeEventListener('abort',fail);resolve(p);},reject:e=>{signal.removeEventListener('abort',fail);reject(e);}});
 try{window.OporaFiles.translateEnglish(id,text);}catch(e){clearTimeout(timer);nativeTranslations.delete(id);signal.removeEventListener('abort',fail);reject(e);}
 });}
function decodeTranslation(raw){
 if(Number(raw.responseStatus)!==200||raw.quotaFinished)throw Error(raw.quotaFinished||Number(raw.responseStatus)===429?'Лимит сервиса исчерпан. Попробуй позже.':'Сервис не смог перевести текст. Попробуй позже.');
 const value=raw.responseData?.translatedText;if(typeof value!=='string'||!value.trim())throw Error('Сервис вернул пустой ответ.');
 // Decode provider HTML entities once; output is always assigned through textContent.
 const d=new DOMParser().parseFromString(value,'text/html');return d.body.textContent||value;
}
async function requestTranslation(chunk,signal){
 if(window.OporaFiles&&typeof window.OporaFiles.translateEnglish==='function')return decodeTranslation(await nativeTranslate(chunk,signal));
 const r=await fetch('https://api.mymemory.translated.net/get?langpair=en%7Cru&q='+encodeURIComponent(chunk),{signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
 if(!r.ok)throw Error(r.status===429?'Лимит сервиса исчерпан. Попробуй позже.':'Ошибка сервиса: '+r.status);return decodeTranslation(await r.json());
}
function renderTranslator(){
 $('#view').innerHTML=`<section class="panel translator-panel"><p>Перевод выполняет MyMemory через интернет. Текст отправляется стороннему сервису только после нажатия кнопки. Не вводи пароли, персональные или секретные данные.</p><form id="translation-form"><label for="translation-source">Текст на английском</label><textarea id="translation-source" rows="7" maxlength="1500" placeholder="Вставь английский текст…" required></textarea><p class="fine">До 1500 символов за раз. У сервиса есть суточные ограничения; большие фрагменты делятся на части, поэтому проверь связность перевода.</p><div class="actions"><button class="primary" id="translation-submit" type="submit">Перевести на русский</button><button id="translation-clear" type="button">Очистить</button></div></form><p id="translation-status" role="status" aria-live="polite"></p><h2>Перевод</h2><div id="translation-output" class="translation-output" tabindex="0" aria-label="Перевод на русский"></div><button id="translation-copy" type="button" hidden>Копировать перевод</button><p class="fine">Перевод и исходный текст не сохраняются в истории приложения. Сервис может обрабатывать запросы по своим правилам. Машинный перевод может ошибаться.</p><p><a href="https://mymemory.translated.net/doc/spec.php" target="_blank" rel="noopener">Описание сервиса ↗</a> · <a href="https://mymemory.translated.net/doc/usagelimits.php" target="_blank" rel="noopener">Лимиты ↗</a></p></section>`;
 const source=$('#translation-source'),status=$('#translation-status'),output=$('#translation-output'),button=$('#translation-submit'),copy=$('#translation-copy');
 const cancel=()=>{translationRun++;translationAbort?.abort();translationAbort=null;button.disabled=false;};
 source.oninput=()=>{cancel();output.textContent='';status.textContent='';copy.hidden=true;};
 $('#translation-clear').onclick=()=>{cancel();source.value='';output.textContent='';status.textContent='';copy.hidden=true;source.focus();};
 $('#translation-form').onsubmit=async e=>{
  e.preventDefault();const text=source.value.trim();if(!text){status.textContent='Вставь текст на английском.';return;}
  if(text.length>1500){status.textContent='Сократи текст до 1500 символов.';return;}
  cancel();const run=translationRun;translationAbort=new AbortController();const controller=translationAbort;
  const timeout=setTimeout(()=>controller.abort(),60000);button.disabled=true;output.textContent='';copy.hidden=true;const chunks=translationChunks(text);let result=[];
  try{for(let i=0;i<chunks.length;i++){if(run!==translationRun)return;status.textContent=`Перевод: часть ${i+1} из ${chunks.length}…`;result.push(await requestTranslation(chunks[i],controller.signal));}
   if(run!==translationRun)return;output.textContent=result.join(' ');status.textContent='Готово. Проверь имена, термины и смысл.';copy.hidden=false;
  }catch(err){if(run!==translationRun)return;status.textContent=err.name==='AbortError'?'Время ожидания истекло. Проверь интернет и попробуй снова.':err.message||'Перевод недоступен. Проверь интернет.';output.textContent='';}
  finally{clearTimeout(timeout);if(run===translationRun){button.disabled=false;translationAbort=null;}}
 };
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(output.textContent);status.textContent='Перевод скопирован.';}catch(e){status.textContent='Выдели перевод и скопируй через меню устройства.';}};
}
const subjectModels={
 scale:{name:'География · Масштаб',fields:[['cm','Расстояние на карте, см','3.5'],['scale','Знаменатель масштаба 1:…','200000']],solve:v=>{const cm=v('cm'),s=v('scale');if(cm<0||s<=0)throw Error('Расстояние ≥ 0; масштаб > 0.');return{answer:approx(cm*s/100000)+' км',steps:[`1 см на карте = ${approx(s/100000)} км.`,`Умножаем ${cm} × ${s}, получаем сантиметры на местности.`,`Переводим в километры: делим на 100 000.`]};}},
 population:{name:'География · Естественный прирост',fields:[['birth','Родилось за год, человек','2400'],['death','Умерло за год, человек','1800'],['population','Среднее население, человек','200000']],solve:v=>{const b=v('birth'),d=v('death'),n=v('population');if(![b,d,n].every(Number.isInteger)||b<0||d<0||n<=0)throw Error('Нужны целые неотрицательные числа; население > 0.');return{answer:approx((b-d)/n*1000)+' ‰',steps:[`Естественный прирост: ${b} − ${d} = ${b-d} человек.`,`Коэффициент: (${b} − ${d}) / ${n} × 1000.`,`Миграционный прирост в этой модели не учитывается.`]};}},
 timezone:{name:'География · Часовые пояса',fields:[['hour','Час в исходном поясе (0–23)','15'],['from','Исходное смещение UTC, ч','3'],['to','Целевое смещение UTC, ч','8']],solve:v=>{const h=v('hour'),a=v('from'),b=v('to');if(!Number.isInteger(h)||h<0||h>23||a< -12||a>14||b< -12||b>14||!Number.isInteger(a*4)||!Number.isInteger(b*4))throw Error('Час 0–23; UTC от −12 до +14 с шагом 0,25 часа.');const minutes=Math.round((h+b-a)*60),day=Math.floor(minutes/1440),t=((minutes%1440)+1440)%1440;return{answer:Math.floor(t/60)+':'+String(t%60).padStart(2,'0')+(day<0?' (предыдущий день)':day>0?' (следующий день)':' (тот же день)'),steps:[`Разница смещений: ${b} − (${a}) = ${b-a} ч.`,`Исходные минуты считаем равными 00. Сезонный перевод автоматически не определяется.`,`Смещения бери из условия или актуального источника.`]};}},
 inflation:{name:'Обществознание · Реальная доходность',fields:[['sum','Начальная сумма, ₽','10000'],['rate','Доходность за период, %','8'],['inflation','Инфляция за тот же период, %','10']],solve:v=>{const s=v('sum'),r=v('rate'),i=v('inflation');if(s<=0||r< -100||i<= -100)throw Error('Сумма > 0; доходность ≥ −100%; инфляция > −100%.');const nominal=s*(1+r/100),real=nominal/(1+i/100);return{answer:approx(((1+r/100)/(1+i/100)-1)*100)+' % реальной доходности',steps:[`Номинальная сумма: ${s} × (1 + ${r}/100) = ${approx(nominal)} ₽.`,`В ценах начала периода: ${approx(nominal)} / (1 + ${i}/100) = ${approx(real)} ₽.`,`Реальная доходность: ((1+r)/(1+i) − 1) × 100%, где r и i — доли. Налоги и комиссии не учтены.`]};}},
 image:{name:'Информатика · Объём растрового изображения',fields:[['w','Ширина, пиксели','800'],['h','Высота, пиксели','600'],['bits','Глубина цвета, бит/пиксель','24']],solve:v=>{const w=v('w'),h=v('h'),b=v('bits');if(![w,h,b].every(x=>Number.isInteger(x)&&x>0)||w>100000||h>100000||b>128)throw Error('Размеры: целые 1–100000, глубина: 1–128 бит.');const bits=w*h*b,bytes=Math.ceil(bits/8);return{answer:bytes+' байт',steps:[`${w} × ${h} = ${w*h} пикселей.`,`${w*h} × ${b} = ${bits} бит.`,`Округляем вверх до целого байта: ${bytes} байт = ${approx(bytes/1048576)} МиБ. Без сжатия, заголовка и выравнивания строк.`]};}},
 base:{name:'Информатика · Системы счисления',fields:[['number','Целое неотрицательное число','101101'],['from','Из системы (2–36)','2'],['to','В систему (2–36)','10']],text:true,solve:v=>{const n=String(v('number')).trim().toUpperCase(),a=Number(v('from')),b=Number(v('to'));if(!Number.isInteger(a)||!Number.isInteger(b)||a<2||a>36||b<2||b>36||!/^[0-9A-Z]{1,128}$/.test(n))throw Error('Основания — целые 2–36; число — до 128 цифр 0–9, A–Z.');let value=0n;const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';for(const ch of n){const digit=alphabet.indexOf(ch);if(digit>=a)throw Error('Цифра '+ch+' недопустима в системе '+a+'.');value=value*BigInt(a)+BigInt(digit);}return{answer:value.toString(b).toUpperCase()+' (основание '+b+')',steps:[`Разбираем ${n} как сумму цифр, умноженных на степени основания ${a}.`,`Десятичное значение: ${value}.`,`Последовательно делим целое на ${b}, записываем остатки в обратном порядке. Используется точная целая арифметика BigInt.`]};}}
};
function renderSubjectPractice(){
 $('#view').innerHTML=`<section class="panel"><label for="subject-model">Тип задания</label><select id="subject-model">${Object.entries(subjectModels).map(([k,m])=>`<option value="${k}">${m.name}</option>`).join('')}</select><div id="subject-model-form"></div><p id="subject-model-error" role="alert"></p><div id="subject-model-result" aria-live="polite"></div></section>`;
 const select=$('#subject-model');const draw=()=>{const m=subjectModels[select.value];$('#subject-model-form').innerHTML=`<form id="subject-calc-form"><div class="coefficient-grid">${m.fields.map(([k,l,d])=>`<div class="field"><label for="subject-value-${k}">${l}</label><input id="subject-value-${k}" value="${d}" maxlength="128" required></div>`).join('')}</div><button type="submit" class="primary">Решить по шагам</button></form>`;$('#subject-model-result').textContent='';$('#subject-model-error').textContent='';$('#subject-calc-form').onsubmit=e=>{e.preventDefault();$('#subject-model-result').textContent='';try{const result=m.solve(k=>{const text=$('#subject-value-'+k).value.trim();if(m.text)return text;if(!text||!/^[-+]?\d+(?:[.,]\d+)?$/.test(text))throw Error('Введи число в каждом поле.');const x=Number(text.replace(',','.'));if(!Number.isFinite(x)||Math.abs(x)>1e12)throw Error('Число вне диапазона ±10¹².');return x;});if(/NaN|Infinity/.test(result.answer))throw Error('Результат вне диапазона.');$('#subject-model-error').textContent='';showResult('#subject-model-result',result);}catch(e){$('#subject-model-error').textContent=e.message;}};$('#subject-calc-form').oninput=()=>{$('#subject-model-result').textContent='';$('#subject-model-error').textContent='';};};select.onchange=draw;draw();
}
const v07OpenCard=openCard;
openCard=function(id){v07OpenCard(id);const c=DB.cards.find(x=>x.id===id);if(!c||!$('#knowledge-dialog').open)return;
 if(c.subject==='Литература'||c.solved?.length){$('#jump-task')?.remove();$('#topic-workbench')?.remove();}
 if(c.qa?.length){const block=document.createElement('section');block.className='teacher-questions';block.innerHTML='<h3>Вопросы для подготовки к паре</h3><p class="fine">Тренировочная подборка, не список вопросов конкретного преподавателя. Сначала попробуй ответить сам.</p>'+c.qa.map(({q,a})=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');$('.dialog-foot').before(block);}
 if(c.solved?.length){const block=document.createElement('section');block.className='teacher-questions';block.innerHTML='<h3>Потренируйся</h3>'+c.solved.map(({q,a,steps})=>`<p>${esc(q)}</p><details><summary>Показать решение</summary><p><strong>${esc(a)}</strong></p><ol>${steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></details>`).join('');if(c.subject==='Английский язык')block.innerHTML+='<button data-view="translate" type="button" class="close-and-go">Перевести свой текст →</button>';else block.innerHTML+='<button data-view="subject-practice" type="button" class="close-and-go">Решить свой числовой пример →</button>';block.querySelector('.close-and-go').onclick=()=>$('#knowledge-dialog').close();$('.dialog-foot').before(block);}
};
const v07RenderAbout=renderAbout;
renderAbout=function(){v07RenderAbout();$('#view').insertAdjacentHTML('afterbegin',`<section class="panel"><h2>Обновление 0.8.1</h2><p>${DB.cards.length} материалов · ${DB.cards.filter(c=>c.kind==='essay').length} тем сочинений · 10 расширенных пересказов · ${DB.cards.reduce((n,c)=>n+(c.qa?.length||0),0)} вопросов с ответами. Онлайн-перевод EN → RU и 6 офлайн-моделей по предметам. ДЗ: локальные заметки, сроки, напоминания и экспорт в календарь.</p></section><section class="panel"><h2>Память и кеш</h2><p>Учебная база встроена в приложение. Размер установленного приложения, оперативная память, данные и кеш — разные показатели. После первой загрузки кеш растёт, но постоянный неограниченный рост требует проверки.</p><p id="cache-estimate" class="fine">Оценка хранилища недоступна.</p><button id="cache-clean" type="button">Очистить лишний кеш</button><p id="cache-clean-status" role="status"></p><p class="fine">Android APK: очищается HTTP-кеш WebView. Веб/PWA: удаляются только старые кеши «Опоры»; текущая офлайн-копия сохраняется. Избранное и тема не удаляются. Кнопка не может очистить весь системный кеш Android или память других приложений.</p></section>`);
 const label=$('#cache-estimate');if(navigator.storage?.estimate)navigator.storage.estimate().then(s=>{if(label.isConnected)label.textContent=`Данные этого сайта: около ${((s.usage||0)/1048576).toFixed(1)} МиБ. Оценка браузера, не точный размер кеша.`;}).catch(()=>{});
 $('#cache-clean').onclick=async()=>{const out=$('#cache-clean-status');try{if(window.OporaFiles?.clearHttpCache){window.OporaFiles.clearHttpCache();out.textContent='Запрошена очистка HTTP-кеша Android. Избранное сохранено.';}else if(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'){let n=0;for(const key of await caches.keys())if(/^opora-/.test(key)&&key!=='opora-0.8.1'){await caches.delete(key);n++;}out.textContent=n?`Удалено старых кешей: ${n}. Офлайн-копия сохранена.`:'Старых кешей нет. Текущая офлайн-копия сохранена.';}else out.textContent='Для локального HTML отдельного офлайн-кеша нет. Настройки и избранное не изменены.';}catch(e){out.textContent='Очистка недоступна в этом окружении. Избранное не изменено.';}};
};
window.OporaV07={translationChunks,decodeTranslation,subjectModels};
const v07Subjects=renderSubjects;
renderSubjects=function(){v07Subjects();$('.subject-search').insertAdjacentHTML('afterend','<div class="actions quick-learning"><button type="button" data-view="translate">Aa · Перевод EN → RU</button><button type="button" data-view="subject-practice">Задачи по предметам →</button></div>');};
const v07Library=renderLibrary;
renderLibrary=function(){v07Library();if(activeView==='subject'&&chosenSubject==='Английский язык')$('.subject-actions')?.insertAdjacentHTML('beforeend','<button type="button" data-view="translate">Перевод EN → RU</button>');};
