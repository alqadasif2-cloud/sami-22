import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { POTENTIAL_ISSUES, IssueDetail } from '../data/fixData';

interface PotentialIssuesMatrixProps {
  lang: 'ar' | 'en';
}

export const PotentialIssuesMatrix: React.FC<PotentialIssuesMatrixProps> = ({ lang }) => {
  const [expandedId, setExpandedId] = useState<string | null>('issue-1');
  const isAr = lang === 'ar';

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const getSeverityBadge = (severity: IssueDetail['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            {isAr ? 'حرج (الخطأ الحالي)' : 'Critical (Current Error)'}
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {isAr ? 'عالي الخطورة (محتمل جداً)' : 'High Risk (Likely Next)'}
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            {isAr ? 'متوسط (استقرار البناء والأداء)' : 'Medium (Reliability)'}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'المشاكل المحتمل ظهورها على GitHub Actions وكيف قمنا بإصلاحها مسبقاً' : 'Potential GitHub Actions Issues & Proactive Fixes'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAr
              ? 'بناءً على طلبك ("واصلح المشاكل التي قد تظهر على actions")، قمنا بفحص المستودع وحصر كافة النقاط التي قد تفشل بعد حل الخطأ الأول وتحصينها بالكامل.'
              : 'Per your request to fix future issues, we audited the pipeline and hardened every point of potential failure.'}
          </p>
        </div>

        <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>{isAr ? '6 مشاكل تم حلها وتحصينها' : '6 Issues Anticipated & Fixed'}</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {POTENTIAL_ISSUES.map((issue) => {
          const isExpanded = expandedId === issue.id;

          return (
            <div
              key={issue.id}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? 'bg-slate-950/90 border-slate-700 shadow-md'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <button
                onClick={() => toggleExpand(issue.id)}
                className="w-full p-4 flex items-center justify-between text-right cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-white">
                    {isAr ? issue.titleAr : issue.titleEn}
                  </div>
                  {getSeverityBadge(issue.severity)}
                </div>

                <div className="text-slate-400">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-400 block mb-1">
                      {isAr ? 'وصف المشكلة وسبب حدوثها:' : 'Issue Description & Cause:'}
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      {isAr ? issue.descriptionAr : issue.descriptionEn}
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg">
                    <span className="font-semibold text-emerald-400 block mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isAr ? 'الحل المطبّق في الـ Workflow الجديد:' : 'Applied Solution in New Workflow:'}
                    </span>
                    <p className="text-slate-200 leading-relaxed">
                      {isAr ? issue.solutionAr : issue.solutionEn}
                    </p>
                  </div>

                  {issue.codeSnippet && (
                    <div>
                      <span className="font-semibold text-slate-400 block mb-1">
                        {isAr ? 'الكود المعتمد في الإصلاح:' : 'Fix Code Snippet:'}
                      </span>
                      <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-teal-300 overflow-x-auto leading-relaxed">
                        {issue.codeSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
