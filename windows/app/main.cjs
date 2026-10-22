'use strict';
const{app,BrowserWindow,Menu,shell,session}=require('electron');
const path=require('path'),{pathToFileURL}=require('url');
let win;
const home=pathToFileURL(path.join(__dirname,'index.html')).href;
if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
 app.whenReady().then(()=>{
  app.setAppUserModelId('ru.opora.study');Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(details,callback)=>{let allowed=false;try{const u=new URL(details.url);allowed=u.protocol==='https:'&&u.hostname==='api.mymemory.translated.net'&&u.pathname==='/get'&&details.method==='GET';}catch(e){}callback({cancel:!allowed});});
  win=new BrowserWindow({title:'Опора',icon:path.join(__dirname,'icon.ico'),width:1280,height:900,minWidth:390,minHeight:600,backgroundColor:'#f5f2ea',show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,spellcheck:false}});
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//i.test(url))shell.openExternal(url).catch(()=>{});return{action:'deny'};});
  win.webContents.on('will-navigate',(event,url)=>{if(url!==home){event.preventDefault();if(/^https:\/\//i.test(url))shell.openExternal(url).catch(()=>{});}});
  win.once('ready-to-show',()=>win.show());win.loadURL(home);
 });
 app.on('window-all-closed',()=>app.quit());
}
