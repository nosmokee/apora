// v0.7: explicit online translation, worked-topic practice and bounded storage.
const v07SetView=setView;
let translationRun=0,translationAbort=null;
setView=function(v){
 if(translationAbort){translationAbort.abort();translationAbort=null;}translationRun++;
 if(!['translate','subject-practice'].includes(v))return v07SetView(v);
 activeView=v;document.body.dataset.screen=v;
 $$('[data-view]').forEach(b=>{const on=b.dataset.view===v;b.classList.toggle('active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 $('#page-title').textContent=v==='translate'?'Переводчик':'Задачи по предметам';
 $('#page-intro').textContent=v==='translate'?'Английский ↔ русский':'Числовые модели с объяснением. Работают без интернета.';
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
function nativeRequest(invoke,signal,ms=60000){return new Promise((resolve,reject)=>{
 const id=String(++nativeSequence);
 const finish=()=>{clearTimeout(timer);nativeTranslations.delete(id);signal?.removeEventListener('abort',fail);};
 const fail=()=>{finish();reject(new DOMException('Отменено','AbortError'));};
 const timer=setTimeout(()=>{finish();reject(Error('Время ожидания истекло. Проверь состояние пакета и повтори.'));},ms);
 if(signal?.aborted){fail();return;}signal?.addEventListener('abort',fail,{once:true});
 nativeTranslations.set(id,{timer,resolve:p=>{finish();resolve(p);},reject:e=>{finish();reject(e);}});
 try{invoke(id);}catch(e){finish();reject(e);}
 });}
function decodeTranslation(raw){
 if(Number(raw.responseStatus)!==200||raw.quotaFinished)throw Error(raw.quotaFinished||Number(raw.responseStatus)===429?'Лимит сервиса исчерпан. Попробуй позже.':'Сервис не смог перевести текст. Попробуй позже.');
 const value=raw.responseData?.translatedText;if(typeof value!=='string'||!value.trim())throw Error('Сервис вернул пустой ответ.');
 const d=new DOMParser().parseFromString(value,'text/html');return d.body.textContent||value;
}
async function requestTranslation(chunk,signal,from='en'){
 const bridge=window.OporaFiles;
 if(typeof bridge?.translateOnline==='function')return decodeTranslation(await nativeRequest(id=>bridge.translateOnline(id,chunk,from),signal));
 if(from==='en'&&typeof bridge?.translateEnglish==='function')return decodeTranslation(await nativeRequest(id=>bridge.translateEnglish(id,chunk),signal));
 if(bridge&&from==='ru')throw Error('Для русского → английского обнови Android-приложение.');
 const pair=from==='ru'?'ru|en':'en|ru';
 const r=await fetch('https://api.mymemory.translated.net/get?langpair='+encodeURIComponent(pair)+'&q='+encodeURIComponent(chunk),{signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
 if(!r.ok)throw Error(r.status===429?'Лимит сервиса исчерпан. Попробуй позже.':'Ошибка сервиса: '+r.status);return decodeTranslation(await r.json());
}
function renderTranslator(){
 const nativeOffline=typeof window.OporaFiles?.offlineTranslation==='function';
 $('#view').innerHTML=`<section class="panel translator-panel"><form id="translation-form"><label for="translation-direction">Направление перевода</label><select id="translation-direction"><option value="en">Английский → русский</option><option value="ru">Русский → английский</option></select><button type="button" id="translation-swap">⇄ Поменять языки</button><label for="translation-mode">Режим</label><select id="translation-mode"><option value="offline" ${nativeOffline?'':'disabled'}>Без интернета · Android</option><option value="online">Через интернет · MyMemory</option></select><p id="translation-info" class="fine"></p><section id="translation-model" ${nativeOffline?'':'hidden'}><p>Языковой пакет Google ML Kit: около 30 МБ. Один раз скачай через интернет, затем переводи в авиарежиме. Пакет занимает место в данных приложения, это не растущий HTTP-кеш.</p><label><input id="translation-cellular" type="checkbox"> Разрешить загрузку через мобильную сеть</label><div class="actions"><button type="button" id="translation-download">Скачать пакет</button><button type="button" id="translation-model-refresh">Проверить пакет</button><button type="button" id="translation-delete-model">Удалить пакет</button></div><p id="translation-model-status" role="status" aria-live="polite"></p></section><label id="translation-source-label" for="translation-source">Текст на английском</label><textarea id="translation-source" rows="7" maxlength="1500" placeholder="Вставь английский текст…" required></textarea><p class="fine" id="translation-limit"></p><div class="actions"><button class="primary" id="translation-submit" type="submit">Перевести на русский</button><button id="translation-clear" type="button">Очистить</button></div></form><p id="translation-status" role="status" aria-live="polite"></p><h2 id="translation-target-label">Перевод на русский</h2><div id="translation-output" class="translation-output" tabindex="0" aria-label="Перевод на русский"></div><p id="translation-attribution" hidden><a href="https://translate.google.com/" target="_blank" rel="noopener">powered by Google Translate</a> · автоматический перевод на устройстве</p><button id="translation-copy" type="button" hidden>Копировать перевод</button><p class="fine">Исходный текст и перевод не сохраняются в истории приложения. Машинный перевод может ошибаться: проверяй смысл, имена и термины. Google не предоставляет гарантий точности или надёжности машинного перевода.</p><p class="fine"><a href="https://developers.google.com/ml-kit/android-data-disclosure" target="_blank" rel="noopener">Данные SDK Google ML Kit ↗</a> · <a href="https://mymemory.translated.net/doc/usagelimits.php" target="_blank" rel="noopener">Лимиты MyMemory ↗</a></p></section>`;
 const source=$('#translation-source'),status=$('#translation-status'),output=$('#translation-output'),button=$('#translation-submit'),copy=$('#translation-copy'),direction=$('#translation-direction'),mode=$('#translation-mode'),badge=$('#translation-attribution');
 mode.value=nativeOffline?'offline':'online';
 const cancel=()=>{translationRun++;translationAbort?.abort();translationAbort=null;button.disabled=false;};
 const clearResult=()=>{cancel();output.textContent='';status.textContent='';copy.hidden=true;badge.hidden=true;};
 const settings=()=>{clearResult();const ru=direction.value==='ru',offline=mode.value==='offline';
  $('#translation-source-label').textContent=ru?'Текст на русском':'Текст на английском';source.placeholder=ru?'Вставь русский текст…':'Вставь английский текст…';
  button.textContent=ru?'Перевести на английский':'Перевести на русский';const target=ru?'Перевод на английский':'Перевод на русский';$('#translation-target-label').textContent=target;output.setAttribute('aria-label',target);
  source.maxLength=offline?5000:1500;
  $('#translation-limit').textContent=offline?'До 5000 символов. Офлайн-режим не переключается на онлайн автоматически.':'До 1500 символов. Большой текст делится на части; у сервиса есть суточный лимит.';
  $('#translation-info').textContent=offline?'Перевод на устройстве: текст не отправляется сервису перевода. Пакет скачивается с серверов Google по отдельной кнопке. SDK может отправлять служебную диагностику согласно правилам Google.':'MyMemory: текст отправляется стороннему сервису только по кнопке «Перевести». Не вводи пароли и личные данные. '+(nativeOffline?'':'В этой версии Windows, iPhone и веб-приложения полный перевод без интернета недоступен.');
  $('#translation-model').hidden=!nativeOffline||!offline;
 };
 direction.onchange=settings;mode.onchange=settings;
 $('#translation-swap').onclick=()=>{const previous=output.textContent;direction.value=direction.value==='en'?'ru':'en';if(previous)source.value=previous;settings();};
 source.oninput=clearResult;
 $('#translation-clear').onclick=()=>{source.value='';clearResult();source.focus();};
 if(nativeOffline){
  const modelStatus=$('#translation-model-status'),download=$('#translation-download'),del=$('#translation-delete-model');
  const call=(action)=>nativeRequest(id=>window.OporaFiles.offlineTranslation(id,action,'','en',$('#translation-cellular')?.checked===true),null,action==='download'?600000:60000);
  const show=p=>{if(!modelStatus.isConnected)return;modelStatus.textContent=p.busy?'Операция с пакетом выполняется. При загрузке без разрешения мобильной сети нужен Wi-Fi.':p.ready?'Пакет готов. Можно переводить без интернета в обе стороны.':'Пакет ещё не скачан. Подключись к интернету и нажми «Скачать пакет».';download.disabled=!!p.busy;del.disabled=!!p.busy||!p.ready;if(p.busy)setTimeout(()=>{if(modelStatus.isConnected)refresh();},3000);};
  const refresh=async()=>{try{show(await call('status'));}catch(e){if(modelStatus.isConnected)modelStatus.textContent=e.message;}};
  $('#translation-model-refresh').onclick=refresh;
  download.onclick=async()=>{download.disabled=true;del.disabled=true;modelStatus.textContent='Загрузка пакета… Не закрывай приложение. Без разрешения мобильной сети требуется Wi-Fi.';try{show(await call('download'));}catch(e){if(modelStatus.isConnected){modelStatus.textContent=e.message;download.disabled=false;}}};
  del.onclick=async()=>{if(!confirm('Удалить языковой пакет? Для офлайн-перевода понадобится скачать его снова. Заметки ДЗ останутся.'))return;clearResult();download.disabled=true;del.disabled=true;try{show(await call('delete'));}catch(e){if(modelStatus.isConnected){modelStatus.textContent=e.message;download.disabled=false;del.disabled=false;}}};
  refresh();
 }
 $('#translation-form').onsubmit=async e=>{
  e.preventDefault();const text=source.value.trim(),from=direction.value,offline=mode.value==='offline';
  if(!text){status.textContent=from==='ru'?'Вставь текст на русском.':'Вставь текст на английском.';return;}
  if(text.length>(offline?5000:1500)){status.textContent='Сократи текст до '+(offline?5000:1500)+' символов.';return;}
  if(from==='en'&&/[А-Яа-яЁё]/.test(text)&&!/[a-zA-Z]/.test(text)){status.textContent='Похоже, текст на русском. Выбери «Русский → английский» или нажми ⇄.';return;}
  if(from==='ru'&&/[a-zA-Z]/.test(text)&&!/[А-Яа-яЁё]/.test(text)){status.textContent='Похоже, текст на английском. Выбери «Английский → русский» или нажми ⇄.';return;}
  clearResult();const run=translationRun;translationAbort=new AbortController();const controller=translationAbort;
  const timeout=setTimeout(()=>controller.abort(),60000);button.disabled=true;
  try{
   let value;
   if(offline){status.textContent='Перевожу на устройстве…';const p=await nativeRequest(id=>window.OporaFiles.offlineTranslation(id,'translate',text,from,false),controller.signal);if(typeof p.translatedText!=='string'||!p.translatedText.trim())throw Error('Модель вернула пустой ответ.');value=p.translatedText;}
   else{const chunks=translationChunks(text),result=[];for(let i=0;i<chunks.length;i++){if(run!==translationRun)return;status.textContent=`Перевод: часть ${i+1} из ${chunks.length}…`;result.push(await requestTranslation(chunks[i],controller.signal,from));}value=result.join(' ');}
   if(run!==translationRun)return;output.textContent=value;status.textContent=offline?'Готово · без интернета. Проверь смысл перевода.':'Готово · MyMemory через интернет. Проверь смысл перевода.';copy.hidden=false;badge.hidden=!offline;
  }catch(err){if(run!==translationRun)return;status.textContent=err.name==='AbortError'?'Время ожидания истекло. Попробуй короткий текст и проверь выбранный режим.':err.message||'Не удалось перевести.';output.textContent='';}
  finally{clearTimeout(timeout);if(run===translationRun){button.disabled=false;translationAbort=null;}}
 };
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(output.textContent);status.textContent='Перевод скопирован.';}catch(e){status.textContent='Выдели перевод и скопируй через меню устройства.';}};
 settings();
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
renderAbout=function(){v07RenderAbout();$('#view').insertAdjacentHTML('afterbegin',`<section class="panel"><h2>Обновление 1.0.0</h2><p>${DB.cards.length} материалов · ${DB.cards.filter(c=>c.kind==='essay').length} тем сочинений с двумя полными образцами к каждой · 10 расширенных пересказов · ${DB.cards.reduce((n,c)=>n+(c.qa?.length||0),0)} вопросов с ответами. Перевод EN ↔ RU: Android — офлайн после скачивания пакета; Windows и iPhone PWA — онлайн. Также 11 офлайн-моделей по предметам, включая 5 по биологии. Биология: 30 тем, 60 разобранных заданий. ДЗ: локальные заметки, сроки, напоминания и экспорт в календарь.</p></section><section class="panel"><h2>Память и кеш</h2><p>Учебная база встроена в приложение. Размер установленного приложения, оперативная память, данные и кеш — разные показатели. После первой загрузки кеш растёт, но постоянный неограниченный рост требует проверки.</p><p id="cache-estimate" class="fine">Оценка хранилища недоступна.</p><button id="cache-clean" type="button">Очистить лишний кеш</button><p id="cache-clean-status" role="status"></p><p class="fine">Android APK: очищается HTTP-кеш WebView. Веб/PWA: удаляются только старые кеши «Опоры»; текущая офлайн-копия сохраняется. Избранное и тема не удаляются. Кнопка не может очистить весь системный кеш Android или память других приложений.</p></section>`);
 const label=$('#cache-estimate');if(navigator.storage?.estimate)navigator.storage.estimate().then(s=>{if(label.isConnected)label.textContent=`Данные этого сайта: около ${((s.usage||0)/1048576).toFixed(1)} МиБ. Оценка браузера, не точный размер кеша.`;}).catch(()=>{});
 $('#cache-clean').onclick=async()=>{const out=$('#cache-clean-status');try{if(window.OporaFiles?.clearHttpCache){window.OporaFiles.clearHttpCache();out.textContent='Запрошена очистка HTTP-кеша Android. Избранное сохранено.';}else if(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'){let n=0;for(const key of await caches.keys())if(/^opora-/.test(key)&&key!=='opora-1.0.0-ru-en1'){await caches.delete(key);n++;}out.textContent=n?`Удалено старых кешей: ${n}. Офлайн-копия сохранена.`:'Старых кешей нет. Текущая офлайн-копия сохранена.';}else out.textContent='Для локального HTML отдельного офлайн-кеша нет. Настройки и избранное не изменены.';}catch(e){out.textContent='Очистка недоступна в этом окружении. Избранное не изменено.';}};
};
window.OporaV07={translationChunks,decodeTranslation,subjectModels};
const v07Subjects=renderSubjects;
renderSubjects=function(){v07Subjects();$('.subject-search').insertAdjacentHTML('afterend','<div class="actions quick-learning"><button type="button" data-view="translate">Перевод EN ↔ RU</button><button type="button" data-view="subject-practice">Задачи по предметам →</button></div>');};
const v07Library=renderLibrary;
renderLibrary=function(){v07Library();if(activeView==='subject'&&chosenSubject==='Английский язык')$('.subject-actions')?.insertAdjacentHTML('beforeend','<button type="button" data-view="translate">Перевод EN ↔ RU</button>');};
