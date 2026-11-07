import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Smartphone, 
  Package, 
  Check, 
  ExternalLink, 
  Sparkles, 
  FileCode, 
  Terminal,
  Layers,
  ShieldCheck,
  QrCode,
  Copy,
  Github
} from 'lucide-react';
import { downloadFile } from '../utils/exporters';

interface ApkBundleModalProps {
  onClose: () => void;
}

export const ApkBundleModal: React.FC<ApkBundleModalProps> = ({ onClose }) => {
  const [canInstallPWA, setCanInstallPWA] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPackaging, setIsPackaging] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    if (navigator.clipboard && currentUrl) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPWA(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstallPWA(false);
      }
      setDeferredPrompt(null);
    } else {
      alert('To test directly on your mobile device:\n1. Open this app in Chrome or Android Browser.\n2. Tap the browser menu (⋮).\n3. Tap "Install App" or "Add to Home Screen".');
    }
  };

  // Generate downloadable Android testing package bundle
  const handleDownloadBundle = () => {
    setIsPackaging(true);

    const androidManifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.spriteforge.studio">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="SpriteForge Studio"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

    const capacitorConfigJson = JSON.stringify({
      appId: "com.spriteforge.studio",
      appName: "SpriteForge Studio",
      webDir: "dist",
      bundledWebRuntime: false,
      plugins: {
        SplashScreen: {
          launchShowDuration: 1000,
          backgroundColor: "#090d16"
        }
      }
    }, null, 2);

    const gradleBuildScript = `// Top-level build file for SpriteForge Android Test Package
apply plugin: 'com.android.application'

android {
    namespace "com.spriteforge.studio"
    compileSdk 34

    defaultConfig {
        applicationId "com.spriteforge.studio"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0-mobile-test"
    }

    buildTypes {
        debug {
            applicationIdSuffix ".debug"
            debuggable true
        }
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt')
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.webkit:webkit:1.10.0'
}`;

    const readmeInstructions = `# SpriteForge Mobile Test & APK Bundle

This bundle contains all configs and manifests to test and build SpriteForge as a native Android APK:

## Option 1: Instant WebAPK Testing (Fastest)
1. Open this app's URL on your Android device (Google Chrome).
2. Tap the Chrome menu (three dots at top right).
3. Select "Install App" or "Add to Home screen".
Android creates a standalone native WebAPK on your device with hardware acceleration, fullscreen canvas, and offline persistence.

## Option 2: Build Native APK with Android Studio / Capacitor
1. Extract this bundle into your project folder.
2. Run:
   npx cap add android
   npx cap copy android
   npx cap open android
3. In Android Studio, click "Build" -> "Build APK(s)" -> "Build Debug APK".
4. Transfer the generated "app-debug.apk" to your phone and install!
`;

    // Download bundle text files
    downloadFile(readmeInstructions, 'README_ANDROID_TESTING.txt', 'text/plain');
    setTimeout(() => {
      downloadFile(androidManifestXml, 'AndroidManifest.xml', 'text/xml');
    }, 300);
    setTimeout(() => {
      downloadFile(capacitorConfigJson, 'capacitor.config.json', 'application/json');
    }, 600);
    setTimeout(() => {
      downloadFile(gradleBuildScript, 'build.gradle', 'text/plain');
      setIsPackaging(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mobile Testing & APK Bundle</h2>
              <p className="text-xs text-slate-400">Test directly on Android devices</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Quick Connect: QR Code & Direct Link */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-lg flex-shrink-0">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(currentUrl)}`}
                alt="Scan to open on Android phone"
                className="w-28 h-28 object-contain"
              />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-2 w-full">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-white">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Scan with your Android Camera</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Scan this QR code with your phone camera or Google Lens to instantly open the app in Google Chrome.
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-300 flex-1 truncate select-all"
                />
                <button
                  onClick={handleCopyLink}
                  title="Copy App URL"
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    copiedLink
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Option 1: Direct Android 1-Tap App Install (WebAPK - No PC) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-lg shadow-emerald-950/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Method 1: Direct WebAPK (No PC Needed)</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                Built into Android
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Google Play Services on your phone automatically compiles and installs a real native <strong className="text-emerald-400">.apk (WebAPK)</strong> with full hardware acceleration, standalone fullscreen UI, and app icon:
            </p>
            <div className="space-y-2 text-xs text-slate-300 mb-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <span>Open this link in <strong>Google Chrome</strong> on your phone.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <span>Tap Chrome's top-right menu (<strong>⋮</strong> three dots).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <span>Tap <strong className="text-emerald-400">"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
              </div>
            </div>
            <button
              onClick={handleInstallApp}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
            >
              <Smartphone className="w-4 h-4 text-slate-950" />
              <span>{canInstallPWA ? 'Install Android App Now' : 'Tap to Trigger Install Prompt'}</span>
            </button>
          </div>

          {/* Option 2: Cloud APK Builder (PWABuilder - Zero PC) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Method 2: Cloud APK Builder (PWABuilder)</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                100% Free Cloud
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Generate and download a standalone <strong className="text-indigo-300">.apk</strong> or Google Play package in the cloud directly from your phone browser without touching a computer:
            </p>
            <a
              href={`https://www.pwabuilder.com/?url=${encodeURIComponent(currentUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Cloud APK Builder in Phone Browser</span>
            </a>
          </div>

          {/* Option 3: GitHub Actions Cloud APK Builder (Zero PC) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Github className="w-4 h-4 text-purple-400" />
                <span>Method 3: Build in GitHub (Cloud Actions)</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                Automated Cloud CI
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-2 leading-relaxed">
              We added a ready-to-run <code className="text-purple-300">.github/workflows/build-apk.yml</code> workflow. GitHub builds the Android APK in the cloud for free without needing a PC:
            </p>
            <div className="space-y-1.5 text-xs text-slate-300 mb-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-500 text-slate-950 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <span>Push this code to your <strong>GitHub</strong> account repository.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-500 text-slate-950 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <span>GitHub Actions automatically detects the workflow and compiles the APK.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-500 text-slate-950 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <span>Under the <strong>Actions</strong> tab on your phone, download <strong className="text-purple-300">app-debug.apk</strong>!</span>
              </div>
            </div>
            <a
              href="https://github.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
            >
              <Github className="w-4 h-4" />
              <span>Create New Repo on GitHub (Mobile or Desktop)</span>
            </a>
          </div>

          {/* Option 4: Download Developer Config Bundle */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-slate-400" />
                <span>Method 4: Download Gradle & Config Bundle</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
              Downloads <code className="text-slate-300">AndroidManifest.xml</code>, <code className="text-slate-300">build.gradle</code>, <code className="text-slate-300">capacitor.config.json</code>, and instructions.
            </p>
            <button
              disabled={isPackaging}
              onClick={handleDownloadBundle}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isPackaging ? 'Packaging...' : downloadSuccess ? 'Bundle Downloaded!' : 'Download Config Files'}</span>
            </button>
          </div>

          {/* Android Capability Badges */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>100% Offline Ready</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>Hardware Accelerated</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
