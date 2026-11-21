# Teduh for Android

One full-screen window (Android's own WebView) around the live site (https://juw12.github.io/teduh/). The page keeps
its data on the phone and opens offline after the first visit. `MainActivity.java` adds what a plain WebView
lacks: Share, saving a file to Downloads, picking a file, and links to other sites opening in the browser.
Because it loads the live site, every push to `main` reaches the installed app on its next start; only a change
to this folder needs a new .apk.

| File | What it is |
| --- | --- |
| `app.json` | name, package id, version (raise `versionCode` and `versionName` when this folder changes) |
| `AndroidManifest.xml`, `res/`, `assets/offline.html` | the app's manifest, icon and colours, the page shown when the first start has no connection |
| `src/.../MainActivity.java` | the whole program |
| `build.py` | builds and signs the .apk without Gradle: aapt2, javac, d8, zipalign, apksigner |

```
JAVA_HOME=<JDK 17> ANDROID_BUILD_TOOLS=<build-tools 34> ANDROID_JAR=<platform 34>/android.jar \
  python android/build.py --keystore teduh-release.p12 --password-file teduh-release-password.txt --alias teduh
```

The signing key is not in this repository (it is kept in the private `juw12/teduh-signing`). Without `--keystore`
the build signs with a throwaway key, which is enough to try the app on your own phone.
The published file is `Teduh-android.apk` in the [apps release](https://github.com/juw12/teduh/releases/tag/apps).

Checked on 2026-11-21: the .apk builds, is signed (APK signature v2 and v3) and its manifest reads back correctly;
the script the app runs inside the page (Share, saving files) was run against the site in Chrome. The .apk itself
has not been started on a phone or an emulator yet.
