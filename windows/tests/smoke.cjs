'use strict';
const {app}=require('electron'),path=require('path'),os=require('os'),fs=require('fs');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'opora-ci-')));
const deadline=setTimeout(()=>{console.error('Desktop smoke test timed out');app.exit(1);},45000);
app.on('browser-window-created',(_event,win)=>{
 win.webContents.once('did-finish-load',async()=>{
  try{
   const result=await win.webContents.executeJavaScript(`(function(){
    if(DB.version!=='2.0.0')throw Error('Wrong version');
    const noMotion=document.createElement('style');noMotion.textContent='.theme-icons svg{transition:none!important}';document.head.append(noMotion);
    applyTheme('light');if(document.querySelector('.moon path').getTotalLength()<20)throw Error('Moon geometry');
    if(getComputedStyle(document.querySelector('.moon')).opacity!=='1')throw Error('Moon visibility');
    document.getElementById('theme-toggle').click();if(document.documentElement.dataset.theme!=='dark')throw Error('Theme toggle');
    applyTheme('light');
    if(document.querySelector('.nav [data-view]:last-child').dataset.view!=='homework')throw Error('Desktop order');
    setView('about');if(!document.getElementById('view').textContent.includes('Создано NoSmoke'))throw Error('Credit');
    setView('homework');document.getElementById('hw-title').value='CI smoke test';
    document.getElementById('hw-text').value='Test note';document.getElementById('hw-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    if(OporaHomework.getNotes().length!==1)throw Error('Homework save');
    if(!JSON.parse(localStorage.getItem('opora-homework-v1')).length)throw Error('Persistence');
    if(DB.cards.filter(c=>c.kind==='essay').length!==436)throw Error('Essay count');
    openCard('essay10-science-limits');if(document.querySelectorAll('.essay-full').length!==2)throw Error('Complete essays');document.getElementById('knowledge-dialog').close();
    if(DB.cards.filter(c=>c.subject==='Биология').some(c=>!c.solved||c.solved.length<2))throw Error('Biology solutions');
    setView('translate');if(!document.getElementById('translation-form'))throw Error('Translator');
    document.getElementById('translation-direction').value='ru';document.getElementById('translation-direction').dispatchEvent(new Event('change'));
    if(document.getElementById('translation-submit').textContent!=='Перевести на английский')throw Error('Translation direction');
    if(!document.getElementById('translation-submit').disabled)throw Error('Web offline translation must be unavailable');
    setView('schedule');if(!document.getElementById('schedule-form'))throw Error('Schedule');
    setView('personalization');if(!document.getElementById('appearance-size'))throw Error('Appearance');
    if(DB.examBank.tasks.length!==56)throw Error('Offline bank count');
    if(DB.examBank.tasks.filter(t=>t.subject==='Математика').length!==16)throw Error('Math example count');
    if(DB.examBank.tasks.some(t=>t.subject.endsWith('язык')&&!['Русский язык','Английский язык'].includes(t.subject)))throw Error('Unexpected language');
    setView('offline-exams');if(document.querySelectorAll('.exam-task').length!==56)throw Error('Offline bank rendering');
    if(!OporaExams.solve('2x+3=11').answer.includes('4'))throw Error('Offline equation');
    if(!OporaExams.solve('Найди ток: напряжение 12 В; сопротивление 6 Ом').answer.includes('2'))throw Error('Offline current');
    for(const t of OporaExams.templates)if(!OporaExams.solve(t.example).answer)throw Error('Offline template');
    let rejected=false;try{OporaExams.solve('Реши любую неизвестную задачу')}catch(e){rejected=true}if(!rejected)throw Error('Unsupported condition not rejected');
    if(OporaHomework.getNotes().length!==1)throw Error('Notes after exams');
    return {version:DB.version,materials:DB.cards.length,homework:true,translator:true,credit:true,offlineTasks:56,offlineTemplates:OporaExams.templates.length};
   })()`,true);
   console.log('DESKTOP_SMOKE_OK '+JSON.stringify(result));clearTimeout(deadline);app.exit(0);
  }catch(e){console.error(e);clearTimeout(deadline);app.exit(1);}
 });
});
require('../app/main.cjs');
