export interface IssueDetail {
  id: string;
  titleAr: string;
  titleEn: string;
  severity: 'critical' | 'high' | 'medium';
  descriptionAr: string;
  descriptionEn: string;
  solutionAr: string;
  solutionEn: string;
  codeSnippet?: string;
}

export const ROOT_GRADLE_PROPERTIES = `# Project-wide Gradle settings.
# Required by Android Gradle Plugin (AGP) for AndroidX compatibility
org.gradle.jvmargs=-Xmx3072m -Dfile.encoding=UTF-8 -XX:MaxMetaspaceSize=512m
android.useAndroidX=true
android.enableJetifier=true
android.nonTransitiveRClass=true
kotlin.code.style=official
`;

export const ENHANCED_WORKFLOW = `name: Build and Release Sami APK

on:
  push:
    branches:
      - main
      - master
  pull_request:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    name: Build Web & Android Release APK
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      # 1. Checkout Source Code
      - name: Checkout Code
        uses: actions/checkout@v4

      # 2. Setup Node.js
      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20

      # 3. Install Node Dependencies
      - name: Install Node Dependencies
        run: |
          echo "Installing npm dependencies..."
          npm install --legacy-peer-deps

      # 4. Sync Pure Sami Assets to Android (Never overwrite with dev Fix Center dist/)
      - name: Sync Pure Sami Assets to Android
        run: |
          echo "Syncing pure Sami assets to app/src/main/assets..."
          mkdir -p app/src/main/assets/assets

          # Priority 1: If public/ folder exists, copy into Android assets
          if [ -d "public" ] && [ -f "public/index.html" ]; then
            echo "Copying assets from public/ folder..."
            cp -r public/* app/src/main/assets/
          # Priority 2: If app/src/main/assets/index.html is already committed, preserve it
          elif [ -f "app/src/main/assets/index.html" ]; then
            echo "Preserving existing committed assets in app/src/main/assets/..."
          # Priority 3: Fall back to sami.html or root index.html
          elif [ -f "sami.html" ]; then
            echo "Copying sami.html as Android assets entry..."
            cp sami.html app/src/main/assets/index.html
          elif [ -f "index.html" ]; then
            echo "Copying root index.html as Android assets entry..."
            cp index.html app/src/main/assets/index.html
          else
            echo "ERROR: Unable to locate any valid index.html for Android WebAssets!"
            exit 1
          fi

          if [ -d "public/assets" ]; then
            cp -r public/assets/* app/src/main/assets/assets/ 2>/dev/null || true
          fi

          if [ ! -d "public" ] || [ ! -f "public/index.html" ]; then
            mkdir -p public
            cp -r app/src/main/assets/* public/ 2>/dev/null || true
          fi

          rm -f app/src/main/assets/sami.html app/src/main/assets/*fix-center*
          find app/src/main/assets -name "*.bak" -delete 2>/dev/null || true

          if ! grep -q "<title>Sami" app/src/main/assets/index.html; then
            sed -i 's/<title>.*<\/title>/<title>Sami<\/title>/' app/src/main/assets/index.html
          fi

      # 6. Setup Java 17
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      # 7. Accept Android SDK Licenses & Setup
      - name: Accept Android SDK Licenses
        run: |
          mkdir -p "$ANDROID_HOME/licenses" || true
          for SDK_BIN in "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "$ANDROID_HOME/tools/bin/sdkmanager"; do
            if [ -x "$SDK_BIN" ]; then
              echo "Accepting licenses using $SDK_BIN"
              yes | "$SDK_BIN" --licenses || true
              break
            fi
          done

      # 8. Setup Gradle
      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v3
        with:
          gradle-version: 8.6

      # 9. Ensure Root gradle.properties exists (Fail-safe)
      - name: Verify & Ensure Root gradle.properties
        run: |
          if [ ! -f "gradle.properties" ]; then
            echo "Creating missing root gradle.properties..."
            cat << 'EOF' > gradle.properties
          org.gradle.jvmargs=-Xmx3072m -Dfile.encoding=UTF-8 -XX:MaxMetaspaceSize=512m
          android.useAndroidX=true
          android.enableJetifier=true
          android.nonTransitiveRClass=true
          kotlin.code.style=official
          EOF
          else
            echo "Root gradle.properties already exists. Checking for android.useAndroidX..."
            if ! grep -q "android.useAndroidX" gradle.properties; then
              echo "android.useAndroidX=true" >> gradle.properties
            fi
            if ! grep -q "android.enableJetifier" gradle.properties; then
              echo "android.enableJetifier=true" >> gradle.properties
            fi
          fi
          cat gradle.properties

      # 10. Build Android Release APK with Safe CLI Overrides
      - name: Build Android Release APK
        run: |
          # Ensure wrapper jar exists or generate wrapper
          if [ ! -f "./gradlew" ] || [ ! -f "./gradle/wrapper/gradle-wrapper.jar" ]; then
            echo "Wrapper missing or incomplete. Generating Gradle wrapper 8.6..."
            gradle wrapper --gradle-version 8.6
          fi
          chmod +x ./gradlew

          echo "========================================"
          echo "Building Sami Release APK"
          echo "========================================"
          # Pass -Pandroid.useAndroidX=true and -Pandroid.enableJetifier=true as CLI fallback
          ./gradlew :app:assembleRelease \\
            -Pandroid.useAndroidX=true \\
            -Pandroid.enableJetifier=true \\
            --stacktrace \\
            --no-daemon

          echo "========================================"
          echo "Checking Generated Release APK"
          echo "========================================"
          
          # Dynamic APK locator
          APK_FILE=$(find app/build/outputs/apk/release/ -type f -name "*.apk" | head -n 1)
          
          if [ -z "$APK_FILE" ] || [ ! -f "$APK_FILE" ]; then
            echo "ERROR: No release APK found in app/build/outputs/apk/release/"
            find app/build/outputs/apk/ -type f 2>/dev/null || true
            exit 1
          fi

          echo "Found Release APK at: $APK_FILE"
          ls -lh "$APK_FILE"
          
          # Standardize filename for easy download artifact
          mkdir -p build-artifacts
          cp "$APK_FILE" build-artifacts/Sami-Trading-Tracker-Release.apk
          sha256sum build-artifacts/Sami-Trading-Tracker-Release.apk

      # 11. Upload Release APK Artifact
      - name: Upload Release APK
        uses: actions/upload-artifact@v4
        with:
          name: Sami-Trading-Tracker-Release
          path: build-artifacts/Sami-Trading-Tracker-Release.apk
          if-no-files-found: error
          retention-days: 30

      # 12. Publish Build Summary
      - name: Publish Build Summary
        if: always()
        env:
          BUILD_STATUS: \${{ job.status }}
        run: |
          echo "## 🚀 Sami Android Release Build Report" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"
          if [ "$BUILD_STATUS" = "success" ]; then
            echo "### ✅ Build Status: SUCCESS" >> "$GITHUB_STEP_SUMMARY"
            echo "Release APK built, signed, and uploaded successfully." >> "$GITHUB_STEP_SUMMARY"
          else
            echo "### ❌ Build Status: FAILED" >> "$GITHUB_STEP_SUMMARY"
            echo "Please inspect the build logs above for troubleshooting." >> "$GITHUB_STEP_SUMMARY"
          fi
          echo "" >> "$GITHUB_STEP_SUMMARY"
          echo "- **Target**: Android Release APK" >> "$GITHUB_STEP_SUMMARY"
          echo "- **Artifact**: Sami-Trading-Tracker-Release.apk" >> "$GITHUB_STEP_SUMMARY"
          echo "- **AndroidX Enabled**: Yes (-Pandroid.useAndroidX=true)" >> "$GITHUB_STEP_SUMMARY"
          echo "- **Retention**: 30 days" >> "$GITHUB_STEP_SUMMARY"
`;

