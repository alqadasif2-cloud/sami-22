import React, { useState } from 'react';
import { Terminal, Copy, Check, Globe, FileCode, CheckCircle2, ExternalLink } from 'lucide-react';
import { ROOT_GRADLE_PROPERTIES } from '../data/fixData';

interface QuickFixCommandsProps {
  lang: 'ar' | 'en';
}

export const QuickFixCommands: React.FC<QuickFixCommandsProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'github_web' | 'script'>('terminal');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const isAr = lang === 'ar';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const oneLinerBash = `# 1. إنشاء ملف gradle.properties في المجلد الرئيسي
cat << 'EOF' > gradle.properties
org.gradle.jvmargs=-Xmx3072m -Dfile.encoding=UTF-8 -XX:MaxMetaspaceSize=512m
android.useAndroidX=true
android.enableJetifier=true
android.nonTransitiveRClass=true
kotlin.code.style=official
EOF

# 2. عمل Commit ودفع التعديل إلى GitHub
git add gradle.properties
git commit -m "fix(ci): add root gradle.properties for AndroidX compatibility"
git push origin main`;

  const windowsPowerShell = `# في نافذة PowerShell داخل مجلد المشروع:
@"
org.gradle.jvmargs=-Xmx3072m -Dfile.encoding=UTF-8 -XX:MaxMetaspaceSize=512m
android.useAndroidX=true
android.enableJetifier=true
android.nonTransitiveRClass=true
kotlin.code.style=official
"@ | Out-File -FilePath gradle.properties -Encoding utf8

git add gradle.properties
git commit -m "fix(ci): add root gradle.properties for AndroidX"
git push origin main`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>{isAr ? 'طرق تطبيق الحل السريع (أختر الطريقة الأنسب لك)' : 'Quick Fix Methods (Choose Preferred)'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAr
              ? 'يمكنك حل المشكلة فوراً خلال أقل من دقيقة واحدة ودون الحاجة لتغيير كود التطبيق.'
              : 'Fix the build immediately in less than a minute without modifying your application code.'}
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'terminal'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'عبر سطر الأوامر (Git Bash / Linux)' : 'Terminal (Bash)'}
          </button>
          <button
            onClick={() => setActiveTab('github_web')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'github_web'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'مباشرة من موقع GitHub (بدون تثبيت أي شيء)' : 'GitHub Web UI'}
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'script'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'أمر PowerShell (ويندوز)' : 'Windows PowerShell'}
          </button>
        </div>
      </div>

      {/* Tab 1: Terminal */}
      {activeTab === 'terminal' && (
        <div className="mt-5 space-y-4">
          <p className="text-xs text-slate-300">
            {isAr
              ? 'افتح الـ Terminal أو Git Bash في مجلد المشروع ونفّذ الأمر التالي مباشرة. سيقوم بإنشاء الملف ورفعه لـ GitHub:'
              : 'Open your terminal inside the project root and run this one-liner. It will create the file and push to GitHub:'}
          </p>

          <div className="relative group">
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
              {oneLinerBash}
            </pre>
            <button
              onClick={() => copyToClipboard(oneLinerBash, 'bash')}
              className="absolute top-3 left-3 sm:left-auto sm:right-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              {copiedIndex === 'bash' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isAr ? 'نسخ الأمر بالكامل' : 'Copy Commands'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: GitHub Web UI */}
      {activeTab === 'github_web' && (
        <div className="mt-5 space-y-4">
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs text-slate-300 space-y-2.5">
            <div className="font-bold text-emerald-400 text-sm flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>{isAr ? 'خطوات تطبيق الحل مباشرة من المتصفح على GitHub:' : 'Step-by-step from your web browser:'}</span>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-slate-200 pr-2">
              <li>
                {isAr ? 'اضغط مباشرة على هذا الرابط لتعديل مسار البناء build-apk.yml في مستودعك: ' : 'Click this direct link to update build-apk.yml in your repo: '}
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href="https://github.com/alqadasif2-cloud/Sami-13/edit/main/.github/workflows/build-apk.yml"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تعديل build-apk.yml في مستودع Sami-13 مباشرة' : 'Edit build-apk.yml in Sami-13'}</span>
                  </a>
                  <a
                    href="https://github.com/alqadasif2-cloud/sami-12/edit/main/.github/workflows/build-apk.yml"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تعديل في sami-12' : 'Edit in sami-12'}</span>
                  </a>
                </div>
              </li>
              <li>
                {isAr ? 'في حال دخلت يدوياً: في خانة اسم الملف اكتب: ' : 'Or type filename manually: '}
                <code className="text-emerald-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono font-bold">gradle.properties</code>
              </li>
              <li>
                {isAr ? 'انسخ محتوى الكود في الأسفل وألصقه في مربع المحتوى.' : 'Copy the properties below and paste into the editor.'}
              </li>
              <li>
                {isAr ? 'اضغط زر ' : 'Click '}
                <strong className="text-emerald-400">Commit changes...</strong> {isAr ? 'ثم اضغط ' : 'then '} <strong className="text-emerald-400">Commit changes</strong>.
              </li>
              <li className="text-emerald-300">
                {isAr
                  ? 'سيبدأ GitHub Actions تلقائياً بالبناء وسينجح تماماً في استخراج ملف app-release.apk!'
                  : 'GitHub Actions will trigger automatically and build app-release.apk successfully!'}
              </li>
            </ol>
          </div>

          <div className="relative group">
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-teal-300 overflow-x-auto leading-relaxed">
              {ROOT_GRADLE_PROPERTIES}
            </pre>
            <button
              onClick={() => copyToClipboard(ROOT_GRADLE_PROPERTIES, 'web_props')}
              className="absolute top-3 left-3 sm:left-auto sm:right-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              {copiedIndex === 'web_props' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isAr ? 'نسخ محتوى gradle.properties' : 'Copy File Content'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Windows PowerShell */}
      {activeTab === 'script' && (
        <div className="mt-5 space-y-4">
          <p className="text-xs text-slate-300">
            {isAr
              ? 'لمستخدمي نظام ويندوز (Windows PowerShell)، افتح PowerShell في مجلد المشروع وألصق التالي:'
              : 'For Windows PowerShell users, paste the following command inside the project directory:'}
          </p>

          <div className="relative group">
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-sky-300 overflow-x-auto leading-relaxed">
              {windowsPowerShell}
            </pre>
            <button
              onClick={() => copyToClipboard(windowsPowerShell, 'powershell')}
              className="absolute top-3 left-3 sm:left-auto sm:right-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              {copiedIndex === 'powershell' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isAr ? 'نسخ أمر PowerShell' : 'Copy PowerShell'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
