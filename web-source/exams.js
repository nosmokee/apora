// Deterministic offline practice. No remote requests, eval, or model downloads.
const examPositive=(x,name,zero=false)=>{if(!Number.isFinite(x)||Math.abs(x)>1e12||(zero?x<0:x<=0))throw Error(name+(zero?' должно быть ≥ 0.':' должно быть > 0.')+' Диапазон до 10¹².');return x;};
const examResult=(n,unit,steps)=>{if(!Number.isFinite(n))throw Error('Результат вне диапазона.');return{answer:(n!==0&&Math.abs(n)<1e-8?n.toExponential(5):approx(n))+' '+unit,steps};};
Object.assign(subjectModels,{
 'exam-speed':{name:'Физика · Средняя скорость (км/ч)',fields:[['distance','Весь путь, км','120'],['time','Всё время, ч','2']],solve:v=>{const s=examPositive(v('distance'),'Путь',true),t=examPositive(v('time'),'Время');return examResult(s/t,'км/ч',[`Средняя путевая скорость v = s/t.`,`v = ${s}/${t} = ${s/t} км/ч.`,'Путь — весь пройденный путь, время включает остановки. Это не модуль средней векторной скорости.']);}},
 'exam-ohm':{name:'Физика · Сила тока (закон Ома)',fields:[['voltage','Напряжение, В','12'],['resistance','Сопротивление, Ом','6']],solve:v=>{const u=examPositive(v('voltage'),'Модуль напряжения',true),r=examPositive(v('resistance'),'Сопротивление');return examResult(u/r,'А',['Для омического участка цепи I = U/R.',`I = ${u}/${r} = ${u/r} А.`,'Вводятся модули величин; сопротивление считается постоянным.']);}},
 'exam-moles':{name:'Химия · Количество вещества',fields:[['mass','Масса, г','18'],['molar','Молярная масса, г/моль','18']],solve:v=>{const m=examPositive(v('mass'),'Масса',true),M=examPositive(v('molar'),'Молярная масса');return examResult(m/M,'моль',['Количество вещества n = m/M.',`n = ${m}/${M} = ${m/M} моль.`,'Молярная масса вводится для конкретного вещества; приложение не определяет состав смеси по её массе.']);}},
 'exam-fraction':{name:'Химия · Массовая доля в растворе',fields:[['solute','Масса растворённого вещества, г','20'],['solution','Масса всего раствора, г','200']],solve:v=>{const m=examPositive(v('solute'),'Масса вещества',true),s=examPositive(v('solution'),'Масса раствора');if(m>s)throw Error('Масса вещества не может превышать массу всего раствора.');return examResult(m/s*100,'%',['w = m(вещества)/m(раствора) × 100%.',`w = ${m}/${s} × 100% = ${m/s*100}%.`,'Масса всего раствора включает и вещество, и растворитель.']);}},
 'exam-kinetic':{name:'Физика · Кинетическая энергия',fields:[['mass','Масса, кг','2'],['speed','Модуль скорости, м/с','3']],solve:v=>{const m=examPositive(v('mass'),'Масса'),s=examPositive(v('speed'),'Скорость',true);if(s>3e6)throw Error('Эта классическая модель ограничена скоростями до 3 000 000 м/с.');return examResult(m*s*s/2,'Дж',['В классической механике E = mv²/2.',`E = ${m} × ${s}²/2 = ${m*s*s/2} Дж.`,'Рассматриваем поступательное движение; энергия вращения и релятивистские эффекты не включены.']);}},
 'exam-density':{name:'Физика · Плотность',fields:[['mass','Масса, кг','5'],['volume','Объём, м³','0.002']],solve:v=>{const m=examPositive(v('mass'),'Масса'),V=examPositive(v('volume'),'Объём');return examResult(m/V,'кг/м³',['Средняя плотность ρ = m/V.',`ρ = ${m}/${V} = ${m/V} кг/м³.`,'Вводи массу в килограммах, объём в кубических метрах, а не литрах.']);}},
 'exam-heat':{name:'Физика · Нагрев без фазового перехода',fields:[['mass','Масса, кг','2'],['capacity','Удельная теплоёмкость, Дж/(кг·°C)','4200'],['delta','Повышение температуры, °C','10']],solve:v=>{const m=examPositive(v('mass'),'Масса'),c=examPositive(v('capacity'),'Теплоёмкость'),d=examPositive(v('delta'),'Повышение температуры',true);return examResult(m*c*d,'Дж',['Количество теплоты при нагревании Q = cmΔT.',`Q = ${c} × ${m} × ${d} = ${m*c*d} Дж.`,'Теплоёмкость постоянна; нет плавления, кипения, работы и потерь теплоты.']);}},
 'exam-probability':{name:'Математика · Классическая вероятность',fields:[['favourable','Благоприятных исходов','3'],['total','Всего равновероятных исходов','8']],solve:v=>{const k=v('favourable'),n=v('total');examPositive(k,'Число благоприятных исходов',true);examPositive(n,'Общее число исходов');if(!Number.isInteger(k)||!Number.isInteger(n)||k>n)throw Error('Числа исходов должны быть целыми; благоприятных не больше общего числа.');const q=Q(BigInt(k),BigInt(n));return{answer:qstr(q)+' ≈ '+approx(k/n),steps:['Все элементарные исходы должны быть равновероятны.',`P = k/n = ${k}/${n} = ${qstr(q)}.`,'Вероятность лежит от 0 до 1. Для неравновероятных исходов эта формула неприменима.']};}}
});
const examTemplates=[
 {label:'Линейное уравнение',example:'2x + 3 = 11',custom:'linear'},
 {label:'Квадратное уравнение',example:'Квадратное: a=1; b=-5; c=6',source:'Квадратное: a=<n>; b=<n>; c=<n>',keys:['a','b','c'],custom:'quadratic'},
 {label:'Средняя скорость',example:'Найди скорость: путь 120 км; время 2 ч',source:'Найди скорость: путь <n> км; время <n> ч',keys:['distance','time'],model:'exam-speed'},
 {label:'Закон Ома',example:'Найди ток: напряжение 12 В; сопротивление 6 Ом',source:'Найди ток: напряжение <n> В; сопротивление <n> Ом',keys:['voltage','resistance'],model:'exam-ohm'},
 {label:'Количество вещества',example:'Найди количество вещества: масса 18 г; молярная масса 18 г/моль',source:'Найди количество вещества: масса <n> г; молярная масса <n> г/моль',keys:['mass','molar'],model:'exam-moles'},
 {label:'Массовая доля',example:'Найди массовую долю: вещество 20 г; раствор 200 г',source:'Найди массовую долю: вещество <n> г; раствор <n> г',keys:['solute','solution'],model:'exam-fraction'},
 {label:'Кинетическая энергия',example:'Найди кинетическую энергию: масса 2 кг; скорость 3 м/с',source:'Найди кинетическую энергию: масса <n> кг; скорость <n> м/с',keys:['mass','speed'],model:'exam-kinetic'},
 {label:'Плотность',example:'Найди плотность: масса 5 кг; объём 0,002 м³',source:'Найди плотность: масса <n> кг; объём <n> м³',keys:['mass','volume'],model:'exam-density'},
 {label:'Количество теплоты',example:'Найди теплоту: масса 2 кг; теплоёмкость 4200 Дж/(кг·°C); нагрев 10 °C',source:'Найди теплоту: масса <n> кг; теплоёмкость <n> Дж/(кг·°C); нагрев <n> °C',keys:['mass','capacity','delta'],model:'exam-heat'},
 {label:'Вероятность',example:'Найди вероятность: благоприятных 3; всего 8',source:'Найди вероятность: благоприятных <n>; всего <n>',keys:['favourable','total'],model:'exam-probability'},
 {label:'Доля гуанина в ДНК',example:'ДНК: аденин 20%',source:'ДНК: аденин <n>%',keys:['adenine'],model:'bio-dna'},
 {label:'Масштаб карты',example:'Масштаб: расстояние 3,5 см; знаменатель 200000',source:'Масштаб: расстояние <n> см; знаменатель <n>',keys:['cm','scale'],model:'scale'},
 {label:'Растровое изображение',example:'Изображение: ширина 800; высота 600; глубина 24',source:'Изображение: ширина <n>; высота <n>; глубина <n>',keys:['w','h','bits'],model:'image'}
];
function examCanonical(s){return String(s).normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/−/g,'-').replace(/\s+/g,' ').trim().replace(/[.!?。？！]+$/u,'').trim();}
function solveOfflineExam(raw){
 if(typeof raw!=='string'||!raw.trim())throw Error('Введи условие или выбери образец.');
 if(raw.length>2000)throw Error('Максимум 2000 символов. Для большого условия используй банк или поля числовой модели.');
 const text=examCanonical(raw);
 const found=DB.examBank.tasks.find(t=>examCanonical(t.q)===text);
 if(found)return{answer:found.answer,steps:found.steps,recognized:found.subject+' · готовый разбор из учебного банка'};
 // Anchor the whole input. Extra conditions or unknown units must never be silently ignored.
 const num='([-+]?\\d{1,12}(?:[.,]\\d{1,6})?)';
 for(const t of examTemplates){
  let match,values={};
  if(t.custom==='linear'){
   match=text.replace(/\s/g,'').match(new RegExp('^([+-]?(?:\\d{1,12}(?:[.,]\\d{1,6})?)?)x(?:([+-]\\d{1,12}(?:[.,]\\d{1,6})?))?='+num+'$','i'));
   if(!match)continue;
   values={a:match[1]===''||match[1]==='+'?'1':match[1]==='-'?'-1':match[1],b:match[2]||'0',c:match[3]};
  }else{
   const source=examCanonical(t.source).split('<n>').map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join(num).replace(/ /g,'\\s*');
   match=text.match(new RegExp('^'+source+'$','u'));if(!match)continue;
   t.keys.forEach((k,i)=>values[k]=match[i+1]);
  }
  const get=k=>{const n=Number(String(values[k]).replace(',','.'));if(!Number.isFinite(n)||Math.abs(n)>1e12)throw Error('Число вне диапазона ±10¹².');return n;};
  let result;if(t.custom==='linear')result=extendedSolve('linear',k=>String(values[k]).replace(',','.'));
  else if(t.custom==='quadratic')result=quadratic(...['a','b','c'].map(k=>String(values[k]).replace(',','.')));
  else result=subjectModels[t.model].solve(get);
  if(/NaN|Infinity/.test(result.answer))throw Error('Результат вне диапазона.');
  return{...result,recognized:t.label+' · распознан точный шаблон'};
 }
 throw Error('Такое условие пока не поддерживается офлайн. Произвольный текст не решается ИИ: выбери образец ниже и замени только числа либо открой числовые модели. Дополнительные условия и другие единицы требуют отдельного разбора.');
}
let examFilters={subject:'',exam:'',query:''};
function renderOfflineExams(){
 const tasks=DB.examBank.tasks,ss=[...new Set(tasks.map(t=>t.subject))];
 $('#view').innerHTML=`<section class="panel"><h2>Учебный банк · ${tasks.length} заданий · ${ss.length} предметов</h2><p>${esc(DB.examBank.notice)}</p><p class="fine">Все задания, ответы и вычисления в этом разделе работают без сети. На iPhone сначала дождись «Офлайн готов». Условия никуда не отправляются. Задания с развёрнутым ответом содержат учебный разбор, а не официальные критерии оценивания.</p><div class="actions"><button type="button" id="exam-jump-input">Ввести своё условие ↓</button><button type="button" data-view="subject-practice">Числовые модели →</button><button type="button" data-view="solver">Уравнения и калькулятор →</button></div></section><section class="panel" id="offline-input"><h2>Решить своё условие без интернета</h2><p class="fine">${examTemplates.length} поддерживаемых шаблонов и точные вопросы из банка. Это не универсальный ИИ и не распознавание фото. Выбери образец, замени числа, сохрани единицы и порядок величин. Для остальных задач есть банк с готовыми разборами.</p><div class="field"><label for="exam-template">Образец условия</label><select id="exam-template">${examTemplates.map((t,i)=>`<option value="${i}">${esc(t.label)}</option>`).join('')}</select></div><button type="button" id="exam-paste">Вставить образец</button><form id="exam-input-form"><div class="field"><label for="exam-condition">Условие</label><textarea id="exam-condition" rows="4" maxlength="2000" required placeholder="Например: 2x + 3 = 11"></textarea></div><button type="submit" class="primary">Решить офлайн</button></form><p id="exam-input-error" role="alert"></p><p id="exam-recognized" class="fine" role="status"></p><div id="exam-input-result" aria-live="polite"></div></section><section class="panel"><h2>Задания с готовыми решениями</h2><div class="hw-fields"><div class="field"><label for="exam-subject">Предмет</label><select id="exam-subject"><option value="">Все предметы</option>${ss.map(s=>`<option>${esc(s)}</option>`).join('')}</select></div><div class="field"><label for="exam-level">Уровень подготовки</label><select id="exam-level"><option value="">ОГЭ и ЕГЭ</option><option>ОГЭ</option><option>ЕГЭ</option></select></div></div><div class="field"><label for="exam-search">Поиск по темам, условиям и разборам</label><input id="exam-search" type="search" maxlength="200" placeholder="ДНК, логарифм, Past Simple…"></div><p class="fine" id="exam-count" role="status"></p><div id="exam-tasks"></div></section>`;
 const clear=()=>{for(const s of ['#exam-input-error','#exam-recognized','#exam-input-result'])$(s).textContent='';};
 $('#exam-condition').oninput=clear;
 $('#exam-input-form').onsubmit=e=>{e.preventDefault();clear();try{const r=solveOfflineExam($('#exam-condition').value);$('#exam-recognized').textContent=r.recognized;showResult('#exam-input-result',r);}catch(err){$('#exam-input-error').textContent=err.message;}};
 $('#exam-paste').onclick=()=>{clear();$('#exam-condition').value=examTemplates[Number($('#exam-template').value)].example;$('#exam-condition').focus();};
 $('#exam-jump-input').onclick=()=>{$('#offline-input').scrollIntoView({block:'start'});$('#exam-condition').focus({preventScroll:true});};
 $('#exam-subject').value=examFilters.subject;$('#exam-level').value=examFilters.exam;$('#exam-search').value=examFilters.query;
 for(const [id,key] of [['exam-subject','subject'],['exam-level','exam'],['exam-search','query']])$('#'+id).addEventListener(key==='query'?'input':'change',e=>{examFilters[key]=e.target.value;drawOfflineExamTasks();});
 drawOfflineExamTasks();
}
function drawOfflineExamTasks(){
 const query=examCanonical(examFilters.query),rows=DB.examBank.tasks.filter(t=>(!examFilters.subject||t.subject===examFilters.subject)&&(!examFilters.exam||t.exam===examFilters.exam)&&(!query||examCanonical([t.subject,t.topic,t.q,t.answer,...t.steps].join(' ')).includes(query)));
 $('#exam-count').textContent='Найдено: '+rows.length+' из '+DB.examBank.tasks.length;
 $('#exam-tasks').innerHTML=rows.length?rows.map(t=>`<article class="exam-task"><p class="fine">${esc(t.subject)} · ${esc(t.exam)} · ${t.grade} класс · ${esc(t.topic)}</p><h3>${esc(t.q)}</h3><details><summary>Ответ и пошаговое решение</summary><p><strong>${esc(t.answer)}</strong></p><ol>${t.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="fine">${esc(t.origin)}. Не задание ФИПИ.</p></details><button type="button" data-exam-try="${t.id}">Перенести условие в решатель ↑</button></article>`).join(''):'<p class="empty">В стартовом банке нет совпадений. Измени фильтры или запрос.</p>';
 $$('[data-exam-try]').forEach(b=>b.onclick=()=>{const t=DB.examBank.tasks.find(t=>t.id===b.dataset.examTry);$('#exam-condition').value=t.q;$('#exam-condition').dispatchEvent(new Event('input'));$('#offline-input').scrollIntoView({block:'start'});$('#exam-condition').focus({preventScroll:true});});
}
const examBaseSetView=setView;
setView=function(v){
 if(v!=='offline-exams')return examBaseSetView(v);
 if(translationAbort){translationAbort.abort();translationAbort=null;}translationRun++;
 activeView=v;document.body.dataset.screen=v;
 $('#page-title').textContent='ОГЭ / ЕГЭ · офлайн';$('#page-intro').textContent='Учебные задания с разборами и типовые решатели. Без интернета.';
 $$('[data-view]').forEach(b=>{const on=b.dataset.view===v;b.classList.toggle('active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 renderOfflineExams();window.scrollTo(0,0);
};
const examBaseRenderSolver=renderSolver;
renderSolver=function(){examBaseRenderSolver();$('#view').insertAdjacentHTML('afterbegin','<section class="panel"><h2>ОГЭ / ЕГЭ без интернета</h2><p>56 авторских заданий по 11 предметам, в том числе 16 по математике, готовые разборы и ввод условия по поддерживаемым шаблонам.</p><button type="button" class="primary" data-view="offline-exams">Открыть офлайн-банк и ввод условия →</button></section>');};
const examBaseSubjects=renderSubjects;
renderSubjects=function(){examBaseSubjects();$('.quick-learning')?.insertAdjacentHTML('beforeend','<button type="button" data-view="offline-exams">ОГЭ / ЕГЭ · офлайн →</button>');};
window.OporaExams={solve:solveOfflineExam,templates:examTemplates,taskCount:DB.examBank.tasks.length};