export const BASH_FIX_SCRIPT = `#!/bin/bash
# Sami 13 APK - GitHub Actions CI/CD Automatic Fix Script
# Repository: https://github.com/alqadasif2-cloud/Sami-13.git

set -e

echo "=================================================="
echo "Applying Sami Android APK GitHub Actions Fixes"
echo "=================================================="

# 1. Create / Update Root gradle.properties
echo "1. Creating root gradle.properties..."
cat << 'EOF' > gradle.properties
# Project-wide Gradle settings.
org.gradle.jvmargs=-Xmx3072m -Dfile.encoding=UTF-8 -XX:MaxMetaspaceSize=512m
android.useAndroidX=true
android.enableJetifier=true
android.nonTransitiveRClass=true
kotlin.code.style=official
EOF

# 2. Also ensure app/gradle.properties has android.useAndroidX
mkdir -p app
cat << 'EOF' > app/gradle.properties
# Subproject Gradle settings.
android.useAndroidX=true
android.enableJetifier=true
android.nonTransitiveRClass=true
EOF

# 3. Update GitHub Actions Workflow
echo "2. Updating .github/workflows/build-apk.yml..."
mkdir -p .github/workflows
cat << 'EOF' > .github/workflows/build-apk.yml
${ENHANCED_WORKFLOW}
EOF

echo "3. Fixes applied successfully!"
echo "Now run the following git commands to push to GitHub:"
echo "--------------------------------------------------"
echo "git add gradle.properties app/gradle.properties .github/workflows/build-apk.yml"
echo "git commit -m \"fix(ci): add root gradle.properties for AndroidX & harden GitHub Actions workflow\""
echo "git push origin main"
echo "--------------------------------------------------"
`;

