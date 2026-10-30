import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, CheckCircle2, XCircle, Loader2, Download, Terminal, Layers } from 'lucide-react';

interface CiPipelineSimulatorProps {
  lang: 'ar' | 'en';
}

interface Step {
  id: number;
  nameAr: string;
  nameEn: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  log: string;
}

export const CiPipelineSimulator: React.FC<CiPipelineSimulatorProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [mode, setMode] = useState<'fixed' | 'old'>('fixed');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(-1);
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);

  const defaultSteps: Step[] = [
    {
      id: 1,
      nameAr: 'استرجاع الكود (Checkout Code)',
      nameEn: 'Checkout Code',
      status: 'idle',
      log: 'Syncing repository alqadasif2-cloud/Sami-13 at commit main... Done.',
    },
    {
      id: 2,
      nameAr: 'تجهيز Node.js 20',
      nameEn: 'Setup Node.js 20',
      status: 'idle',
      log: 'Found in cache: node v20.18.0 with npm 10.8.2.',
    },
    {
      id: 3,
      nameAr: 'تثبيت حزم npm',
      nameEn: 'Install Node Dependencies',
      status: 'idle',
      log: 'npm install --legacy-peer-deps: added 182 packages in 4.2s.',
    },
    {
      id: 4,
      nameAr: 'بناء تطبيق الويب (Vite Build)',
      nameEn: 'Build Web Application',
      status: 'idle',
      log: 'vite v8.3.5: built in 127ms. dist/index.html & dist/assets created.',
    },
    {
      id: 5,
      nameAr: 'مزامنة ملفات الويب مع أصول أندرويد',
      nameEn: 'Sync Web Distribution to Android Assets',
      status: 'idle',
      log: 'Copied public/* and dist/* to app/src/main/assets/assets.',
    },
    {
      id: 6,
      nameAr: 'تجهيز Java 17 (Temurin JDK)',
      nameEn: 'Set up JDK 17',
      status: 'idle',
      log: 'Configured Eclipse Temurin 17.0.12+7.',
    },
    {
      id: 7,
      nameAr: 'قبول تراخيص Android SDK',
      nameEn: 'Accept Android SDK Licenses',
      status: 'idle',
      log: 'All SDK package licenses accepted automatically.',
    },
    {
      id: 8,
      nameAr: 'تجهيز أداة Gradle 8.6',
      nameEn: 'Setup Gradle 8.6',
      status: 'idle',
      log: 'Gradle 8.6 configured with wrapper verification.',
    },
    {
      id: 9,
      nameAr: 'التحقق من ملف gradle.properties الرئيسي',
      nameEn: 'Verify & Ensure Root gradle.properties',
      status: 'idle',
      log: mode === 'fixed' 
        ? 'Root gradle.properties found with android.useAndroidX=true.'
        : 'WARNING: No root gradle.properties found! (Present only in app/)',
    },
    {
      id: 10,
      nameAr: 'بناء Sami Release APK (:app:assembleRelease)',
      nameEn: 'Build Android Release APK',
      status: 'idle',
      log: mode === 'fixed'
        ? '> Task :app:mergeReleaseNativeLibs UP-TO-DATE\n> Task :app:assembleRelease SUCCESSFUL in 48s.'
        : '> Task :app:mergeReleaseNativeLibs FAILED\nExecution failed for task :app:mergeReleaseNativeLibs: android.useAndroidX property is not enabled!',
    },
    {
      id: 11,
      nameAr: 'فحص ملف APK ورفعه للأرشيف (Artifact)',
      nameEn: 'Verify APK & Upload Artifact',
      status: 'idle',
      log: mode === 'fixed'
        ? 'Found: Sami-Trading-Tracker-Release.apk (24.8 MB). Uploaded to GitHub Artifacts.'
        : 'Step skipped due to previous failure.',
    },
  ];

  const [steps, setSteps] = useState<Step[]>(defaultSteps);

  useEffect(() => {
    resetSimulation();
  }, [mode]);

  const resetSimulation = () => {
    setIsRunning(false);
    setCurrentStepIdx(-1);
    setSimulatedLogs([]);
    setSteps(
      defaultSteps.map(s => ({
        ...s,
        status: 'idle',
      }))
    );
  };

  const runSimulation = () => {
    resetSimulation();
    setIsRunning(true);
    setCurrentStepIdx(0);
    setSimulatedLogs([`>>> Starting GitHub Actions workflow simulation [${mode === 'fixed' ? 'FIXED WORKFLOW' : 'ORIGINAL BUGGED WORKFLOW'}]...`]);
  };

  useEffect(() => {
    if (!isRunning || currentStepIdx < 0) return;

    if (currentStepIdx >= steps.length) {
      setIsRunning(false);
      return;
    }

    // Step 10 in 'old' mode fails
    if (mode === 'old' && currentStepIdx === 9) {
      setSteps(prev =>
        prev.map((step, idx) =>
          idx === currentStepIdx
            ? { ...step, status: 'failed' }
            : idx > currentStepIdx
            ? { ...step, status: 'idle' }
            : step
        )
      );
      setSimulatedLogs(prev => [
        ...prev,
        `[Step 10] FAILED: Execution failed for task ':app:mergeReleaseNativeLibs'.`,
        `> Configuration ':app:releaseRuntimeClasspath' contains AndroidX dependencies, but the 'android.useAndroidX' property is not enabled.`,
        `>>> Workflow run failed with exit code 1.`,
      ]);
      setIsRunning(false);
      return;
    }

    // Mark current step as running
    setSteps(prev =>
      prev.map((step, idx) =>
        idx === currentStepIdx ? { ...step, status: 'running' } : step
      )
    );

    const timer = setTimeout(() => {
      // Mark as success
      setSteps(prev =>
        prev.map((step, idx) =>
          idx === currentStepIdx ? { ...step, status: 'success' } : step
        )
      );
      setSimulatedLogs(prev => [...prev, `[Step ${currentStepIdx + 1}] ${steps[currentStepIdx].log}`]);

      // Move to next step
      if (currentStepIdx + 1 < steps.length) {
        setCurrentStepIdx(currentStepIdx + 1);
      } else {
        setIsRunning(false);
        setSimulatedLogs(prev => [
          ...prev,
          `>>> Workflow completed successfully! Release APK ready for download (Sami-Trading-Tracker-Release).`,
        ]);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [isRunning, currentStepIdx, mode]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <span>{isAr ? 'محاكي تشغيل GitHub Actions المباشر' : 'Live GitHub Actions CI/CD Simulator'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAr
              ? 'جرّب مقارنة البناء قبل الإصلاح وبعد الإصلاح لمشاهدة اختفاء الخطأ ونجاح استخراج الـ APK.'
              : 'Compare the build before and after applying the fix to see the resolution live.'}
          </p>
        </div>

        {/* Mode selector & Run button */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-slate-950 border border-slate-800 rounded-xl flex text-xs">
            <button
              onClick={() => setMode('fixed')}
              disabled={isRunning}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'fixed'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'المسار بعد الإصلاح (Fixed)' : 'Fixed Workflow'}
            </button>
            <button
              onClick={() => setMode('old')}
              disabled={isRunning}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'old'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'المسار القديم المتعطل (Old)' : 'Original Bugged'}
            </button>
          </div>

          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isAr ? 'جاري المحاكاة...' : 'Simulating...'}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isAr ? 'تشغيل المحاكاة' : 'Run Simulation'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Steps List */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`flex items-center justify-between p-2.5 rounded-xl text-xs border transition-all ${
                step.status === 'running'
                  ? 'bg-indigo-950/40 border-indigo-500/50 shadow'
                  : step.status === 'success'
                  ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-200'
                  : step.status === 'failed'
                  ? 'bg-red-950/40 border-red-500/50 text-red-200'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-[10px]">
                  {step.id}
                </span>
                <span className="font-medium text-white">
                  {isAr ? step.nameAr : step.nameEn}
                </span>
              </div>

              <div>
                {step.status === 'running' && (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                )}
                {step.status === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                {step.status === 'failed' && (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                {step.status === 'idle' && (
                  <span className="text-[11px] text-slate-500 font-mono">queued</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Live Terminal Output */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              runner@github-actions-ubuntu-latest: ~
            </span>
            <span>bash</span>
          </div>

          <div className="py-2 space-y-1.5 overflow-y-auto max-h-[360px] text-slate-300">
            {simulatedLogs.length === 0 ? (
              <div className="text-slate-600 text-center py-16">
                {isAr
                  ? 'اضغط على زر "تشغيل المحاكاة" لبدء فحص الخطوات ومتابعة السجلات.'
                  : 'Click "Run Simulation" to start inspecting the pipeline logs.'}
              </div>
            ) : (
              simulatedLogs.map((log, index) => (
                <div
                  key={index}
                  className={`leading-relaxed ${
                    log.includes('FAILED') || log.includes('exit code 1')
                      ? 'text-red-400 font-bold bg-red-950/20 p-1 rounded'
                      : log.includes('SUCCESS') || log.includes('Sami-Trading-Tracker-Release')
                      ? 'text-emerald-300 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>

          {mode === 'fixed' && currentStepIdx >= steps.length && (
            <div className="mt-2 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
              <span>🎉 Sami-Trading-Tracker-Release.apk (24.8 MB)</span>
              <span className="text-[10px] bg-emerald-800 px-2 py-0.5 rounded text-white font-sans">
                {isAr ? 'جاهز للتحميل' : 'Ready'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
