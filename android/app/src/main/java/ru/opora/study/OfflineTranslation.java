package ru.opora.study;

import com.google.mlkit.nl.translate.TranslateLanguage;
import com.google.mlkit.nl.translate.TranslateRemoteModel;
import com.google.mlkit.nl.translate.Translation;
import com.google.mlkit.nl.translate.Translator;
import com.google.mlkit.nl.translate.TranslatorOptions;
import com.google.mlkit.common.model.RemoteModelManager;
import com.google.mlkit.common.model.DownloadConditions;
import com.google.android.gms.tasks.Tasks;
import org.json.JSONObject;

/** All methods and callbacks run on the Activity UI thread. Never downloads on translate. */
final class OfflineTranslation {
 interface Reply { void send(String id, JSONObject result); }
 private final Reply reply;
 private final RemoteModelManager manager=RemoteModelManager.getInstance();
 private final TranslateRemoteModel russian=new TranslateRemoteModel.Builder(TranslateLanguage.RUSSIAN).build();
 private Translator enRu,ruEn;
 private boolean busy=false,closed=false;
 OfflineTranslation(Reply reply){this.reply=reply;}
 private void clients(){
  if(enRu==null)enRu=Translation.getClient(new TranslatorOptions.Builder().setSourceLanguage(TranslateLanguage.ENGLISH).setTargetLanguage(TranslateLanguage.RUSSIAN).build());
  if(ruEn==null)ruEn=Translation.getClient(new TranslatorOptions.Builder().setSourceLanguage(TranslateLanguage.RUSSIAN).setTargetLanguage(TranslateLanguage.ENGLISH).build());
 }
 private JSONObject data(String key,Object value){JSONObject p=new JSONObject();try{p.put(key,value);}catch(Exception ignored){}return p;}
 private void send(String id,JSONObject p){if(!closed)reply.send(id,p);}
 private void fail(String id,String text){send(id,data("error",text));}
 void status(String id){
  if(closed)return;
  manager.isModelDownloaded(russian).addOnSuccessListener(ready->{JSONObject p=data("ready",ready);try{p.put("busy",busy);}catch(Exception ignored){}send(id,p);})
   .addOnFailureListener(e->fail(id,"Не удалось проверить языковой пакет."));
 }
 void download(String id,boolean cellular){
  if(closed)return;if(busy){fail(id,"Дождись завершения предыдущей операции.");return;}busy=true;clients();
  DownloadConditions.Builder b=new DownloadConditions.Builder();if(!cellular)b.requireWifi();
  DownloadConditions conditions=b.build();
  Tasks.whenAll(enRu.downloadModelIfNeeded(conditions),ruEn.downloadModelIfNeeded(conditions))
   .addOnSuccessListener(v->{busy=false;status(id);})
   .addOnFailureListener(e->{busy=false;fail(id,"Пакет не скачан. Подключись к Wi-Fi (или разреши мобильную сеть), проверь свободное место и повтори.");});
 }
 void translate(String id,String text,String from){
  if(closed)return;if(busy){fail(id,"Дождись завершения предыдущей операции.");return;}busy=true;
  manager.isModelDownloaded(russian).addOnSuccessListener(ready->{
   if(closed)return;
   if(!ready){busy=false;fail(id,"Сначала скачай языковой пакет. Онлайн-перевод автоматически не включается.");return;}
   clients();Translator client="en".equals(from)?enRu:ruEn;
   client.translate(text).addOnSuccessListener(value->{busy=false;send(id,data("translatedText",value));})
    .addOnFailureListener(e->{busy=false;fail(id,"Не удалось перевести на устройстве. Попробуй короткий текст или заново скачай пакет.");});
  }).addOnFailureListener(e->{busy=false;fail(id,"Не удалось проверить языковой пакет.");});
 }
 void delete(String id){
  if(closed)return;if(busy){fail(id,"Сейчас пакет используется. Дождись завершения операции.");return;}busy=true;closeClients();
  manager.deleteDownloadedModel(russian).addOnSuccessListener(v->{busy=false;status(id);})
   .addOnFailureListener(e->{busy=false;fail(id,"Не удалось удалить пакет. Попробуй ещё раз.");});
 }
 private void closeClients(){if(enRu!=null){enRu.close();enRu=null;}if(ruEn!=null){ruEn.close();ruEn=null;}}
 void close(){closed=true;closeClients();}
}
