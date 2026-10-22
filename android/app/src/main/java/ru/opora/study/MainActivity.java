package ru.opora.study;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.view.View;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebResourceResponse;
import android.widget.Toast;
import android.webkit.ValueCallback;
import android.webkit.JavascriptInterface;
import java.io.OutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.URL;
import java.net.URLEncoder;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONObject;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.io.ByteArrayInputStream;

public class MainActivity extends Activity {
 private WebView web;
 private final ExecutorService translator=Executors.newSingleThreadExecutor();
 private String pendingSVG;
 private static final String HOME="file:///android_asset/index.html";
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(24,25,22));
  getWindow().setNavigationBarColor(Color.rgb(24,25,22));
  final FrameLayout root=new FrameLayout(this);
  root.setBackgroundColor(Color.rgb(24,25,22));
  if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
  root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener(){
   public WindowInsets onApplyWindowInsets(View view,WindowInsets insets){
    if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars());android.graphics.Insets ime=insets.getInsets(WindowInsets.Type.ime());view.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,ime.bottom));}
    else view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
    return insets;
   }
  });
  web=new WebView(this);
  root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
  WebSettings settings=web.getSettings();
  settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
  settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
  settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setSupportMultipleWindows(false);settings.setMediaPlaybackRequiresUserGesture(true);
  WebView.setWebContentsDebuggingEnabled(false);
  web.setWebChromeClient(new WebChromeClient());
  web.addJavascriptInterface(new ExportBridge(),"OporaFiles");
  web.setWebViewClient(new WebViewClient(){
   @Override public void onPageFinished(WebView view,String url){if(HOME.equals(url))view.evaluateJavascript("window.saveLocalFile=function(name,text,type){OporaFiles.saveDocument(name,text,type);};",null);}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    String url=request.getUrl().toString();if(HOME.equals(url)||url.startsWith(HOME+"#"))return false;
    if("https".equalsIgnoreCase(request.getUrl().getScheme())){try{startActivity(new Intent(Intent.ACTION_VIEW,request.getUrl()));}catch(Exception ignored){Toast.makeText(MainActivity.this,"Не найден браузер",Toast.LENGTH_SHORT).show();}}
    return true;
   }
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
    String scheme=request.getUrl().getScheme();
    if("http".equalsIgnoreCase(scheme)||"https".equalsIgnoreCase(scheme))return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));
    return null;
   }
  });
  web.loadUrl(HOME);root.requestApplyInsets();
 }
 @Override public void onBackPressed(){
  web.evaluateJavascript("(function(){var d=document.getElementById('knowledge-dialog');if(d&&d.open){d.close();return true;}if(typeof activeView!=='undefined'&&activeView!=='subjects'){setView('subjects');return true;}return false;})()",new ValueCallback<String>(){public void onReceiveValue(String value){if(!"true".equals(value))finish();}});
 }
 public class ExportBridge {
  @JavascriptInterface public void clearHttpCache(){
   runOnUiThread(new Runnable(){public void run(){if(web!=null)web.clearCache(true);}});
  }
  // Only this fixed public translation endpoint is reachable through the bridge.
  // Never accept a URL from JavaScript; no keys, cookies or translation history.
  @JavascriptInterface public void translateEnglish(final String id,final String text){
   if(id==null||!id.matches("[0-9]{1,10}")||text==null)return;
   try{if(text.getBytes("UTF-8").length>500)return;}catch(Exception ignored){return;}
   if(translator.isShutdown())return;
   translator.execute(new Runnable(){public void run(){
    HttpsURLConnection connection=null;String payload;
    try{
     URL url=new URL("https://api.mymemory.translated.net/get?langpair=en%7Cru&q="+URLEncoder.encode(text,"UTF-8"));
     connection=(HttpsURLConnection)url.openConnection();connection.setInstanceFollowRedirects(false);
     connection.setConnectTimeout(8000);connection.setReadTimeout(10000);connection.setUseCaches(false);
     connection.setRequestProperty("Accept","application/json");
     int code=connection.getResponseCode();
     if(code!=200)throw new Exception(code==429?"Лимит сервиса исчерпан. Попробуй позже.":"Сервис перевода недоступен.");
     try(InputStream input=connection.getInputStream();ByteArrayOutputStream bytes=new ByteArrayOutputStream()){
      byte[] buffer=new byte[4096];int n;
      while((n=input.read(buffer))!=-1){if(bytes.size()+n>200000)throw new Exception("Ответ сервиса слишком большой.");bytes.write(buffer,0,n);}
      payload=new JSONObject(new String(bytes.toByteArray(),"UTF-8")).toString();
     }
    }catch(Exception e){
     try{payload=new JSONObject().put("error","Не удалось перевести текст. Проверь интернет или лимит сервиса.").toString();}catch(Exception ignored){payload="{}";}
    }finally{if(connection!=null)connection.disconnect();}
    final String result=payload;
    runOnUiThread(new Runnable(){public void run(){if(web!=null)web.evaluateJavascript("window.oporaTranslationResult&&window.oporaTranslationResult("+JSONObject.quote(id)+","+result+");",null);}});
   }});
  }

  @JavascriptInterface public void saveSVG(final String filename,final String text){saveDocument(filename,text,"image/svg+xml");}
  @JavascriptInterface public void saveDocument(final String filename,final String text,final String mime){
   if(text==null||text.length()>10000000||!("image/svg+xml".equals(mime)||"text/calendar".equals(mime)||"application/json".equals(mime)))return;
   if("image/svg+xml".equals(mime)&&!text.contains("<svg"))return;
   runOnUiThread(new Runnable(){public void run(){
    if(pendingSVG!=null)return;
    pendingSVG=text;
    Intent save=new Intent(Intent.ACTION_CREATE_DOCUMENT);save.addCategory(Intent.CATEGORY_OPENABLE);save.setType(mime);
    save.putExtra(Intent.EXTRA_TITLE,filename==null?"opora-map.svg":filename.replaceAll("[^A-Za-z0-9._-]","_"));
    try{startActivityForResult(save,10);}catch(Exception e){pendingSVG=null;Toast.makeText(MainActivity.this,"Не удалось открыть выбор файла",Toast.LENGTH_LONG).show();}
   }});
  }
 }
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);
  if(request==10){final String content=pendingSVG;pendingSVG=null;
   if(result==RESULT_OK&&data!=null&&data.getData()!=null&&content!=null){
    try{OutputStream output=getContentResolver().openOutputStream(data.getData());if(output!=null){output.write(content.getBytes("UTF-8"));output.close();Toast.makeText(this,"Файл сохранён",Toast.LENGTH_SHORT).show();}}
    catch(Exception e){Toast.makeText(this,"Не удалось сохранить карту",Toast.LENGTH_LONG).show();}
   }
  }
 }
 @Override protected void onDestroy(){translator.shutdownNow();if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