export const POTENTIAL_ISSUES: IssueDetail[] = [
  {
    id: 'issue-1',
    titleAr: 'الخطأ الحالي: غياب ملف gradle.properties في المجلد الرئيسي (Root)',
    titleEn: 'Current Error: Missing gradle.properties in Root Project',
    severity: 'critical',
    descriptionAr:
      'أداة Gradle ومحرك Android Gradle Plugin لا تقرأ خاصية android.useAndroidX من المجلدات الفرعية مثل app/gradle.properties. غياب الملف في المجلد الأساسي للمشروع تسبب في اعتبار الخاصية false وفشل مهمة :app:mergeReleaseNativeLibs.',
    descriptionEn:
      'Gradle only parses project-wide properties like android.useAndroidX=true from the root project directory. Having it solely in app/gradle.properties caused AGP to treat it as false and fail during :app:mergeReleaseNativeLibs.',
    solutionAr:
      'إنشاء ملف gradle.properties في المجلد الرئيسي للمستودع وكتابة android.useAndroidX=true بداخله.',
    solutionEn:
      'Create gradle.properties at the repository root and define android.useAndroidX=true.',
    codeSnippet: 'android.useAndroidX=true\nandroid.enableJetifier=true\nandroid.nonTransitiveRClass=true',
  },
  {
    id: 'issue-2',
    titleAr: 'خطأ محتمل: عدم وجود ملف gradle-wrapper.jar في المستودع',
    titleEn: 'Potential Error: Missing gradle/wrapper/gradle-wrapper.jar in Git',
    severity: 'high',
    descriptionAr:
      'ملف ./gradlew موجود ولكن مجلد gradle/wrapper/ يحتوي فقط على gradle-wrapper.properties بدون الـ jar! إذا لم تقم خطوة setup-gradle بإنشائه، سيفشل أمر ./gradlew فوراً برسالة Could not find or load main class org.gradle.wrapper.GradleWrapperMain.',
    descriptionEn:
      'The git repository contains ./gradlew and gradle-wrapper.properties, but gradle-wrapper.jar is omitted. If not created by setup-gradle, gradlew crashes with "Could not find or load main class org.gradle.wrapper.GradleWrapperMain".',
    solutionAr:
      'تم تحديث مسار GitHub Actions ليقوم بالتحقق من وجود الـ jar وتوليده تلقائياً عبر أمر "gradle wrapper --gradle-version 8.6" قبل تشغيل ./gradlew.',
    solutionEn:
      'The enhanced workflow checks for gradle-wrapper.jar existence and generates it automatically via "gradle wrapper --gradle-version 8.6" before execution.',
    codeSnippet: `if [ ! -f "./gradlew" ] || [ ! -f "./gradle/wrapper/gradle-wrapper.jar" ]; then\n  gradle wrapper --gradle-version 8.6\nfi`,
  },
  {
    id: 'issue-3',
    titleAr: 'أمان إضافي: تمرير وسائط AndroidX مباشرة في سطر الأوامر (CLI Overrides)',
    titleEn: 'Hardening Safeguard: Passing AndroidX Flags Directly to Gradle CLI',
    severity: 'medium',
    descriptionAr:
      'لضمان عدم تكرار المشكلة حتى لو نسي مطور آخر رفع ملف gradle.properties مستقبلاً، قمنا بتمرير -Pandroid.useAndroidX=true و -Pandroid.enableJetifier=true مباشرة لأمر بناء التطبيق داخل GitHub Actions.',
    descriptionEn:
      'Passing -Pandroid.useAndroidX=true and -Pandroid.enableJetifier=true directly in the ./gradlew CLI command acts as a bulletproof safeguard even if gradle.properties is removed in future commits.',
    solutionAr:
      'إضافة -Pandroid.useAndroidX=true -Pandroid.enableJetifier=true إلى أمر ./gradlew :app:assembleRelease.',
    solutionEn:
      'Append CLI flags to ./gradlew :app:assembleRelease command in workflow.',
    codeSnippet: `./gradlew :app:assembleRelease \\\n  -Pandroid.useAndroidX=true \\\n  -Pandroid.enableJetifier=true \\\n  --stacktrace --no-daemon`,
  },
  {
    id: 'issue-4',
    titleAr: 'خطأ محتمل: عدم تطابق اسم ملف APK الناتج في مهمة التحقق',
    titleEn: 'Potential Error: Hardcoded app-release.apk Path Mismatch',
    severity: 'high',
    descriptionAr:
      'الـ Workflow السابق كان يفحص وجود المسار الحرفي "app/build/outputs/apk/release/app-release.apk". في حال تم التوقيع بمفتاح مخصص أو تغيير اسم الـ APK في build.gradle.kts، سيفشل الـ Action ويعتبر الملف مفقوداً.',
    descriptionEn:
      'The previous workflow strictly checked a hardcoded file path. If AGP output name changes or signs differently, it aborted with "ERROR: app-release.apk was not generated".',
    solutionAr:
      'استخدام أمر البحث الديناميكي "find app/build/outputs/apk/release/ -type f -name \'*.apk\'" ونسخه باسم موحد وثابت لتحميل الـ Artifact.',
    solutionEn:
      'Dynamically locate the APK using find and standardize it into a clean build-artifacts folder with SHA256 checksum log.',
    codeSnippet: `APK_FILE=$(find app/build/outputs/apk/release/ -type f -name "*.apk" | head -n 1)\ncp "$APK_FILE" build-artifacts/Sami-Trading-Tracker-Release.apk`,
  },
  {
    id: 'issue-5',
    titleAr: 'خطأ محتمل: تعارض نسخ ملفات الويب بين dist و public',
    titleEn: 'Potential Error: Asset Overwrite Sequence between dist and public',
    severity: 'medium',
    descriptionAr:
      'كانت الخطوة السابقة تنسخ dist ثم تنسخ public فوقها. إذا كان هناك ملف index.html قديم داخل public فسيستبدل ملف dist المحزوم بـ Vite! قمنا بتصحيح الترتيب لينسخ public أولاً ثم يضع dist فوقه.',
    descriptionEn:
      'Previously, dist was copied first and then public was copied on top. If public had older assets or index.html, it would overwrite the freshly built Vite bundle. We fixed the sequence.',
    solutionAr:
      'نسخ ملفات public أولاً ثم استبدالها بمخرجات dist المبنية حديثاً.',
    solutionEn:
      'Copy public files first, then overlay freshly compiled dist bundle.',
    codeSnippet: `cp -r public/* app/src/main/assets/ 2>/dev/null || true\ncp -r dist/* app/src/main/assets/ 2>/dev/null || true`,
  },
  {
    id: 'issue-6',
    titleAr: 'توفير استهلاك الذاكرة (OOM) ومنع تعليق Gradle Daemon',
    titleEn: 'Memory Management & Preventing Gradle Daemon Hangs',
    severity: 'medium',
    descriptionAr:
      'في أجهزة GitHub Actions (التي تمتلك 7 جيجابايت ذاكرة عشوائية كحد أقصى)، يمكن أن يفشل بناء التطبيق بنقص الذاكرة (Out Of Memory) إذا لم يتم ضبط jvmargs مع --no-daemon.',
    descriptionEn:
      'GitHub Actions Ubuntu runners have 7GB RAM. Running multiple daemons or unbounded heaps can trigger Linux OOM Killer. We configured optimal memory allocation (-Xmx3072m) and --no-daemon.',
    solutionAr:
      'تحديد jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=512m مع علم --no-daemon.',
    solutionEn:
      'Configure -Xmx3072m with MaxMetaspaceSize and --no-daemon.',
    codeSnippet: `org.gradle.jvmargs=-Xmx3072m -Dfile.encoding=UTF-8 -XX:MaxMetaspaceSize=512m`,
  },
];
