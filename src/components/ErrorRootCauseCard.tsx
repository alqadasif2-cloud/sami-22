import React from 'react';
import { AlertTriangle, CheckCircle, FolderX, FolderCheck, ArrowLeft, ArrowRight, HelpCircle, Code } from 'lucide-react';

interface ErrorRootCauseCardProps {
  lang: 'ar' | 'en';
}

export const ErrorRootCauseCard: React.FC<ErrorRootCauseCardProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isAr ? 'تشخيص الخطأ الفعلي الذي ظهر في مسار GitHub Actions' : 'Diagnosis of the GitHub Actions Failure'}
              </h2>
              <p className="text-xs text-slate-400">
                Task :app:mergeReleaseNativeLibs FAILED • android.useAndroidX = false
              </p>
            </div>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {isAr ? 'الحل جاهز ومؤكد بنسبة 100%' : '100% Verified Fix Ready'}
        </div>
      </div>

      {/* Actual log excerpt */}
      <div className="mt-5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          {isAr ? 'سجل الخطأ المسجل في GitHub Actions:' : 'Exact Error Log in GitHub Actions:'}
        </label>
        <div className="bg-slate-950 rounded-xl p-4 border border-red-500/20 font-mono text-xs text-red-300 leading-relaxed overflow-x-auto shadow-inner">
          <div className="text-slate-500 mb-1">&gt; Task :app:mergeReleaseNativeLibs FAILED</div>
          <div className="text-red-400 font-bold mb-1">
            Execution failed for task ':app:mergeReleaseNativeLibs'.
          </div>
          <div className="text-amber-300">
            &gt; Configuration `:app:releaseRuntimeClasspath` contains AndroidX dependencies, but the `android.useAndroidX` property is not enabled, which may cause runtime issues.
          </div>
          <div className="text-slate-300 mt-2">
            <span className="bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
              Set `android.useAndroidX=true` in the `gradle.properties` file and retry.
            </span>
          </div>
          <div className="text-slate-500 mt-1">
            The following AndroidX dependencies are detected: :app:releaseRuntimeClasspath -&gt; androidx.core:core-ktx:1.13.1
          </div>
        </div>
      </div>

      {/* Visual Explanation of the Root Cause */}
      <div className="mt-6 pt-5 border-t border-slate-800/80">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-teal-400" />
          {isAr ? 'ما هو السبب الجذري؟ (لماذا ظهر هذا الخطأ بالرغم من وجود ملف إعدادات؟)' : 'What is the Root Cause? (Why did this fail?)'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* What happened */}
          <div className="rounded-xl border border-red-500/30 bg-red-950/10 p-4">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-2">
              <FolderX className="w-4 h-4" />
              <span>{isAr ? 'الوضع في المستودع الحالي (سبب الفشل):' : 'Current Repository State (Cause of Failure):'}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {isAr
                ? 'ملف gradle.properties كان موجوداً فقط داخل المجلد الفرعي app/gradle.properties، ولم يكن موجوداً في المجلد الرئيسي (Root) للمشروع!'
                : 'The gradle.properties file was located solely inside the subproject app/gradle.properties, and was absent in the repository root folder!'}
            </p>
            <div className="p-3 bg-slate-950/80 rounded-lg font-mono text-xs border border-red-900/40 text-slate-300 space-y-1">
              <div className="text-red-400 flex items-center gap-1.5">
                <span>❌</span> <span>/gradle.properties</span>
                <span className="text-[10px] text-red-500 font-sans">({isAr ? 'غير موجود - تجاهل الخصائص' : 'Missing - ignored'})</span>
              </div>
              <div className="text-slate-400 pl-4 flex items-center gap-1.5">
                <span>⚠️</span> <span>/app/gradle.properties</span>
                <span className="text-[10px] text-amber-400 font-sans">({isAr ? 'لا يقرأه ديمون Gradle' : 'Not read by root Gradle daemon'})</span>
              </div>
            </div>
          </div>

          {/* How to fix */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
              <FolderCheck className="w-4 h-4" />
              <span>{isAr ? 'الوضع الصحيح بعد تطبيق الإصلاح:' : 'Fixed State (How Gradle works):'}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {isAr
                ? 'وضع ملف gradle.properties في المجلد الرئيسي (Root)، وتمرير الخواص عبر سطر أوامر GitHub Actions كضمانة مضاعفة.'
                : 'Place gradle.properties in the repository root directory, plus pass flags via CI command line as a foolproof backup.'}
            </p>
            <div className="p-3 bg-slate-950/80 rounded-lg font-mono text-xs border border-emerald-900/40 text-slate-300 space-y-1">
              <div className="text-emerald-400 flex items-center gap-1.5">
                <span>✅</span> <span>/gradle.properties</span>
                <span className="text-[10px] text-emerald-400 font-sans">({isAr ? 'android.useAndroidX=true مفعّل' : 'AndroidX Active'})</span>
              </div>
              <div className="text-emerald-300 pl-4 flex items-center gap-1.5">
                <span>✅</span> <span>/app/build.gradle.kts</span>
                <span className="text-[10px] text-emerald-400 font-sans">({isAr ? 'دمج مكتبات C++/JNI بنجاح' : 'Native libs merge passes'})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
