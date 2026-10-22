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
import java.io.ByteArrayInputStream;

public class MainActivity extends Activity {
 private WebView web;
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
  settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
  settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setSupportMultipleWindows(false);settings.setMediaPlaybackRequiresUserGesture(true);
  WebView.setWebContentsDebuggingEnabled(false);
  web.setWebChromeClient(new WebChromeClient());
  web.addJavascriptInterface(new ExportBridge(),"OporaFiles");
  web.setWebViewClient(new WebViewClient(){
   @Override public void onPageFinished(WebView view,String url){if(HOME.equals(url))view.evaluateJavascript("window.saveLocalFile=function(name,text,type){if(type==='image/svg+xml')OporaFiles.saveSVG(name,text);};",null);}
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
  @JavascriptInterface public void saveSVG(final String filename,final String text){
   if(text==null||text.length()>10000000||!text.contains("<svg"))return;
   runOnUiThread(new Runnable(){public void run(){
    if(pendingSVG!=null)return;
    pendingSVG=text;
    Intent save=new Intent(Intent.ACTION_CREATE_DOCUMENT);save.addCategory(Intent.CATEGORY_OPENABLE);save.setType("image/svg+xml");
    save.putExtra(Intent.EXTRA_TITLE,filename==null?"opora-map.svg":filename.replaceAll("[^A-Za-z0-9._-]","_"));
    try{startActivityForResult(save,10);}catch(Exception e){pendingSVG=null;Toast.makeText(MainActivity.this,"Не удалось открыть выбор файла",Toast.LENGTH_LONG).show();}
   }});
  }
 }
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);
  if(request==10){final String content=pendingSVG;pendingSVG=null;
   if(result==RESULT_OK&&data!=null&&data.getData()!=null&&content!=null){
    try{OutputStream output=getContentResolver().openOutputStream(data.getData());if(output!=null){output.write(content.getBytes("UTF-8"));output.close();Toast.makeText(this,"Карта сохранена",Toast.LENGTH_SHORT).show();}}
    catch(Exception e){Toast.makeText(this,"Не удалось сохранить карту",Toast.LENGTH_LONG).show();}
   }
  }
 }
 @Override protected void onDestroy(){if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
