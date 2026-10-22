package ru.opora.study;

import android.test.InstrumentationTestCase;
import android.content.Context;
import android.net.ConnectivityManager;
import android.os.ParcelFileDescriptor;
import java.io.FileInputStream;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

/** Downloads explicitly, disables all emulator radios, verifies both translations offline. */
public class OfflineTranslationTest extends InstrumentationTestCase {
 private final LinkedBlockingQueue<JSONObject> replies=new LinkedBlockingQueue<>();
 private OfflineTranslation engine;
 private JSONObject await(long seconds) throws Exception {
  JSONObject result=replies.poll(seconds,TimeUnit.SECONDS);
  assertNotNull("Native callback timed out",result);
  assertFalse(result.optString("error"),result.has("error"));return result;
 }
 private void shell(String command)throws Exception {
  try(ParcelFileDescriptor fd=getInstrumentation().getUiAutomation().executeShellCommand(command);FileInputStream in=new FileInputStream(fd.getFileDescriptor())){byte[] buf=new byte[4096];while(in.read(buf)!=-1){}}
 }
 public void testDownloadedModelTranslatesWithRadiosOff()throws Exception {
  getInstrumentation().runOnMainSync(()->engine=new OfflineTranslation((id,p)->replies.offer(p)));
  try{
   getInstrumentation().runOnMainSync(()->engine.download("1",true));assertTrue(await(600).getBoolean("ready"));
   shell("svc wifi disable");shell("svc data disable");
   ConnectivityManager cm=(ConnectivityManager)getInstrumentation().getTargetContext().getSystemService(Context.CONNECTIVITY_SERVICE);
   for(int i=0;i<40&&cm.getActiveNetwork()!=null;i++)Thread.sleep(500);
   assertNull("Offline check requires no active network",cm.getActiveNetwork());
   getInstrumentation().runOnMainSync(()->engine.translate("2","Hello world!","en"));
   String ru=await(90).getString("translatedText");assertTrue("Expected Russian output",ru.matches("(?s).*[А-Яа-яЁё].*"));
   getInstrumentation().runOnMainSync(()->engine.translate("3","Привет, мир!","ru"));
   String en=await(90).getString("translatedText");assertTrue("Expected English output",en.matches("(?s).*[A-Za-z].*"));
   getInstrumentation().runOnMainSync(()->engine.delete("4"));assertFalse(await(60).getBoolean("ready"));
   getInstrumentation().runOnMainSync(()->engine.translate("5","Hello","en"));
   JSONObject missing=replies.poll(60,TimeUnit.SECONDS);assertNotNull(missing);assertTrue("Missing model must not fall back online",missing.has("error"));
  }finally{shell("svc wifi enable");shell("svc data enable");getInstrumentation().runOnMainSync(()->engine.close());}
 }
}
