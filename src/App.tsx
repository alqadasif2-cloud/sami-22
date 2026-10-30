/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import { ErrorRootCauseCard } from './components/ErrorRootCauseCard';
import { QuickFixCommands } from './components/QuickFixCommands';
import { FileViewer } from './components/FileViewer';
import { PotentialIssuesMatrix } from './components/PotentialIssuesMatrix';
import { CiPipelineSimulator } from './components/CiPipelineSimulator';
import { 
  Zap, 
  FileCode, 
  ShieldCheck, 
  Terminal, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles,
  Smartphone,
  Monitor,
  RotateCw,
  Maximize2,
  Minimize2,
  Info,
  Wrench,
  KeyRound,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { generateFixZip, downloadBlob } from './utils/zipGenerator';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [mainView, setMainView] = useState<'preview' | 'fix_center'>('preview');
  const [fixSubTab, setFixSubTab] = useState<'overview' | 'files' | 'future_issues' | 'simulator'>('overview');
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('mobile');
  const [downloading, setDownloading] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);
  const [showCredentialsHint, setShowCredentialsHint] = useState(true);

  const isAr = lang === 'ar';
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  const handleDownloadZip = async () => {
    try {
      setDownloading(true);
      const zipBlob = await generateFixZip();
      downloadBlob(zipBlob, 'sami-20-GitHub-Actions-Fix.zip');
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const reloadIframe = () => {
    setIframeKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <Header 
        lang={lang} 
        setLang={setLang} 
        onOpenQuickFix={() => {
          setMainView('fix_center');
          setFixSubTab('overview');
        }} 
      />

      {/* Main Mode Switcher Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-2.5 sticky top-[69px] z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Main Tabs: Live Preview vs Fix Center */}
          <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setMainView('preview')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                mainView === 'preview'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>{isAr ? 'معاينة تطبيق سامي المباشر (Sami App)' : 'Live Sami App Preview'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            </button>

            <button
              onClick={() => setMainView('fix_center')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                mainView === 'fix_center'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wrench className="w-4 h-4 text-emerald-300" />
              <span>{isAr ? 'مركز إصلاح بناء APK و GitHub Actions' : 'GitHub Actions & APK Fix Center'}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                {isAr ? 'جاهز' : 'Ready'}
              </span>
            </button>
          </div>

          {/* Quick Toolbar for Current Mode */}
          {mainView === 'preview' ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <button
                  onClick={() => setDeviceMode('mobile')}
                  className={`p-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    deviceMode === 'mobile'
                      ? 'bg-slate-800 text-amber-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={isAr ? 'عرض هاتف محمول' : 'Mobile view'}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline font-semibold text-[11px]">{isAr ? 'شاشة هاتف' : 'Mobile'}</span>
                </button>
                <button
                  onClick={() => setDeviceMode('desktop')}
                  className={`p-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    deviceMode === 'desktop'
                      ? 'bg-slate-800 text-amber-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={isAr ? 'عرض كامل للشاشة' : 'Desktop view'}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline font-semibold text-[11px]">{isAr ? 'شاشة كاملة' : 'Desktop'}</span>
                </button>
              </div>

              <button
                onClick={reloadIframe}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-all cursor-pointer"
                title={isAr ? 'إعادة تحميل التطبيق' : 'Reload App'}
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setMainView('fix_center');
                  setFixSubTab('overview');
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span className="hidden md:inline">{isAr ? 'أوامر حل خطأ AndroidX' : 'View AndroidX Fix'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setFixSubTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  fixSubTab === 'overview'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {isAr ? 'التشخيص والحل' : 'Diagnosis & Fix'}
              </button>
              <button
                onClick={() => setFixSubTab('files')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  fixSubTab === 'files'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {isAr ? 'ملفات الإصلاح' : 'Fix Files'}
              </button>
              <button
                onClick={() => setFixSubTab('future_issues')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  fixSubTab === 'future_issues'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {isAr ? 'المشاكل المحتملة (6)' : 'Future Issues (6)'}
              </button>
              <button
                onClick={() => setFixSubTab('simulator')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  fixSubTab === 'simulator'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {isAr ? 'محاكي البناء' : 'Simulator'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: LIVE SAMI APP PREVIEW */}
      {mainView === 'preview' ? (
        <div className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 w-full relative">
          {/* Quick Notice Banner */}
          {showCredentialsHint && (
            <div className="w-full max-w-4xl mb-4 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isAr 
                    ? 'تطبيق سامي (Sami Trading Challenge & Chat) يعمل بكامل ميزاته التفاعلية، 150 محطة تداول، والقنوات المباشرة.'
                    : 'Sami Trading Challenge & Chat app running live with full interactivity, 150 trading stations, and channels.'}
                </span>
              </div>
              <button
                onClick={() => setShowCredentialsHint(false)}
                className="text-amber-400 hover:text-amber-300 font-bold px-2 py-0.5 rounded cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Device Frame or Full Width Container */}
          <div 
            className={`w-full transition-all duration-300 flex justify-center items-center ${
              deviceMode === 'mobile'
                ? 'max-w-[420px] h-[820px] rounded-[42px] p-3.5 bg-gradient-to-b from-slate-800 via-slate-900 to-black border-4 border-slate-700 shadow-2xl shadow-black relative'
                : 'max-w-7xl h-[860px] rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl'
            }`}
          >
            {/* Mobile Top Notch / Speaker (Mobile mode only) */}
            {deviceMode === 'mobile' && (
              <>
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-20 flex items-center justify-center">
                  <div className="w-12 h-1 bg-slate-800 rounded-full" />
                </div>
              </>
            )}

            {/* Embedded Live Sami App Frame */}
            <div className="w-full h-full rounded-[32px] overflow-hidden bg-slate-950 relative shadow-inner">
              <iframe
                key={iframeKey}
                src="/sami.html"
                title="Sami Trading Challenge App"
                className="w-full h-full border-0 select-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>

            {/* Mobile Home Indicator bar */}
            {deviceMode === 'mobile' && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-600/60 rounded-full pointer-events-none" />
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: GITHUB ACTIONS CI/CD FIX CENTER */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
          {fixSubTab === 'overview' && (
            <div className="space-y-8">
              {/* Error & Root Cause Card */}
              <ErrorRootCauseCard lang={lang} />

              {/* Quick Fix Commands */}
              <QuickFixCommands lang={lang} />

              {/* Perks Grid */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-400" />
                    <span>{isAr ? 'التحصينات الشاملة المضافة لمسار البناء' : 'Hardened Fix Protections'}</span>
                  </h3>
                  <button
                    onClick={() => setFixSubTab('future_issues')}
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isAr ? 'عرض تفاصيل المشاكل الـ 6' : 'View all 6 issues'}</span>
                    <Arrow className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-emerald-400 font-bold text-xs mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'تفعيل AndroidX في ملف الجذر' : 'Root AndroidX Enabled'}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {isAr
                        ? 'إنشاء gradle.properties في المجلد الرئيسي لتمكين دمج مكتبات C++/JNI بسلاسة.'
                        : 'Creates gradle.properties in root to allow seamless merging of native and compose libraries.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-emerald-400 font-bold text-xs mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'توليد تلقائي للـ Gradle Wrapper' : 'Auto Wrapper Generation'}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {isAr
                        ? 'حماية خطوة البناء في حال غياب ملف gradle-wrapper.jar من Git.'
                        : 'Guarantees ./gradlew works even if gradle-wrapper.jar was not committed to git.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-emerald-400 font-bold text-xs mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'تمرير وسائط CLI كحماية دائمة' : 'CLI Flag Safeguards'}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {isAr
                        ? 'تمرير -Pandroid.useAndroidX=true مباشرة في أمر البناء لضمان عدم توقفه أبداً.'
                        : 'Passes -P flags directly in CLI so it will never fail even if gradle.properties is touched.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-emerald-400 font-bold text-xs mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'ترتيب سليم لنسخ ملفات الويب' : 'Correct Asset Sync Order'}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {isAr
                        ? 'نسخ public أولاً ثم تغطيته بـ dist لضمان إدراج أحدث ملفات Vite داخل الـ APK.'
                        : 'Ensures compiled Vite dist overrides static public assets without conflicts.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-emerald-400 font-bold text-xs mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'اكتشاف مرن لمكان الـ APK' : 'Dynamic APK Locator'}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {isAr
                        ? 'البحث التلقائي عن أي ملف APK تم إنتاجه ورفعه كـ Artifact موحد وثابت.'
                        : 'Dynamically locates release APK regardless of signing name and uploads artifact.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-emerald-400 font-bold text-xs mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'إدارة الذاكرة ومنع OOM Killer' : 'RAM Tuning & No Daemon'}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {isAr
                        ? 'تحديد 3 جيجابايت لديمون Gradle مع علم --no-daemon لمنع استهلاك ذاكرة Runner.'
                        : 'Configures -Xmx3072m with --no-daemon to avoid runner memory crashes.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {fixSubTab === 'files' && (
            <div className="space-y-6">
              <FileViewer lang={lang} />
            </div>
          )}

          {fixSubTab === 'future_issues' && (
            <div className="space-y-6">
              <PotentialIssuesMatrix lang={lang} />
            </div>
          )}

          {fixSubTab === 'simulator' && (
            <div className="space-y-6">
              <CiPipelineSimulator lang={lang} />
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            <span>{isAr ? 'تطبيق سامي (Sami Trading Tracker) • رحلة الـ 150 محطة تداول' : 'Sami Trading Tracker • 150-Station Trading Challenge'}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMainView('preview')}
              className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
            >
              {isAr ? 'عرض التطبيق' : 'View App'}
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setMainView('fix_center');
                setFixSubTab('overview');
              }}
              className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
            >
              {isAr ? 'حل GitHub Actions' : 'Actions Fix'}
            </button>
            <span>•</span>
            <a 
              href="https://github.com/alqadasif2-cloud/sami-20" 
              target="_blank" 
              rel="noreferrer"
              className="text-slate-300 hover:text-white flex items-center gap-1 font-mono"
            >
              <span>alqadasif2-cloud/sami-20</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
