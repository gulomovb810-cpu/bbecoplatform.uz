package uz.bbecoplatform.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * bbecoplatform.uz mobil ilovasi: index.html'ni ilova ichidan (assets/www) ochadi.
 * Sahifa https://appassets.androidplatform.net manzilida ishlaydi, shuning uchun
 * joylashuv, localStorage va tarmoq so'rovlari oddiy saytdagidek ishlaydi.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/www/index.html";
    private static final int REQ_FILE = 1;
    private static final int REQ_PERM_CAMERA = 2;
    private static final int REQ_PERM_LOCATION = 3;

    private WebView web;
    private WebViewAssetLoader assets;

    private ValueCallback<Uri[]> fileCallback;
    private WebChromeClient.FileChooserParams fileParams;
    private Uri cameraUri;
    private File cameraFile;
    private Uri videoUri;
    private File videoFile;

    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;

    private long lastBack;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0A2219"));
        setContentView(web);

        assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + " BBEcoApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assets.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                // Yangiliklar, Google Maps, telefon va boshqa tashqi havolalar tegishli ilovada ochiladi
                openExternal(uri);
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                        || hasPermission(Manifest.permission.ACCESS_COARSE_LOCATION)) {
                    callback.invoke(origin, true, false);
                } else {
                    geoOrigin = origin;
                    geoCallback = callback;
                    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_PERM_LOCATION);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                fileParams = params;
                if (wantsCamera(params) && !hasPermission(Manifest.permission.CAMERA)) {
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_PERM_CAMERA);
                } else {
                    openChooser();
                }
                return true;
            }
        });

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(START_URL);
    }

    private boolean hasPermission(String p) {
        return checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED;
    }

    private static boolean wantsCamera(WebChromeClient.FileChooserParams params) {
        return wantsType(params, "image") || wantsType(params, "video");
    }

    /** accept="image/*" / "video/*" / bo'sh — qaysi kamera rejimi kerakligini aniqlaydi */
    private static boolean wantsType(WebChromeClient.FileChooserParams params, String kind) {
        String[] types = params.getAcceptTypes();
        if (types == null || types.length == 0) return true;
        boolean any = false;
        for (String raw : types) {
            if (raw == null) continue;
            for (String t : raw.split(",")) {
                t = t.trim().toLowerCase();
                if (t.isEmpty()) continue;
                any = true;
                if (t.startsWith(kind) || t.equals("*/*")) return true;
            }
        }
        return !any;
    }

    private Intent photoIntent() throws Exception {
        File dir = new File(getCacheDir(), "camera");
        if (!dir.exists()) dir.mkdirs();
        cameraFile = new File(dir, "photo_" + System.currentTimeMillis() + ".jpg");
        cameraUri = FileProvider.getUriForFile(this, getPackageName() + ".files", cameraFile);
        Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        cam.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
        cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return cam;
    }

    private Intent videoIntent() throws Exception {
        File dir = new File(getCacheDir(), "camera");
        if (!dir.exists()) dir.mkdirs();
        videoFile = new File(dir, "video_" + System.currentTimeMillis() + ".mp4");
        videoUri = FileProvider.getUriForFile(this, getPackageName() + ".files", videoFile);
        Intent cam = new Intent(MediaStore.ACTION_VIDEO_CAPTURE);
        cam.putExtra(MediaStore.EXTRA_OUTPUT, videoUri);
        cam.putExtra(MediaStore.EXTRA_DURATION_LIMIT, 60);              // ilova 60 soniyagacha qabul qiladi
        cam.putExtra(MediaStore.EXTRA_SIZE_LIMIT, 48L * 1024 * 1024);   // serverdagi 50 MB chegaradan kichik
        cam.putExtra(MediaStore.EXTRA_VIDEO_QUALITY, 1);
        cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return cam;
    }

    private void openChooser() {
        if (fileParams == null) return;
        Intent pick;
        try {
            pick = fileParams.createIntent();
        } catch (Exception e) {
            pick = new Intent(Intent.ACTION_GET_CONTENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE);
        }
        if (fileParams.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
            pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }
        List<Intent> extra = new ArrayList<>();
        cameraUri = null; cameraFile = null; videoUri = null; videoFile = null;
        boolean img = wantsType(fileParams, "image"), vid = wantsType(fileParams, "video");
        if ((img || vid) && hasPermission(Manifest.permission.CAMERA)) {
            // capture="environment": tanlov oynasisiz to'g'ridan-to'g'ri kamerani ochamiz
            if (fileParams.isCaptureEnabled()) {
                try {
                    Intent direct = (vid && !img) ? videoIntent() : photoIntent();
                    startActivityForResult(direct, REQ_FILE);
                    return;
                } catch (Exception ignored) {
                    cameraUri = null; videoUri = null;
                }
            }
            try { if (img) extra.add(photoIntent()); } catch (Exception ignored) { cameraUri = null; }
            try { if (vid) extra.add(videoIntent()); } catch (Exception ignored) { videoUri = null; }
        }
        Intent chooser = Intent.createChooser(pick, getString(R.string.pick_file));
        if (!extra.isEmpty()) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, extra.toArray(new Intent[0]));
        try {
            startActivityForResult(chooser, REQ_FILE);
        } catch (ActivityNotFoundException e) {
            finishFileChooser(null);
        }
    }

    private void finishFileChooser(Uri[] result) {
        if (fileCallback != null) fileCallback.onReceiveValue(result);
        fileCallback = null;
        fileParams = null;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILE) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            if (data != null && data.getClipData() != null) {
                int n = data.getClipData().getItemCount();
                result = new Uri[n];
                for (int i = 0; i < n; i++) result[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data != null && data.getData() != null) {
                result = new Uri[]{data.getData()};
            } else if (videoUri != null && videoFile != null && videoFile.length() > 0) {
                // Kamera videosi EXTRA_OUTPUT faylga yozildi
                result = new Uri[]{videoUri};
            } else if (cameraUri != null && (cameraFile == null || cameraFile.length() > 0)) {
                // Kamera rasmi EXTRA_OUTPUT faylga yozildi
                result = new Uri[]{cameraUri};
            }
        }
        finishFileChooser(result);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        boolean granted = false;
        for (int r : grantResults) granted |= r == PackageManager.PERMISSION_GRANTED;
        if (requestCode == REQ_PERM_CAMERA) {
            openChooser();
        } else if (requestCode == REQ_PERM_LOCATION && geoCallback != null) {
            geoCallback.invoke(geoOrigin, granted, false);
            geoCallback = null;
        }
    }

    private void openExternal(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme();
        Intent i = scheme.equals("tel") ? new Intent(Intent.ACTION_DIAL, uri) : new Intent(Intent.ACTION_VIEW, uri);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(i);
        } catch (ActivityNotFoundException ignored) {
            // mos ilova topilmadi
        }
    }

    @Override
    public void onBackPressed() {
        // Sahifadagi "←" tugmasini bosamiz; bosh sahifada esa ikki marta bosib chiqiladi
        String js = "(function(){if(typeof app!=='undefined'&&app.rtBack&&app.rtBack())return 'ok';var s=document.querySelector('.screen.active');"
                + "if(!s||s.id==='screen-home')return 'exit';"
                + "var b=s.querySelector('.topbar .back');if(b){b.click();return 'ok';}"
                + "if(typeof app!=='undefined'&&app.user){app.goto('home');return 'ok';}return 'exit';})()";
        web.evaluateJavascript(js, value -> {
            if (value != null && value.contains("exit")) {
                long now = System.currentTimeMillis();
                if (now - lastBack < 2000) {
                    finish();
                } else {
                    lastBack = now;
                    Toast.makeText(this, R.string.press_back_again, Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        // ilovaga qaytilganda sahifa yangiliklarni tekshiradi (oxirgi tekshiruvdan 2 daqiqa o'tgan bo'lsa)
        web.evaluateJavascript("window.dispatchEvent(new Event('focus'))", null);
    }
}
