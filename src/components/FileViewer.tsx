import React, { useState } from 'react';
import { FileCode, Copy, Check, Download, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { ROOT_GRADLE_PROPERTIES, ENHANCED_WORKFLOW, BASH_FIX_SCRIPT } from '../data/fixData';
import { downloadTextFile } from '../utils/zipGenerator';

interface FileViewerProps {
  lang: 'ar' | 'en';
}

export const FileViewer: React.FC<FileViewerProps> = ({ lang }) => {
  const [activeFile, setActiveFile] = useState<'gradle.properties' | 'workflow' | 'script'>('gradle.properties');
  const [copied, setCopied] = useState(false);

  const isAr = lang === 'ar';

  const getActiveContent = () => {
    switch (activeFile) {
      case 'gradle.properties':
        return {
          filename: 'gradle.properties',
          targetPath: '/gradle.properties (في مجلد المشروع الرئيسي)',
          description: isAr
            ? 'الملف المسؤول عن تفعيل مكتبات AndroidX وضبط حجم ذاكرة ديمون Gradle.'
            : 'Enables AndroidX support and allocates sufficient RAM for the Gradle daemon.',
          content: ROOT_GRADLE_PROPERTIES,
        };
      case 'workflow':
        return {
          filename: 'build-apk.yml',
          targetPath: '/.github/workflows/build-apk.yml',
          description: isAr
            ? 'مسار عمل GitHub Actions المحصّن: يحتوي على توليد Gradle Wrapper تلقائياً، وتمرير وسائط AndroidX CLI كحماية دائمة، وترتيب نقل أصول Vite بشكل سليم، واكتشاف ديناميكي لملف الـ APK.'
            : 'Hardened GitHub Actions workflow: includes auto-generation of wrapper, AndroidX CLI fallbacks, optimized Vite asset syncing, and resilient APK upload.',
          content: ENHANCED_WORKFLOW,
        };
      case 'script':
        return {
          filename: 'apply_fix.sh',
          targetPath: '/apply_fix.sh',
          description: isAr
            ? 'سكربت شل تفاعلي لتطبيق كافة التعديلات دفعة واحدة بضغطة زر وتجهيز أوامر Git.'
            : 'Interactive shell script to create and update all required files automatically.',
          content: BASH_FIX_SCRIPT,
        };
    }
  };

  const fileData = getActiveContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(fileData.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    downloadTextFile(fileData.content, fileData.filename);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-teal-400" />
            <span>{isAr ? 'مستعرض ملفات الإصلاح المحسّنة' : 'Enhanced Fix Files Viewer'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAr
              ? 'تصفح محتوى الملفات الجاهزة واستعرض التعديلات أو قم بتحميلها مباشرة.'
              : 'Inspect, copy, or download the optimized configuration files.'}
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveFile('gradle.properties')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFile === 'gradle.properties'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>gradle.properties</span>
            <span className="px-1.5 py-0.2 bg-teal-900/80 text-[10px] rounded text-teal-200">
              {isAr ? 'أساسي' : 'Root'}
            </span>
          </button>

          <button
            onClick={() => setActiveFile('workflow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFile === 'workflow'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>build-apk.yml</span>
            <span className="px-1.5 py-0.2 bg-teal-900/80 text-[10px] rounded text-teal-200">
              {isAr ? 'محصّن' : 'Hardened'}
            </span>
          </button>

          <button
            onClick={() => setActiveFile('script')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFile === 'script'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>apply_fix.sh</span>
            <span className="px-1.5 py-0.2 bg-teal-900/80 text-[10px] rounded text-teal-200">
              {isAr ? 'سكربت' : 'Script'}
            </span>
          </button>
        </div>
      </div>

      {/* File info bar */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
        <div>
          <span className="text-slate-400 font-medium">{isAr ? 'المسار المستهدف في المستودع: ' : 'Target Path: '}</span>
          <span className="text-emerald-400 font-mono font-bold">{fileData.targetPath}</span>
          <p className="text-slate-400 text-[11px] mt-0.5">{fileData.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{isAr ? 'تم النسخ!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>{isAr ? 'نسخ الملف' : 'Copy'}</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 text-xs font-medium flex items-center gap-1.5 transition-all border border-teal-500/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تحميل الملف' : 'Download'}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="mt-3 relative">
        <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 overflow-x-auto max-h-[420px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
          {fileData.content}
        </pre>
      </div>
    </div>
  );
};
