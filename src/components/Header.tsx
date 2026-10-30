import React from 'react';
import { 
  GitBranch, 
  ExternalLink, 
  Download, 
  CheckCircle2, 
  Languages, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';
import { generateFixZip, downloadBlob } from '../utils/zipGenerator';

interface HeaderProps {
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  onOpenQuickFix: () => void;
}

export const Header: React.FC<HeaderProps> = ({ lang, setLang, onOpenQuickFix }) => {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownloadZip = async () => {
    try {
      setDownloading(true);
      const zipBlob = await generateFixZip();
      downloadBlob(zipBlob, 'Sami-13-GitHub-Actions-Fix.zip');
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const isAr = lang === 'ar';

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Branding & Repo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-xl">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                {isAr ? 'مركز إصلاح وبناء تطبيق سامي 13 APK' : 'Sami 13 APK CI/CD Fix Center'}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 ml-1" />
                {isAr ? 'تم تشخيص وحل المشكلة' : 'Issue Resolved'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              <a 
                href="https://github.com/alqadasif2-cloud/Sami-13" 
                target="_blank" 
                rel="noreferrer"
                className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1 font-mono"
              >
                alqadasif2-cloud/Sami-13
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Gradle 8.6 & AGP 8.4.2</span>
            </div>
          </div>
        </div>

        {/* Right: Actions & Language */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-medium transition-all"
            title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <Languages className="w-3.5 h-3.5 text-teal-400" />
            <span>{isAr ? 'English' : 'عربي'}</span>
          </button>

          <button
            onClick={onOpenQuickFix}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isAr ? 'أوامر الحل السريع' : 'Quick Fix Commands'}</span>
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? (isAr ? 'جاري التحضير...' : 'Packaging...') : (isAr ? 'تحميل حزمة الملفات (ZIP)' : 'Download Fix Bundle')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
