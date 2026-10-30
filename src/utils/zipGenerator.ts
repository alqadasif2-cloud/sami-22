import JSZip from 'jszip';
import { ROOT_GRADLE_PROPERTIES, ENHANCED_WORKFLOW, BASH_FIX_SCRIPT } from '../data/fixData';

export async function generateFixZip(): Promise<Blob> {
  const zip = new JSZip();

  // 1. Root gradle.properties
  zip.file('gradle.properties', ROOT_GRADLE_PROPERTIES);

  // 2. app/gradle.properties
  zip.file('app/gradle.properties', ROOT_GRADLE_PROPERTIES);

  // 3. .github/workflows/build-apk.yml
  zip.file('.github/workflows/build-apk.yml', ENHANCED_WORKFLOW);

  // 4. Bash quick-fix script
  zip.file('apply_fix.sh', BASH_FIX_SCRIPT);

  // 5. Readme instructions
  const readmeContent = `# دليل إصلاح مشكلة GitHub Actions لتطبيق Sami 13 APK
مستودع: https://github.com/alqadasif2-cloud/Sami-13.git

## 1. سبب الخطأ الرئيسي:
الخطأ:
Execution failed for task ':app:mergeReleaseNativeLibs'.
> Configuration ':app:releaseRuntimeClasspath' contains AndroidX dependencies, but the 'android.useAndroidX' property is not enabled...

السبب:
أداة Gradle تبحث عن ملف gradle.properties في المجلد الرئيسي (Root) للمستودع فقط.
في المستودع الحالي، كان الملف موجوداً فقط داخل app/gradle.properties وتم تجاهله، مما جعل خاصية android.useAndroidX غير مفعّلة (false).

## 2. كيفية تطبيق الإصلاح:
انسخ الملفات الموجودة في هذا الأرشيف إلى مستودع المشروع بنفس مساراتها:
- ضع gradle.properties في المجلد الرئيسي للمستودع.
- استبدل .github/workflows/build-apk.yml بالنسخة المحسّنة.

ثم نفّذ الأوامر التالية في سطر الأوامر (Terminal):
\`\`\`bash
git add gradle.properties app/gradle.properties .github/workflows/build-apk.yml
git commit -m "fix(ci): add root gradle.properties for AndroidX & harden GitHub Actions workflow"
git push origin main
\`\`\`

## 3. التحسينات المضافة للحماية من أي أخطاء قادمة:
1. توليد تلقائي للـ Gradle Wrapper في حال فقدان ملف gradle-wrapper.jar.
2. تمرير -Pandroid.useAndroidX=true مباشرة في أمر البناء كحماية دائمة.
3. معالجة تراخيص Android SDK تلقائياً.
4. ترتيب مزامنة ملفات الويب لمنع الكتابة فوق حزم Vite.
5. اكتشاف مرن لمكان ملف APK الناتج بعد البناء.
`;

  zip.file('README_FIX.md', readmeContent);

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}
