'use strict';
const {app}=require('electron'),path=require('path'),os=require('os'),fs=require('fs');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'opora-ci-')));
const deadline=setTimeout(()=>{console.error('Desktop smoke test timed out');app.exit(1);},45000);
app.on('browser-window-created',(_event,win)=>{
 win.webContents.once('did-finish-load',async()=>{
  try{
   const result=await win.webContents.executeJavaScript(`(function(){
    if(DB.version!=='0.8.1')throw Error('Wrong version');
    if(document.querySelector('.nav [data-view]:last-child').dataset.view!=='homework')throw Error('Desktop order');
    setView('about');if(!document.getElementById('view').textContent.includes('Сделано NoSmoke'))throw Error('Credit');
    setView('homework');document.getElementById('hw-title').value='CI smoke test';
    document.getElementById('hw-text').value='Test note';document.getElementById('hw-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    if(OporaHomework.getNotes().length!==1)throw Error('Homework save');
    if(!JSON.parse(localStorage.getItem('opora-homework-v1')).length)throw Error('Persistence');
    setView('translate');if(!document.getElementById('translation-form'))throw Error('Translator');
    return {version:DB.version,materials:DB.cards.length,homework:true,translator:true,credit:true};
   })()`,true);
   console.log('DESKTOP_SMOKE_OK '+JSON.stringify(result));clearTimeout(deadline);app.exit(0);
  }catch(e){console.error(e);clearTimeout(deadline);app.exit(1);}
 });
});
require('../app/main.cjs');
