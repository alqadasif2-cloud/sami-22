import React, { useState, useEffect, useRef, useCallback } from './samiReactShim.ts';
import JSZip from 'jszip';

/**
 * Sami End-to-End Cloud In-App Update System (Client UI & Verification Engine)
 * - Admin Panel (`SamiAdminUpdatePanel`): APK File Picker, Local+Server Binary Manifest & X.509 Signing Cert Inspector,
 *   GitHub Releases Status, Real XHR Upload Progress (0%..100%) + Cancel + Retry, Release History, Pause/Resume, Rollback.
 * - User Update Modal (`SamiUserUpdateModal`): Black & Gold Sami Theme, Native Android `SamiBridge` + Web Resumable Range
 *   Streaming, 8-Point Pre-Install Integrity & Certificate Verification, and Official Android System PackageInstaller Trigger.
 */

export const SAMI_EXPECTED_APP_ID = 'com.sami.tradingchallengetracker';
export const SAMI_FALLBACK_VERSION_CODE = 15;
export const SAMI_FALLBACK_VERSION_NAME = '1.3.1';
const DEFAULT_CLOUD_RUN_BASE = 'https://ais-pre-imthno3wu25qands27nuna-27831794049.europe-west2.run.app';

export interface CloudAppUpdateConfig {
  id?: string;
  versionName: string;
  versionCode: number;
  description: string;
  fileSize?: number;
  fileName?: string;
  applicationId?: string;
  storageSource?: 'github_releases' | 'legacy';
  githubOwner?: string;
  githubRepo?: string;
  githubReleaseId?: number;
  releaseTag?: string;
  githubAssetId?: number;
  isRepoPrivate?: boolean;
  downloadUrl: string;
  secureDownloadPath?: string;
  sha256?: string;
  signingCertSha256?: string;
  uploadedAt?: number;
  publishedAt?: number;
  updatedAt?: number;
  status?: 'draft' | 'published' | 'paused';
  isMandatory: boolean;
  minSupportedVersionCode?: number;
  publishedBy?: string;
  isActive: boolean;
  isHidden?: boolean;
}

export interface InstalledAppInfo {
  applicationId: string;
  versionName: string;
  versionCode: number;
  signingCertSha256: string;
  canInstallPackages: boolean;
  isAndroidNative: boolean;
}

interface ClientApkInspection {
  valid: boolean;
  fileName: string;
  fileSize: number;
  sha256: string;
  applicationId: string;
  versionName: string;
  versionCode: number;
  minSdkVersion?: number;
  targetSdkVersion?: number;
  hasClassesDex: boolean;
  signingCertificate: {
    sha256Fingerprint: string;
    sha256Hex: string;
    subject: string;
    scheme: string;
  } | null;
  signatureMatchesOriginal: boolean;
  applicationIdMatchesSami: boolean;
  isHigherThanPublished: boolean;
  publishedVersionCode: number;
  installedBaselineVersionCode: number;
  canPublish: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// ENVIRONMENT, SERVER URL & AUTH HELPERS
// ============================================================================

export function isAndroidLocalAssetOrigin(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      (window.location.hostname === 'appassets.androidplatform.net' || window.location.protocol === 'file:')
    );
  } catch {
    return false;
  }
}

export function getSamiServerBaseUrl(): string {
  try {
    if (!isAndroidLocalAssetOrigin()) {
      return '';
    }
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('sami_push_server_url') : null;
    if (stored && stored.trim().startsWith('http')) {
      return stored.trim().replace(/\/+$/, '');
    }
    return DEFAULT_CLOUD_RUN_BASE;
  } catch {
    return DEFAULT_CLOUD_RUN_BASE;
  }
}

function getAuthCredentials(): {
  token: string;
  encodedSession: string;
  headers: Record<string, string>;
} {
  let token = '';
  let rawSession = '';
  try {
    rawSession = localStorage.getItem('sami_auth_user_session') || '';
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (parsed && parsed.token) {
        token = String(parsed.token);
      }
    }
  } catch {}

  const encodedSession = rawSession ? encodeURIComponent(rawSession) : '';
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (encodedSession) headers['X-Sami-Session'] = encodedSession;
  return { token, encodedSession, headers };
}

export function getInstalledSamiAppInfo(): InstalledAppInfo {
  const w = typeof window !== 'undefined' ? (window as any) : {};
  try {
    if (w.SamiBridge && typeof w.SamiBridge.getInstalledAppInfo === 'function') {
      const raw = w.SamiBridge.getInstalledAppInfo();
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && Number(parsed.versionCode) > 0) {
          w.__samiNativeAppInfo = parsed;
          return {
            applicationId: String(parsed.applicationId || SAMI_EXPECTED_APP_ID),
            versionName: String(parsed.versionName || SAMI_FALLBACK_VERSION_NAME),
            versionCode: Number(parsed.versionCode),
            signingCertSha256: String(parsed.signingCertSha256 || ''),
            canInstallPackages: Boolean(parsed.canInstallPackages),
            isAndroidNative: true,
          };
        }
      }
    }
    if (w.__samiNativeAppInfo && Number(w.__samiNativeAppInfo.versionCode) > 0) {
      const p = w.__samiNativeAppInfo;
      return {
        applicationId: String(p.applicationId || SAMI_EXPECTED_APP_ID),
        versionName: String(p.versionName || SAMI_FALLBACK_VERSION_NAME),
        versionCode: Number(p.versionCode),
        signingCertSha256: String(p.signingCertSha256 || ''),
        canInstallPackages: Boolean(p.canInstallPackages),
        isAndroidNative: true,
      };
    }
  } catch {}

  return {
    applicationId: SAMI_EXPECTED_APP_ID,
    versionName: SAMI_FALLBACK_VERSION_NAME,
    versionCode: SAMI_FALLBACK_VERSION_CODE,
    signingCertSha256: '',
    canInstallPackages: false,
    isAndroidNative: false,
  };
}

export function shouldShowCloudAppUpdate(config: CloudAppUpdateConfig | null | undefined): boolean {
  if (!config) return false;
  if (config.isActive !== true || config.isHidden === true) return false;
  if (config.status && config.status !== 'published') return false;
  // Strictly enforce GitHub Releases storage source — never prompt users with legacy manual/external URLs
  const isGitHubRelease =
    config.storageSource === 'github_releases' ||
    Boolean(config.githubReleaseId) ||
    Boolean(config.githubAssetId) ||
    (typeof config.downloadUrl === 'string' && config.downloadUrl.includes('/releases/download/'));
  if (!isGitHubRelease) return false;

  const installed = getInstalledSamiAppInfo();
  return Number(config.versionCode) > installed.versionCode;
}

// ============================================================================
// FORMATTING & BINARY CRYPTO/AXML UTILITIES
// ============================================================================

function formatBytesAr(bytes: number | undefined | null): string {
  const b = Number(bytes || 0);
  if (!b || b <= 0) return '0.00 MB';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function formatSpeedAr(bytesPerSec: number | undefined | null): string {
  const s = Number(bytesPerSec || 0);
  if (!s || s <= 0) return '';
  if (s < 1024 * 1024) return `${(s / 1024).toFixed(0)} KB/s`;
  return `${(s / (1024 * 1024)).toFixed(2)} MB/s`;
}

function encodeUtf8Base64(text: string): string {
  try {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return '';
  }
}

async function computeArrayBufferSha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
  const arr = new Uint8Array(hashBuf);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeFpHex(fp: string | undefined | null): string {
  return String(fp || '')
    .replace(/[^a-fA-F0-9]/g, '')
    .toLowerCase();
}

function formatColonFp(hex: string): string {
  const clean = normalizeFpHex(hex).toUpperCase();
  if (clean.length !== 64) return clean;
  return clean.match(/.{1,2}/g)!.join(':');
}

/**
 * Client-side binary AndroidManifest.xml (AXML) parser for instant local APK inspection
 * and pre-install verification on Web.
 */
function parseBinaryManifestClient(u8: Uint8Array): {
  applicationId: string;
  versionCode: number;
  versionName: string;
} {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (u8.byteLength < 16 || dv.getUint16(0, true) !== 0x0003) {
    throw new Error('ملف AndroidManifest.xml داخل الحزمة ليس بصيغة Android Binary XML صالحة');
  }

  let offset = dv.getUint16(2, true);
  const strings: string[] = [];
  const resIds: number[] = [];
  let applicationId = '';
  let versionCode = 0;
  let versionCodeMajor = 0;
  let versionName = '';

  while (offset + 8 <= u8.byteLength) {
    const chunkType = dv.getUint16(offset, true);
    const headerSize = dv.getUint16(offset + 2, true);
    const chunkSize = dv.getUint32(offset + 4, true);
    if (chunkSize < 8 || offset + chunkSize > u8.byteLength) break;

    if (chunkType === 0x0001) {
      const stringCount = dv.getUint32(offset + 8, true);
      const flags = dv.getUint32(offset + 16, true);
      const stringsStart = dv.getUint32(offset + 20, true);
      const isUtf8 = (flags & (1 << 8)) !== 0;
      const offsetsBase = offset + headerSize;
      const poolDataBase = offset + stringsStart;

      for (let i = 0; i < stringCount; i++) {
        const strOff = poolDataBase + dv.getUint32(offsetsBase + i * 4, true);
        if (strOff >= offset + chunkSize) {
          strings.push('');
          continue;
        }
        if (isUtf8) {
          let p = strOff;
          p += (u8[p] & 0x80) !== 0 ? 2 : 1;
          let byteLen = u8[p];
          if ((byteLen & 0x80) !== 0) {
            byteLen = ((byteLen & 0x7f) << 8) | u8[p + 1];
            p += 2;
          } else {
            p += 1;
          }
          strings.push(new TextDecoder('utf-8').decode(u8.subarray(p, p + byteLen)));
        } else {
          let p = strOff;
          let charLen = dv.getUint16(p, true);
          if ((charLen & 0x8000) !== 0) {
            charLen = ((charLen & 0x7fff) << 16) | dv.getUint16(p + 2, true);
            p += 4;
          } else {
            p += 2;
          }
          strings.push(new TextDecoder('utf-16le').decode(u8.subarray(p, p + charLen * 2)));
        }
      }
    } else if (chunkType === 0x0180) {
      const count = Math.floor((chunkSize - headerSize) / 4);
      for (let i = 0; i < count; i++) {
        resIds.push(dv.getUint32(offset + headerSize + i * 4, true));
      }
    } else if (chunkType === 0x0102) {
      const nameIdx = dv.getInt32(offset + 20, true);
      const attrStart = dv.getUint16(offset + 24, true);
      const attrSize = dv.getUint16(offset + 26, true);
      const attrCount = dv.getUint16(offset + 28, true);
      const elemName = nameIdx >= 0 && nameIdx < strings.length ? strings[nameIdx] : '';

      if (elemName === 'manifest' && attrSize >= 20) {
        const attrBase = offset + 16 + attrStart;
        for (let i = 0; i < attrCount; i++) {
          const aOff = attrBase + i * attrSize;
          if (aOff + 20 > offset + chunkSize) break;
          const aNameIdx = dv.getInt32(aOff + 4, true);
          const rawValIdx = dv.getInt32(aOff + 8, true);
          const dataType = u8[aOff + 15];
          const dataVal = dv.getUint32(aOff + 16, true);
          const aName = aNameIdx >= 0 && aNameIdx < strings.length ? strings[aNameIdx] : '';
          const resId = aNameIdx >= 0 && aNameIdx < resIds.length ? resIds[aNameIdx] : 0;
          const strVal =
            dataType === 0x03 && dataVal < strings.length
              ? strings[dataVal]
              : rawValIdx >= 0 && rawValIdx < strings.length
                ? strings[rawValIdx]
                : '';

          if (aName === 'package' && strVal) {
            applicationId = strVal;
          } else if (resId === 0x0101021b || aName === 'versionCode') {
            versionCode = dataVal;
          } else if (resId === 0x01010576 || aName === 'versionCodeMajor') {
            versionCodeMajor = dataVal;
          } else if (resId === 0x0101021c || aName === 'versionName') {
            versionName = strVal || String(dataVal);
          }
        }
      }
    }

    offset += chunkSize;
  }

  const fullCode = versionCodeMajor > 0 ? versionCodeMajor * 0x100000000 + versionCode : versionCode;
  return { applicationId, versionCode: fullCode, versionName };
}

/**
 * Extracts X.509 certificate SHA-256 fingerprint from APK Signature Scheme v2/v3 block in browser.
 */
async function extractSigningCertSha256Client(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const u8 = new Uint8Array(buffer);
    const dv = new DataView(buffer);
    const minSearch = Math.max(0, u8.byteLength - 65557);
    let eocdOffset = -1;
    for (let i = u8.byteLength - 22; i >= minSearch; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset < 0) return null;
    const cdOffset = dv.getUint32(eocdOffset + 16, true);
    if (cdOffset < 32 || cdOffset > u8.byteLength) return null;

    const magic = new TextDecoder('ascii').decode(u8.subarray(cdOffset - 16, cdOffset));
    if (magic !== 'APK Sig Block 42') return null;

    const blockSizeFooter = Number(dv.getBigUint64(cdOffset - 24, true));
    const blockStart = cdOffset - blockSizeFooter - 8;
    if (blockStart < 0) return null;

    let pos = blockStart + 8;
    const pairsEnd = cdOffset - 24;
    while (pos + 12 <= pairsEnd) {
      const pairLen = Number(dv.getBigUint64(pos, true));
      if (pairLen < 4 || pos + 8 + pairLen > pairsEnd) break;
      const blockId = dv.getUint32(pos + 8, true);
      if (blockId === 0x7109871a || blockId === 0xf05368c0 || blockId === 0x1b93ad61) {
        const valOff = pos + 12;
        const firstSignerOff = valOff + 8;
        const signedDataOff = firstSignerOff + 4;
        const digestsLen = dv.getUint32(signedDataOff, true);
        const certsOff = signedDataOff + 4 + digestsLen;
        const firstCertLen = dv.getUint32(certsOff + 4, true);
        const certStart = certsOff + 8;
        if (firstCertLen > 0 && certStart + firstCertLen <= pos + 8 + pairLen) {
          const certSlice = u8.slice(certStart, certStart + firstCertLen);
          const hex = await computeArrayBufferSha256Hex(certSlice.buffer);
          return formatColonFp(hex);
        }
      }
      pos += 8 + pairLen;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// REUSABLE PROGRESS BAR (SVG — ZERO INLINE CSS STYLES)
// ============================================================================

function GoldProgressBar({
  percent,
  variant = 'gold',
}: {
  percent: number;
  variant?: 'gold' | 'emerald' | 'rose';
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const fillClass =
    variant === 'emerald'
      ? 'fill-emerald-400'
      : variant === 'rose'
        ? 'fill-rose-500'
        : 'fill-amber-400';

  return (
    <div dir="ltr" className="w-full rounded-lg overflow-hidden bg-[#070a12] border border-slate-800 p-0.5">
      <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="w-full h-2.5 block rounded">
        <rect x="0" y="0" width="100" height="4" className="fill-slate-900" />
        {clamped > 0 && (
          <rect x="0" y="0" width={clamped} height="4" className={`${fillClass} transition-all duration-150`} />
        )}
      </svg>
    </div>
  );
}

// ============================================================================
// PART 1: USER IN-APP UPDATE MODAL (`SamiUserUpdateModal`)
// ============================================================================

interface WebPersistedUpdateState {
  phase: string;
  statusTextAr: string;
  errorDetailAr: string | null;
  targetVersionCode: number;
  targetVersionName: string;
  downloadedBytes: number;
  totalBytes: number;
  percent: number;
  speedBytesPerSec: number;
  canInstall: boolean;
  canResume: boolean;
  verifiedSha256: string | null;
  verifiedSigningCertSha256: string | null;
}

// Module-level Web download store so closing & reopening the modal preserves active download progress & buffers!
const webDownloadMemoryStore: {
  versionCode: number;
  chunks: Uint8Array[];
  downloadedBytes: number;
  totalBytes: number;
  verifiedBlob: Blob | null;
  abortCtrl: AbortController | null;
  state: WebPersistedUpdateState;
  listeners: Set<(s: WebPersistedUpdateState) => void>;
} = {
  versionCode: 0,
  chunks: [],
  downloadedBytes: 0,
  totalBytes: 0,
  verifiedBlob: null,
  abortCtrl: null,
  state: {
    phase: 'idle',
    statusTextAr: '',
    errorDetailAr: null,
    targetVersionCode: 0,
    targetVersionName: '',
    downloadedBytes: 0,
    totalBytes: 0,
    percent: 0,
    speedBytesPerSec: 0,
    canInstall: false,
    canResume: false,
    verifiedSha256: null,
    verifiedSigningCertSha256: null,
  },
  listeners: new Set(),
};

function emitWebUpdateState(patch: Partial<WebPersistedUpdateState>) {
  webDownloadMemoryStore.state = {
    ...webDownloadMemoryStore.state,
    ...patch,
  };
  for (const fn of webDownloadMemoryStore.listeners) {
    try {
      fn(webDownloadMemoryStore.state);
    } catch {}
  }
}

function concatUint8Arrays(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

async function runWebResumableDownloadAndVerify(config: CloudAppUpdateConfig, isResume: boolean) {
  if (webDownloadMemoryStore.abortCtrl) {
    return;
  }

  if (webDownloadMemoryStore.versionCode !== config.versionCode) {
    webDownloadMemoryStore.versionCode = config.versionCode;
    webDownloadMemoryStore.chunks = [];
    webDownloadMemoryStore.downloadedBytes = 0;
    webDownloadMemoryStore.verifiedBlob = null;
  }

  const abortCtrl = new AbortController();
  webDownloadMemoryStore.abortCtrl = abortCtrl;
  const existingOffset = webDownloadMemoryStore.downloadedBytes;
  const expectedTotal = Number(config.fileSize || 0);

  emitWebUpdateState({
    phase: isResume && existingOffset > 0 ? 'resuming' : 'connecting',
    statusTextAr: isResume && existingOffset > 0 ? 'جارٍ استئناف التنزيل' : 'جارٍ الاتصال بالخادم',
    errorDetailAr: null,
    targetVersionCode: config.versionCode,
    targetVersionName: config.versionName,
    downloadedBytes: existingOffset,
    totalBytes: expectedTotal,
    percent: expectedTotal > 0 ? Math.min(99, Math.floor((existingOffset * 99) / expectedTotal)) : 0,
    speedBytesPerSec: 0,
    canInstall: false,
    canResume: false,
  });

  try {
    const serverBase = getSamiServerBaseUrl();
    const proxyPath = config.secureDownloadPath || `/api/app-updates/download/v_${config.versionCode}`;
    const proxyUrl = `${serverBase}${proxyPath}`;
    const { headers: authHeaders } = getAuthCredentials();

    // Use server streaming proxy on Web (supports CORS + Range 206 + private & public GitHub Releases seamlessly)
    const reqHeaders: Record<string, string> = { ...authHeaders };
    if (existingOffset > 0 && (expectedTotal <= 0 || existingOffset < expectedTotal)) {
      reqHeaders.Range = `bytes=${existingOffset}-`;
    }

    const res = await fetch(proxyUrl, {
      method: 'GET',
      headers: reqHeaders,
      signal: abortCtrl.signal,
    });

    if (!res.ok && res.status !== 206) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error || `تعذر تنزيل التحديث من الخادم (HTTP ${res.status})`);
    }

    const isPartial = res.status === 206 && existingOffset > 0;
    if (!isPartial) {
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
    }

    const contentLen = parseInt(res.headers.get('content-length') || '0', 10) || 0;
    const resolvedTotal =
      expectedTotal > 0
        ? expectedTotal
        : isPartial && contentLen > 0
          ? existingOffset + contentLen
          : contentLen;
    webDownloadMemoryStore.totalBytes = resolvedTotal;

    emitWebUpdateState({
      phase: 'starting',
      statusTextAr: 'جارٍ بدء التنزيل',
      totalBytes: resolvedTotal,
    });

    if (!res.body) {
      throw new Error('لم يُرجع الخادم دفق بيانات قابل للقراءة');
    }

    const reader = res.body.getReader();
    let windowStart = Date.now();
    let windowBytes = 0;
    let speed = 0;
    let lastUiTick = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        webDownloadMemoryStore.chunks.push(value);
        webDownloadMemoryStore.downloadedBytes += value.byteLength;
        windowBytes += value.byteLength;

        const now = Date.now();
        if (now - windowStart >= 500) {
          speed = Math.round((windowBytes * 1000) / (now - windowStart));
          windowStart = now;
          windowBytes = 0;
        }

        if (now - lastUiTick >= 120) {
          lastUiTick = now;
          const dl = webDownloadMemoryStore.downloadedBytes;
          const pct = resolvedTotal > 0 ? Math.min(99, Math.floor((dl * 99) / resolvedTotal)) : 0;
          emitWebUpdateState({
            phase: 'downloading',
            statusTextAr: 'جارٍ تنزيل التحديث',
            downloadedBytes: dl,
            totalBytes: resolvedTotal,
            percent: pct,
            speedBytesPerSec: speed,
          });
        }
      }
    }

    webDownloadMemoryStore.abortCtrl = null;

    // Mandatory 8-point verification before allowing install
    const fullBytes = concatUint8Arrays(
      webDownloadMemoryStore.chunks,
      webDownloadMemoryStore.downloadedBytes
    );

    emitWebUpdateState({
      phase: 'verifying',
      statusTextAr: 'اكتمل التنزيل — جارٍ التحقق من سلامة الملف وشهادة التوقيع...',
      downloadedBytes: fullBytes.byteLength,
      totalBytes: expectedTotal || fullBytes.byteLength,
      percent: 99,
      speedBytesPerSec: 0,
    });

    // Check 1: File size match
    if (expectedTotal > 0 && fullBytes.byteLength !== expectedTotal) {
      throw new Error(
        `حجم الملف المحمّل (${fullBytes.byteLength} بايت) لا يطابق الحجم الرسمي المعتمد (${expectedTotal} بايت)`
      );
    }

    // Check 2: Local SHA-256 calculation matches Firestore SHA-256
    const localSha256 = await computeArrayBufferSha256Hex(fullBytes.buffer as ArrayBuffer);
    if (config.sha256 && localSha256.toLowerCase() !== config.sha256.toLowerCase()) {
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
      throw new Error('بصمة SHA-256 للملف المحمّل لا تطابق البصمة الرسمية المعتمدة؛ تم حذف الملف التالف.');
    }

    // Check 3, 4, 5: Valid readable APK archive + applicationId + versionCode > installed
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(fullBytes);
    } catch {
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
      throw new Error('الملف المحمّل تالف ولا يمثل حزمة Android APK صالحة.');
    }

    const manifestFile = zip.file('AndroidManifest.xml');
    const dexFile = zip.file('classes.dex');
    if (!manifestFile || !dexFile) {
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
      throw new Error('الحزمة المحمّلة تفتقر إلى ملفات تطبيق Android الأساسية؛ تم رفض التثبيت.');
    }

    const manifestU8 = await manifestFile.async('uint8array');
    const parsedManifest = parseBinaryManifestClient(manifestU8);
    if (parsedManifest.applicationId !== SAMI_EXPECTED_APP_ID) {
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
      throw new Error(
        `معرّف الحزمة داخل الملف (${parsedManifest.applicationId}) لا يطابق تطبيق Sami (${SAMI_EXPECTED_APP_ID}).`
      );
    }

    const installed = getInstalledSamiAppInfo();
    if (parsedManifest.versionCode <= installed.versionCode) {
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
      throw new Error(
        `كود الإصدار داخل الحزمة (${parsedManifest.versionCode}) ليس أحدث من النسخة المثبتة (${installed.versionCode}).`
      );
    }

    // Check 6, 7, 8: Extract X.509 signing certificate & verify match
    const certColon = await extractSigningCertSha256Client(fullBytes.buffer as ArrayBuffer);
    if (config.signingCertSha256 && certColon) {
      if (normalizeFpHex(certColon) !== normalizeFpHex(config.signingCertSha256)) {
        webDownloadMemoryStore.chunks = [];
        webDownloadMemoryStore.downloadedBytes = 0;
        throw new Error('شهادة توقيع التحديث لا تطابق شهادة توقيع تطبيق Sami الأصلية؛ تم حظر التثبيت.');
      }
    }

    webDownloadMemoryStore.verifiedBlob = new Blob([fullBytes.buffer as ArrayBuffer], {
      type: 'application/vnd.android.package-archive',
    });

    emitWebUpdateState({
      phase: 'verified',
      statusTextAr: 'اكتمل التنزيل',
      errorDetailAr: null,
      downloadedBytes: fullBytes.byteLength,
      totalBytes: fullBytes.byteLength,
      percent: 100,
      speedBytesPerSec: 0,
      canInstall: true,
      canResume: false,
      verifiedSha256: localSha256,
      verifiedSigningCertSha256: certColon || config.signingCertSha256 || null,
    });
  } catch (err: any) {
    webDownloadMemoryStore.abortCtrl = null;
    if (abortCtrl.signal.aborted) {
      return;
    }
    const dl = webDownloadMemoryStore.downloadedBytes;
    const pct = expectedTotal > 0 ? Math.min(99, Math.floor((dl * 99) / expectedTotal)) : 0;
    emitWebUpdateState({
      phase: 'failed',
      statusTextAr: 'فشل التنزيل',
      errorDetailAr: err?.message || 'حدث خطأ أثناء تنزيل التحديث أو التحقق منه',
      downloadedBytes: dl,
      totalBytes: expectedTotal,
      percent: pct,
      speedBytesPerSec: 0,
      canInstall: false,
      canResume: dl > 0,
    });
  }
}

export function SamiUserUpdateModal({
  config,
  isOpen,
  onDismiss,
  isPreview = false,
}: {
  config: CloudAppUpdateConfig | null;
  isOpen: boolean;
  onDismiss?: () => void;
  isPreview?: boolean;
}) {
  const installed = getInstalledSamiAppInfo();
  const isNativeAndroid = installed.isAndroidNative;

  const [dlState, setDlState] = useState<WebPersistedUpdateState>(() => {
    const w = typeof window !== 'undefined' ? (window as any) : {};
    if (isNativeAndroid && w.SamiBridge && typeof w.SamiBridge.getUpdateState === 'function') {
      try {
        const raw = JSON.parse(w.SamiBridge.getUpdateState());
        if (raw && (!config || Number(raw.targetVersionCode) === Number(config.versionCode))) {
          return raw;
        }
      } catch {}
    }
    if (config && webDownloadMemoryStore.versionCode === Number(config.versionCode)) {
      return webDownloadMemoryStore.state;
    }
    return {
      phase: 'idle',
      statusTextAr: '',
      errorDetailAr: null,
      targetVersionCode: config?.versionCode || 0,
      targetVersionName: config?.versionName || '',
      downloadedBytes: 0,
      totalBytes: config?.fileSize || 0,
      percent: 0,
      speedBytesPerSec: 0,
      canInstall: false,
      canResume: false,
      verifiedSha256: null,
      verifiedSigningCertSha256: null,
    };
  });

  const [webInstallNotice, setWebInstallNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !config) return;
    const w = typeof window !== 'undefined' ? (window as any) : {};

    if (isNativeAndroid) {
      const syncFromNative = (ev?: any) => {
        try {
          const detail = ev?.detail || (w.SamiBridge?.getUpdateState ? JSON.parse(w.SamiBridge.getUpdateState()) : null);
          if (detail && (detail.targetVersionCode === 0 || Number(detail.targetVersionCode) === Number(config.versionCode))) {
            setDlState(detail);
          }
        } catch {}
      };
      syncFromNative();
      window.addEventListener('sami_native_update_state', syncFromNative as EventListener);
      return () => {
        window.removeEventListener('sami_native_update_state', syncFromNative as EventListener);
      };
    } else {
      const listener = (next: WebPersistedUpdateState) => {
        if (next.targetVersionCode === 0 || Number(next.targetVersionCode) === Number(config.versionCode)) {
          setDlState({ ...next });
        }
      };
      webDownloadMemoryStore.listeners.add(listener);
      if (webDownloadMemoryStore.versionCode === Number(config.versionCode)) {
        setDlState({ ...webDownloadMemoryStore.state });
      }
      return () => {
        webDownloadMemoryStore.listeners.delete(listener);
      };
    }
  }, [isOpen, config?.versionCode, isNativeAndroid]);

  if (!isOpen || !config) return null;
  if (!isPreview && !shouldShowCloudAppUpdate(config)) return null;

  const isMandatory = Boolean(config.isMandatory);
  const phase = (dlState.phase || 'idle').toLowerCase();
  const isDownloading =
    phase === 'connecting' || phase === 'starting' || phase === 'downloading' || phase === 'resuming' || phase === 'verifying';
  const isPaused = phase === 'paused';
  const isFailed = phase === 'failed';
  const isVerifiedReady = phase === 'verified' && dlState.canInstall === true;
  const needsPerm = phase === 'needs_install_permission';
  const isInstalling = phase === 'installing';

  const handleStartDownload = () => {
    setWebInstallNotice(null);
    if (isPreview && !config.downloadUrl && !config.githubAssetId) {
      setDlState((prev) => ({
        ...prev,
        phase: 'failed',
        statusTextAr: 'فشل التنزيل',
        errorDetailAr: 'هذه معاينة تصميمية فقط؛ سيتم تفعيل التنزيل الفعلي فور رفع ملف الـ APK ونشره.',
      }));
      return;
    }

    const w = typeof window !== 'undefined' ? (window as any) : {};
    if (isNativeAndroid && w.SamiBridge?.startAppUpdateDownload) {
      const serverBase = getSamiServerBaseUrl();
      const { token, encodedSession } = getAuthCredentials();
      w.SamiBridge.startAppUpdateDownload(
        JSON.stringify(config),
        serverBase,
        JSON.stringify({ token, session: encodedSession })
      );
    } else {
      runWebResumableDownloadAndVerify(config, false);
    }
  };

  const handlePauseDownload = () => {
    const w = typeof window !== 'undefined' ? (window as any) : {};
    if (isNativeAndroid && w.SamiBridge?.pauseAppUpdateDownload) {
      try {
        setDlState(JSON.parse(w.SamiBridge.pauseAppUpdateDownload()));
      } catch {}
    } else {
      if (webDownloadMemoryStore.abortCtrl) {
        webDownloadMemoryStore.abortCtrl.abort();
        webDownloadMemoryStore.abortCtrl = null;
      }
      emitWebUpdateState({
        phase: 'paused',
        statusTextAr: 'تم إيقاف التنزيل مؤقتًا',
        speedBytesPerSec: 0,
        canResume: webDownloadMemoryStore.downloadedBytes > 0,
      });
    }
  };

  const handleResumeDownload = () => {
    const w = typeof window !== 'undefined' ? (window as any) : {};
    if (isNativeAndroid && w.SamiBridge?.resumeAppUpdateDownload) {
      const resStr = w.SamiBridge.resumeAppUpdateDownload();
      try {
        const parsed = JSON.parse(resStr);
        if (!parsed?.ok) {
          handleStartDownload();
        }
      } catch {
        handleStartDownload();
      }
    } else {
      runWebResumableDownloadAndVerify(config, true);
    }
  };

  const handleCancelDownload = () => {
    const w = typeof window !== 'undefined' ? (window as any) : {};
    if (isNativeAndroid && w.SamiBridge?.cancelAppUpdateDownload) {
      try {
        setDlState(JSON.parse(w.SamiBridge.cancelAppUpdateDownload()));
      } catch {}
    } else {
      if (webDownloadMemoryStore.abortCtrl) {
        webDownloadMemoryStore.abortCtrl.abort();
        webDownloadMemoryStore.abortCtrl = null;
      }
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
      webDownloadMemoryStore.verifiedBlob = null;
      emitWebUpdateState({
        phase: 'idle',
        statusTextAr: '',
        errorDetailAr: null,
        downloadedBytes: 0,
        percent: 0,
        speedBytesPerSec: 0,
        canInstall: false,
        canResume: false,
      });
    }
  };

  const handleInstallVerifiedApk = () => {
    const w = typeof window !== 'undefined' ? (window as any) : {};
    if (isNativeAndroid && w.SamiBridge?.installVerifiedAppUpdate) {
      w.SamiBridge.installVerifiedAppUpdate();
      return;
    }

    // Browser environment: save the verified APK cleanly via invisible blob anchor without opening external windows
    if (webDownloadMemoryStore.verifiedBlob) {
      const blobUrl = URL.createObjectURL(webDownloadMemoryStore.verifiedBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = config.fileName || `Sami-v${config.versionName}.apk`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      setWebInstallNotice(
        'تم التحقق من سلامة الحزمة وشهادة التوقيع وحفظ ملف الـ APK المعتمد على جهازك. داخل تطبيق Sami على هاتف Android يفتح هذا الزر مثبّت النظام الرسمي مباشرة.'
      );
    }
  };

  const totalSizeDisplay = dlState.totalBytes > 0 ? dlState.totalBytes : config.fileSize || 0;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-[#090d17] border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-right space-y-4">
        {/* Header Identity */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 font-black text-lg">
              {isMandatory ? '⚡' : '✦'}
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isMandatory ? 'تحديث إلزامي لتطبيق Sami' : 'تحديث جديد متاح لتطبيق Sami'}
              </h3>
              <p className="text-xs font-bold mt-0.5 text-amber-300/90">
                {isMandatory
                  ? 'يلزم تثبيت هذا التحديث للمتابعة وضمان استقرار الحساب والبيانات'
                  : 'إصدار محدث جاهز للتنزيل والتثبيت المباشر من داخل التطبيق'}
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-black px-2.5 py-1 rounded-md border shrink-0 ${
              isMandatory
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : 'bg-amber-400/10 border-amber-400/30 text-amber-300'
            }`}
          >
            {isMandatory ? 'إلزامي' : 'اختياري'}
          </span>
        </div>

        {/* Version & Size Telemetry Grid */}
        <div className="grid grid-cols-3 gap-2 bg-[#0d1322] border border-slate-800 rounded-xl p-3 text-center">
          <div className="border-l border-slate-800/80 pl-2">
            <span className="block text-[10px] text-slate-400 font-bold">الإصدار المثبت</span>
            <span
              dir="ltr"
              className="block text-xs font-black text-slate-200 font-['JetBrains_Mono',monospace] tabular-nums mt-0.5"
            >
              v{installed.versionName}
            </span>
            <span className="block text-[10px] text-slate-500 font-['JetBrains_Mono',monospace] tabular-nums">
              Build {installed.versionCode}
            </span>
          </div>

          <div className="border-l border-slate-800/80 pl-2">
            <span className="block text-[10px] text-amber-400 font-bold">الإصدار الجديد</span>
            <span
              dir="ltr"
              className="block text-sm font-black text-amber-300 font-['JetBrains_Mono',monospace] tabular-nums mt-0.5"
            >
              v{config.versionName}
            </span>
            <span className="block text-[10px] text-amber-200/70 font-['JetBrains_Mono',monospace] tabular-nums">
              Build {config.versionCode}
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-slate-400 font-bold">حجم الحزمة</span>
            <span
              dir="ltr"
              className="block text-xs font-black text-slate-100 font-['JetBrains_Mono',monospace] tabular-nums mt-0.5"
            >
              {totalSizeDisplay > 0 ? formatBytesAr(totalSizeDisplay) : 'APK رسمي'}
            </span>
            <span className="block text-[10px] text-emerald-400 font-bold">موقّع وموثّق</span>
          </div>
        </div>

        {/* Release Notes */}
        {config.description && (
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3.5">
            <span className="block text-[11px] font-black text-amber-400 mb-1.5">تفاصيل التحديث وما الجديد:</span>
            <p className="text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
              {config.description}
            </p>
          </div>
        )}

        {/* Live Download & Verification Progress Box */}
        {phase !== 'idle' && (
          <div className="bg-[#0b101d] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span
                className={`font-black ${
                  isFailed
                    ? 'text-rose-400'
                    : isVerifiedReady
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                }`}
              >
                {dlState.statusTextAr || 'جارٍ معالجة التحديث'}
              </span>
              <span
                dir="ltr"
                className="font-black text-slate-100 font-['JetBrains_Mono',monospace] tabular-nums"
              >
                {dlState.percent}%
              </span>
            </div>

            <GoldProgressBar
              percent={dlState.percent}
              variant={isFailed ? 'rose' : isVerifiedReady ? 'emerald' : 'gold'}
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-['JetBrains_Mono',monospace] tabular-nums">
              <span dir="ltr">
                {formatBytesAr(dlState.downloadedBytes)} / {formatBytesAr(totalSizeDisplay)}
              </span>
              <span dir="ltr" className="text-amber-300">
                {isDownloading && dlState.speedBytesPerSec > 0 ? formatSpeedAr(dlState.speedBytesPerSec) : ''}
              </span>
            </div>

            {isVerifiedReady && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 text-[11px] text-emerald-300 font-bold">
                ✓ تم التحقق من اكتمال الحجم وبصمة SHA-256 ومطابقة شهادة توقيع Sami الأصلية بنجاح.
              </div>
            )}

            {needsPerm && (
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg p-2.5 text-[11px] text-amber-200 font-bold">
                يرجى تفعيل خيار «السماح من هذا المصدر» في شاشة إعدادات Android ثم العودة لإتمام التثبيت تلقائياً.
              </div>
            )}

            {dlState.errorDetailAr && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-[11px] text-rose-300 leading-relaxed">
                {dlState.errorDetailAr}
              </div>
            )}

            {webInstallNotice && (
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg p-2.5 text-[11px] text-amber-200 leading-relaxed">
                {webInstallNotice}
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-2 pt-1">
          {/* Verified -> Show ONLY Official Install Button */}
          {(isVerifiedReady || needsPerm || isInstalling) && (
            <button
              type="button"
              onClick={handleInstallVerifiedApk}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <span>✅ تثبيت التحديث الآن</span>
            </button>
          )}

          {/* Idle -> Primary Download Now Button */}
          {phase === 'idle' && (
            <button
              type="button"
              onClick={handleStartDownload}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <span>تحميل التحديث الآن</span>
            </button>
          )}

          {/* Active Downloading -> Pause + Cancel */}
          {isDownloading && phase !== 'verifying' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePauseDownload}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-400/30 text-amber-300 font-black text-xs transition cursor-pointer"
              >
                إيقاف مؤقت
              </button>
              {!isMandatory && (
                <button
                  type="button"
                  onClick={handleCancelDownload}
                  className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
              )}
            </div>
          )}

          {/* Paused or Failed -> Resume / Retry + Cancel */}
          {(isPaused || isFailed) && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={dlState.canResume ? handleResumeDownload : handleStartDownload}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
              >
                {dlState.canResume ? 'استئناف التنزيل' : 'إعادة المحاولة'}
              </button>
              <button
                type="button"
                onClick={handleCancelDownload}
                className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          )}

          {/* Optional Update Dismissal («لاحقًا») — preserves ongoing download in background if active */}
          {(!isMandatory || isPreview) && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0d121d] hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 font-bold text-xs border border-slate-800 transition cursor-pointer"
            >
              {isPreview ? 'إغلاق المعاينة' : 'لاحقًا'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PART 2: OWNER ADMIN APK UPLOAD & GITHUB RELEASES MANAGEMENT PANEL
// ============================================================================

export function SamiAdminUpdatePanel({
  currentUser,
  onToast,
}: {
  currentUser: any;
  onToast?: (msg: string, isError?: boolean) => void;
}) {
  const notify = useCallback(
    (msg: string, isError = false) => {
      if (onToast) onToast(msg, isError);
    },
    [onToast]
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);
  const pollTimerRef = useRef<any>(null);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [githubStatus, setGithubStatus] = useState<any>(null);
  const [vaultInfo, setVaultInfo] = useState<any>(null);
  const [signingKeyInfo, setSigningKeyInfo] = useState<any>(null);
  const [currentPublished, setCurrentPublished] = useState<CloudAppUpdateConfig | null>(null);
  const [effectiveMinVersionCode, setEffectiveMinVersionCode] = useState<number>(SAMI_FALLBACK_VERSION_CODE);
  const [historyList, setHistoryList] = useState<CloudAppUpdateConfig[]>([]);

  // Collapsible GitHub Releases Settings State (Never persisted in localStorage; token cleared after save)
  const settingsInitializedRef = useRef(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ownerInput, setOwnerInput] = useState('');
  const [repoInput, setRepoInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspectingFile, setInspectingFile] = useState(false);
  const [inspection, setInspection] = useState<ClientApkInspection | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const [uploadSpeedBps, setUploadSpeedBps] = useState(0);
  const [uploadPhaseText, setUploadPhaseText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessInfo, setUploadSuccessInfo] = useState<any>(null);

  const [actionBusy, setActionBusy] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const installedApp = getInstalledSamiAppInfo();

  const loadCloudStatusAndHistory = useCallback(async () => {
    setLoadingStatus(true);
    const serverBase = getSamiServerBaseUrl();
    const { headers } = getAuthCredentials();
    try {
      const [statusRes, histRes] = await Promise.all([
        fetch(`${serverBase}/api/app-updates/github-status?_t=${Date.now()}`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        }),
        fetch(`${serverBase}/api/app-updates/history?_t=${Date.now()}`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        }),
      ]);

      const statusData = await statusRes.json().catch(() => ({}));
      if (statusRes.ok && statusData.success) {
        const gh = statusData.github || null;
        setGithubStatus(gh);
        setVaultInfo(statusData.vault || gh?.vault || null);
        setSigningKeyInfo(statusData.signingKey || null);
        setCurrentPublished(statusData.currentPublished || null);
        setEffectiveMinVersionCode(Number(statusData.effectiveMinVersionCode) || SAMI_FALLBACK_VERSION_CODE);

        if (!settingsInitializedRef.current) {
          settingsInitializedRef.current = true;
          setOwnerInput(gh?.owner || '');
          setRepoInput(gh?.repo || '');
          if (!gh?.canPublishReleases) {
            setSettingsOpen(true);
          }
        }
      }

      const histData = await histRes.json().catch(() => ({}));
      if (histRes.ok && Array.isArray(histData.updates)) {
        setHistoryList(histData.updates);
      }
    } catch (err: any) {
      notify(err?.message || 'تعذر جلب حالة نظام التحديثات السحابي', true);
    } finally {
      setLoadingStatus(false);
    }
  }, [notify]);

  useEffect(() => {
    loadCloudStatusAndHistory();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (activeXhrRef.current) activeXhrRef.current.abort();
    };
  }, [loadCloudStatusAndHistory]);

  const handleSaveGitHubSettings = async () => {
    if (savingSettings || testingConnection || uploading) return;
    const cleanOwner = ownerInput.trim();
    const cleanRepo = repoInput.trim();
    const cleanTok = tokenInput.trim();
    const hasExistingServerToken = Boolean(githubStatus?.hasToken || vaultInfo?.hasSavedToken);

    if (!cleanOwner) {
      const msg = 'يرجى إدخال اسم مالك المستودع في حقل GITHUB_OWNER';
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
      return;
    }
    if (!cleanRepo) {
      const msg = 'يرجى إدخال اسم المستودع في حقل GITHUB_REPO';
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
      return;
    }
    if (!cleanTok && !hasExistingServerToken) {
      const msg = 'يرجى إدخال التوكن السري في حقل GITHUB_TOKEN لحفظ الإعدادات لأول مرة';
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
      return;
    }

    setSavingSettings(true);
    setSettingsFeedback(null);
    try {
      const serverBase = getSamiServerBaseUrl();
      const { headers } = getAuthCredentials();
      const res = await fetch(`${serverBase}/api/app-updates/github-settings`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          githubOwner: cleanOwner,
          githubRepo: cleanRepo,
          ...(cleanTok ? { githubToken: cleanTok } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر حفظ إعدادات GitHub Releases');
      }

      // Immediately purge token from UI memory/DOM after server save
      setTokenInput('');
      setShowToken(false);

      if (data.github) {
        setGithubStatus(data.github);
        setOwnerInput(data.github.owner || cleanOwner);
        setRepoInput(data.github.repo || cleanRepo);
      }
      if (data.vault || data.github?.vault) {
        setVaultInfo(data.vault || data.github?.vault);
      }

      const ready = Boolean(data.github?.canPublishReleases);
      const feedbackMsg =
        data.message ||
        (ready
          ? `تم حفظ الإعدادات والاتصال بالمستودع ${data.github?.fullName} بنجاح`
          : 'تم حفظ الإعدادات على الخادم');
      setSettingsFeedback({ ok: ready, text: feedbackMsg });
      notify(feedbackMsg, !ready);
    } catch (err: any) {
      const msg = err?.message || 'فشل حفظ إعدادات GitHub Releases';
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestGitHubConnection = async () => {
    if (testingConnection || savingSettings || uploading) return;
    const cleanOwner = ownerInput.trim();
    const cleanRepo = repoInput.trim();
    const cleanTok = tokenInput.trim();

    if (!cleanOwner || !cleanRepo) {
      const msg = 'يرجى إدخال GITHUB_OWNER وGITHUB_REPO أولاً لاختبار الاتصال';
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
      return;
    }

    setTestingConnection(true);
    setSettingsFeedback(null);
    try {
      const serverBase = getSamiServerBaseUrl();
      const { headers } = getAuthCredentials();
      const res = await fetch(`${serverBase}/api/app-updates/github-test`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          githubOwner: cleanOwner,
          githubRepo: cleanRepo,
          ...(cleanTok ? { githubToken: cleanTok } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.github) {
        setGithubStatus(data.github);
      }
      if (data.vault || data.github?.vault) {
        setVaultInfo(data.vault || data.github?.vault);
      }

      const ok = Boolean(res.ok && data.success && data.github?.canPublishReleases);
      const msg =
        data.message ||
        data.error ||
        (ok ? 'الاتصال بمستودع GitHub ناجح وجاهز للنشر' : 'فشل التحقق من الاتصال بمستودع GitHub');
      setSettingsFeedback({ ok, text: msg });
      notify(msg, !ok);
    } catch (err: any) {
      const msg = err?.message || 'فشل اختبار الاتصال بـ GitHub';
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleChooseApkClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const inspectSelectedApk = async (file: File) => {
    setSelectedFile(file);
    setInspection(null);
    setLocalError(null);
    setUploadError(null);
    setUploadSuccessInfo(null);

    if (!file.name.toLowerCase().endsWith('.apk')) {
      const msg = 'يرجى اختيار ملف بصيغة .apk فقط. تم رفض الملف المختار.';
      setLocalError(msg);
      notify(msg, true);
      return;
    }

    if (file.size <= 64) {
      const msg = 'ملف الـ APK المختار فارغ أو تالف.';
      setLocalError(msg);
      notify(msg, true);
      return;
    }

    setInspectingFile(true);
    try {
      // 1. Read local binary & compute SHA-256 + quick AXML parse right on client
      const arrayBuf = await file.arrayBuffer();
      const localSha256 = await computeArrayBufferSha256Hex(arrayBuf);

      // 2. Send binary to server `/api/app-updates/inspect-apk` for authoritative X.509 & AXML verification
      const serverBase = getSamiServerBaseUrl();
      const { headers } = getAuthCredentials();
      const res = await fetch(`${serverBase}/api/app-updates/inspect-apk`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/vnd.android.package-archive',
          'X-File-Name': encodeURIComponent(file.name),
        },
        body: file,
      });

      const data = await res.json().catch(() => ({}));
      if (data?.inspection) {
        const srvInsp: ClientApkInspection = {
          ...data.inspection,
          sha256: data.inspection.sha256 || localSha256,
        };
        setInspection(srvInsp);
        if (!srvInsp.canPublish && srvInsp.errors?.length > 0) {
          setLocalError(srvInsp.errors[0]);
          notify(srvInsp.errors[0], true);
        } else {
          if (!description.trim()) {
            setDescription(`تحديث تطبيق Sami الإصدار ${srvInsp.versionName} — تحسينات في الأداء والاستقرار.`);
          }
          notify(`تم فحص حزمة APK (v${srvInsp.versionName} - كود ${srvInsp.versionCode}) بنجاح ✅`);
        }
      } else {
        const errMsg = data?.error || 'تعذر قراءة بيانات ملف الـ APK المختار';
        setLocalError(errMsg);
        notify(errMsg, true);
      }
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ أثناء فحص ملف الـ APK';
      setLocalError(msg);
      notify(msg, true);
    } finally {
      setInspectingFile(false);
    }
  };

  const handleFileInputChange = (e: any) => {
    const file: File | undefined = e.target?.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    inspectSelectedApk(file);
  };

  const handleStartUploadAndPublish = () => {
    if (!selectedFile || !inspection) {
      notify('يرجى اختيار ملف APK صالح أولاً', true);
      return;
    }
    if (!inspection.canPublish) {
      notify(inspection.errors[0] || 'لا يمكن نشر هذا الملف لوجود تعارض في الإصدار أو التوقيع', true);
      return;
    }
    if (!description.trim()) {
      notify('يرجى كتابة وصف مختصر للتحديث قبل النشر', true);
      return;
    }

    const uploadId = `up_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const serverBase = getSamiServerBaseUrl();
    const { headers } = getAuthCredentials();

    setUploading(true);
    setUploadError(null);
    setUploadSuccessInfo(null);
    setUploadPercent(0);
    setUploadedBytes(0);
    setUploadTotalBytes(selectedFile.size);
    setUploadSpeedBps(0);
    setUploadPhaseText('جارٍ رفع ملف الـ APK من جهازك إلى الخادم (0%)...');

    const xhr = new XMLHttpRequest();
    activeXhrRef.current = xhr;

    let speedStartMs = Date.now();
    let speedStartBytes = 0;

    // Poll server-side GitHub Release Draft -> Asset Upload -> SHA-256 Verify -> Undraft stages once bytes arrive
    pollTimerRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${serverBase}/api/app-updates/upload-status/${encodeURIComponent(uploadId)}`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        });
        if (!r.ok) return;
        const d = await r.json();
        const job = d?.job;
        if (!job) return;
        if (job.phase !== 'receiving_apk' && typeof job.percent === 'number') {
          const mappedPct = Math.max(50, Math.min(99, Math.round(50 + (job.percent / 100) * 50)));
          setUploadPercent((prev) => Math.max(prev, mappedPct));
          if (job.phaseLabelAr) {
            setUploadPhaseText(job.phaseLabelAr);
          }
        }
      } catch {}
    }, 900);

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return;
      setUploadedBytes(ev.loaded);
      setUploadTotalBytes(ev.total);

      const now = Date.now();
      if (now - speedStartMs >= 400) {
        const bps = Math.round(((ev.loaded - speedStartBytes) * 1000) / (now - speedStartMs));
        setUploadSpeedBps(Math.max(0, bps));
        speedStartMs = now;
        speedStartBytes = ev.loaded;
      }

      // Client -> Server transfer maps cleanly across 0%..50%; Server -> GitHub Releases + Verification maps 50%..100%
      const transferRatio = ev.total > 0 ? ev.loaded / ev.total : 0;
      const uiPct = Math.min(50, Math.round(transferRatio * 50));
      setUploadPercent(uiPct);
      if (ev.loaded < ev.total) {
        setUploadPhaseText(`جارٍ رفع حزمة الـ APK (${Math.round(transferRatio * 100)}% من النقل)...`);
      } else {
        setUploadSpeedBps(0);
        setUploadPhaseText('اكتمل إرسال الملف للخادم — جارٍ الرفع والتحقق على GitHub Releases...');
      }
    };

    xhr.onload = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      activeXhrRef.current = null;
      setUploading(false);
      setUploadSpeedBps(0);

      let resp: any = {};
      try {
        resp = JSON.parse(xhr.responseText || '{}');
      } catch {}

      if (xhr.status >= 200 && xhr.status < 300 && resp.success && resp.update) {
        setUploadPercent(100);
        setUploadedBytes(selectedFile.size);
        setUploadPhaseText('اكتمل الرفع والتحقق ونشر الإصدار على GitHub Releases وFirestore بنجاح (100%)');
        setUploadSuccessInfo(resp);
        setCurrentPublished(resp.update);
        setSelectedFile(null);
        setInspection(null);
        notify(resp.message || 'تم نشر التحديث بنجاح 🚀');
        loadCloudStatusAndHistory();
      } else {
        const msg = resp?.error || `فشل رفع ونشر التحديث (HTTP ${xhr.status})`;
        setUploadError(msg);
        setUploadPhaseText('توقف النشر بسبب خطأ');
        notify(msg, true);
      }
    };

    xhr.onerror = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      activeXhrRef.current = null;
      setUploading(false);
      setUploadSpeedBps(0);
      const msg = 'انقطع الاتصال بالشبكة أثناء رفع ملف الـ APK. يمكنك الضغط على «إعادة المحاولة» دون إعادة اختيار الملف.';
      setUploadError(msg);
      setUploadPhaseText('فشل الاتصال أثناء الرفع');
      notify(msg, true);
    };

    xhr.onabort = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      activeXhrRef.current = null;
      setUploading(false);
      setUploadSpeedBps(0);
      setUploadPercent(0);
      setUploadedBytes(0);
      setUploadPhaseText('تم إلغاء عملية الرفع بناءً على طلبك');
      notify('تم إلغاء رفع ملف الـ APK');
    };

    xhr.open('POST', `${serverBase}/api/app-updates/upload-release`, true);
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.setRequestHeader('Content-Type', 'application/vnd.android.package-archive');
    xhr.setRequestHeader('X-Upload-Id', uploadId);
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(selectedFile.name));
    xhr.setRequestHeader('X-Expected-Sha256', inspection.sha256);
    xhr.setRequestHeader('X-Description-B64', encodeUtf8Base64(description.trim()));
    xhr.setRequestHeader('X-Is-Mandatory', isMandatory ? 'true' : 'false');
    xhr.send(selectedFile);
  };

  const handleCancelActiveUpload = () => {
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
    }
  };

  const handleToggleVisibility = async () => {
    if (!currentPublished || actionBusy) return;
    setActionBusy(true);
    try {
      const serverBase = getSamiServerBaseUrl();
      const { headers } = getAuthCredentials();
      const nextActive = !(currentPublished.isActive === true && !currentPublished.isHidden);
      const res = await fetch(`${serverBase}/api/app-updates/toggle`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: nextActive,
          versionCode: currentPublished.versionCode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر تغيير حالة ظهور الإصدار');
      }
      setCurrentPublished(data.update);
      notify(data.message || 'تم تحديث حالة الإصدار بنجاح');
      loadCloudStatusAndHistory();
    } catch (err: any) {
      notify(err?.message || 'فشل تغيير حالة الإصدار', true);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRollbackToVersion = async (targetVersionCode: number) => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const serverBase = getSamiServerBaseUrl();
      const { headers } = getAuthCredentials();
      const res = await fetch(`${serverBase}/api/app-updates/rollback`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionCode: targetVersionCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر الرجوع إلى الإصدار المحدد');
      }
      setCurrentPublished(data.update);
      notify(data.message || 'تم الرجوع إلى الإصدار السابق بنجاح');
      loadCloudStatusAndHistory();
    } catch (err: any) {
      notify(err?.message || 'فشل الرجوع إلى الإصدار السابق', true);
    } finally {
      setActionBusy(false);
    }
  };

  const isCurrentActive = Boolean(
    currentPublished &&
      currentPublished.isActive === true &&
      !currentPublished.isHidden &&
      currentPublished.storageSource === 'github_releases'
  );

  return (
    <div dir="rtl" className="space-y-4 text-right">
      {/* 1. System Overview & GitHub Releases Connection Card */}
      <div className="bg-[#121824] border border-amber-500/40 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-amber-300">
              نظام التحديثات السحابي عبر GitHub Releases
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              رفع مباشر لملف الـ APK، فحص آلي للتوقيع وSHA-256، وتثبيت داخلي دون روابط يدوية
            </p>
          </div>
          <button
            type="button"
            disabled={loadingStatus}
            onClick={loadCloudStatusAndHistory}
            className="px-3 py-1.5 rounded-lg bg-[#0b0f17] hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-amber-300 transition cursor-pointer"
          >
            {loadingStatus ? 'جارٍ الفحص...' : 'تحديث الحالة'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="bg-[#0b0f17] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
            <span className="text-slate-400">المستودع المستخدم حالياً:</span>
            <span
              dir="ltr"
              className={`font-bold font-['JetBrains_Mono',monospace] truncate ${
                githubStatus?.fullName ? 'text-slate-100' : 'text-slate-500'
              }`}
            >
              {githubStatus?.fullName || 'غير محدد بعد'}
            </span>
          </div>

          <div className="bg-[#0b0f17] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
            <span className="text-slate-400">حالة اتصال GitHub API:</span>
            {githubStatus?.canPublishReleases ? (
              <span className="font-black text-emerald-400">
                متصل وجاهز للنشر ({githubStatus.isPrivate ? 'خاص' : 'عام'})
              </span>
            ) : githubStatus?.exists ? (
              <span className="font-black text-amber-400">
                قراءة متاحة — يلزم التوكن أو صلاحية الكتابة
              </span>
            ) : (
              <span className="font-black text-rose-400">غير متصل</span>
            )}
          </div>

          <div className="bg-[#0b0f17] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
            <span className="text-slate-400">النسخة المثبتة على هذا الجهاز:</span>
            <span dir="ltr" className="font-bold text-slate-200 font-['JetBrains_Mono',monospace] tabular-nums">
              v{installedApp.versionName} (Code {installedApp.versionCode})
            </span>
          </div>

          <div className="bg-[#0b0f17] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
            <span className="text-slate-400">الإصدار النشط للمستخدمين:</span>
            <span className={`font-black ${isCurrentActive ? 'text-emerald-400' : 'text-slate-400'}`}>
              {isCurrentActive && currentPublished
                ? `v${currentPublished.versionName} (Code ${currentPublished.versionCode})`
                : 'لا يوجد تحديث نشط حالياً'}
            </span>
          </div>
        </div>

        {/* Original Signing Certificate Fingerprint Verification */}
        {signingKeyInfo && (
          <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-3 text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">شهادة توقيع Sami المعتمدة:</span>
              <span className={signingKeyInfo.available ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                {signingKeyInfo.available ? 'متوفرة ومطابقة ✓' : 'مفقودة ✗'}
              </span>
            </div>
            {signingKeyInfo.sha256Fingerprint && (
              <div
                dir="ltr"
                className="text-[10px] text-slate-400 font-['JetBrains_Mono',monospace] break-all"
              >
                SHA-256: {signingKeyInfo.sha256Fingerprint}
              </div>
            )}
          </div>
        )}

        {/* Clear Honest Warning When GitHub Connection Needs Setup */}
        {githubStatus && !githubStatus.canPublishReleases && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3.5 text-xs space-y-1.5">
            <div className="font-black text-amber-300">
              تنبيه إعداد GitHub Releases:
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {githubStatus.setupInstructionsAr || githubStatus.error}
            </p>
          </div>
        )}
      </div>

      {/* 1.5 Collapsible GitHub Releases Settings Section (Inside Same Page — Owner Only) */}
      <div className="bg-[#121824] border border-amber-400/30 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setSettingsOpen((prev) => !prev)}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-right hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="space-y-1 min-w-0">
            <div className="text-xs sm:text-sm font-black text-amber-300">
              ⚙️ إعدادات GitHub Releases
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span>
                المستودع الحالي:{' '}
                <strong dir="ltr" className="text-slate-200 font-['JetBrains_Mono',monospace]">
                  {githubStatus?.fullName || 'غير محدد'}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  githubStatus?.canPublishReleases
                    ? 'text-emerald-400 font-bold'
                    : githubStatus?.exists
                      ? 'text-amber-400 font-bold'
                      : 'text-rose-400 font-bold'
                }
              >
                {githubStatus?.canPublishReleases
                  ? 'متصل وجاهز للنشر'
                  : githubStatus?.exists
                    ? 'يتطلب صلاحية كتابة / توكن'
                    : 'غير متصل'}
              </span>
            </div>
          </div>

          <span className="shrink-0 px-3 py-1.5 rounded-lg bg-[#0b0f17] border border-slate-700 text-[11px] font-bold text-amber-300">
            {settingsOpen ? 'إخفاء ▲' : 'تعديل الإعدادات ▼'}
          </span>
        </button>

        {settingsOpen && (
          <div className="p-4 sm:p-5 border-t border-slate-800/80 space-y-4 text-xs">
            {/* Active Repository & Connection Live Summary */}
            <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div>
                <span className="block text-slate-400">المستودع المستخدم حالياً</span>
                <span
                  dir="ltr"
                  className="block mt-0.5 font-black text-slate-100 font-['JetBrains_Mono',monospace] break-all"
                >
                  {githubStatus?.fullName || 'لم يتم الحفظ بعد'}
                </span>
              </div>
              <div>
                <span className="block text-slate-400">حالة الاتصال بـ GitHub</span>
                <span
                  className={`block mt-0.5 font-black ${
                    githubStatus?.canPublishReleases
                      ? 'text-emerald-400'
                      : githubStatus?.exists
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {githubStatus?.canPublishReleases
                    ? `متصل (${githubStatus.isPrivate ? 'مستودع خاص' : 'مستودع عام'}) ✓`
                    : githubStatus?.exists
                      ? 'المستودع موجود — ينقص التوكن أو صلاحية الكتابة'
                      : 'غير متصل'}
                </span>
              </div>
              <div>
                <span className="block text-slate-400">حالة التوكن على الخادم</span>
                <span
                  className={`block mt-0.5 font-black ${
                    githubStatus?.hasToken || vaultInfo?.hasSavedToken ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {githubStatus?.hasToken || vaultInfo?.hasSavedToken
                    ? 'محفوظ ومؤمّن على الخادم ✓'
                    : 'غير محفوظ بعد'}
                </span>
              </div>
            </div>

            {/* 3 Editable Inputs: GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  1. <span dir="ltr" className="font-['JetBrains_Mono',monospace] text-amber-300">GITHUB_OWNER</span>{' '}
                  (اسم مالك المستودع)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  disabled={savingSettings || uploading}
                  value={ownerInput}
                  onChange={(e) => setOwnerInput(e.target.value)}
                  placeholder="owner-username"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-xl p-3 text-slate-100 text-xs font-['JetBrains_Mono',monospace] focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  2. <span dir="ltr" className="font-['JetBrains_Mono',monospace] text-amber-300">GITHUB_REPO</span>{' '}
                  (اسم المستودع)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  disabled={savingSettings || uploading}
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="repository-name"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-xl p-3 text-slate-100 text-xs font-['JetBrains_Mono',monospace] focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                3. <span dir="ltr" className="font-['JetBrains_Mono',monospace] text-amber-300">GITHUB_TOKEN</span>{' '}
                (التوكن السري — صلاحية Contents: Read and write)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showToken ? 'text' : 'password'}
                  dir="ltr"
                  disabled={savingSettings || uploading}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={
                    githubStatus?.hasToken || vaultInfo?.hasSavedToken
                      ? 'محفوظ على الخادم — اتركه فارغاً للإبقاء عليه أو أدخل توكن جديداً لاستبداله'
                      : 'github_pat_...'
                  }
                  autoComplete="new-password"
                  spellCheck={false}
                  className="flex-1 min-w-0 bg-[#0b0f17] border border-slate-700 rounded-xl p-3 text-slate-100 text-xs font-['JetBrains_Mono',monospace] focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  disabled={!tokenInput || savingSettings}
                  onClick={() => setShowToken((prev) => !prev)}
                  className="shrink-0 px-3.5 py-3 rounded-xl bg-[#0b0f17] hover:bg-slate-800 border border-slate-700 text-amber-300 font-bold text-xs transition cursor-pointer disabled:opacity-40"
                >
                  {showToken ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                يُرسل التوكن عبر اتصال مشفر إلى الخادم فقط ولا يُعاد إرساله للواجهة أو حفظه في المتصفح أو قاعدة البيانات.
              </p>
            </div>

            {/* Feedback Banner from Save / Test */}
            {settingsFeedback && (
              <div
                className={`rounded-xl p-3 border text-xs font-bold leading-relaxed ${
                  settingsFeedback.ok
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                }`}
              >
                {settingsFeedback.text}
              </div>
            )}

            {/* Honest Hosting Secret Vault Capability Notice */}
            {vaultInfo?.hostingVaultNoticeAr && (
              <div className="bg-[#0b0f17] border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200 leading-relaxed">
                {vaultInfo.hostingVaultNoticeAr}
              </div>
            )}

            {/* Action Buttons: Save GitHub Settings & Test GitHub Connection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={savingSettings || testingConnection || uploading}
                onClick={handleSaveGitHubSettings}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                {savingSettings ? 'جارٍ حفظ الإعدادات...' : 'حفظ إعدادات GitHub'}
              </button>

              <button
                type="button"
                disabled={testingConnection || savingSettings || uploading}
                onClick={handleTestGitHubConnection}
                className="w-full py-3 px-4 rounded-xl bg-[#0b0f17] hover:bg-slate-800 disabled:opacity-40 border border-amber-400/40 text-amber-300 font-black text-xs transition cursor-pointer"
              >
                {testingConnection ? 'جارٍ اختبار الاتصال...' : 'اختبار اتصال GitHub'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Primary APK Picker, Inspector & Publisher Card (NO Manual URL Input!) */}
      <div className="bg-[#121824] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-amber-400">
            رفع ونشر إصدار APK جديد (يجب أن يكون كود الإصدار أكبر من {effectiveMinVersionCode})
          </h4>
          {currentUser?.displayName && (
            <span className="text-[11px] text-slate-400">المسؤول: {currentUser.displayName}</span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".apk,application/vnd.android.package-archive"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Prominent APK File Picker Button */}
        <button
          type="button"
          disabled={uploading || inspectingFile}
          onClick={handleChooseApkClick}
          className="w-full py-4 px-4 rounded-xl bg-[#0b101c] hover:bg-[#101829] border-2 border-dashed border-amber-400/50 hover:border-amber-400 text-amber-300 font-black text-sm flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50"
        >
          <span>📦 اختيار ملف APK ورفعه</span>
        </button>

        {inspectingFile && (
          <div className="bg-[#0b0f17] border border-amber-400/30 rounded-xl p-3.5 text-xs text-amber-300 font-bold text-center">
            جارٍ قراءة حزمة الـ APK واستخراج البيانات وشهادة التوقيع وحساب SHA-256...
          </div>
        )}

        {localError && !inspection && (
          <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-3.5 text-xs text-rose-300 font-bold">
            {localError}
          </div>
        )}

        {/* Extracted APK Metadata Card (Shown Before Publishing) */}
        {inspection && (
          <div
            className={`rounded-xl p-4 border space-y-3 text-xs ${
              inspection.canPublish
                ? 'bg-[#0b111d] border-emerald-500/40'
                : 'bg-[#140c12] border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="font-black text-slate-100">بيانات حزمة الـ APK المستخرجة:</span>
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-md border ${
                  inspection.canPublish
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                {inspection.canPublish ? 'جاهز ومطابق للنشر ✓' : 'مرفوض للنشر ✗'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#080c14] p-2.5 rounded-lg border border-slate-800/80">
                <span className="block text-[10px] text-slate-400">معرّف التطبيق (applicationId)</span>
                <span
                  dir="ltr"
                  className={`block font-bold font-['JetBrains_Mono',monospace] text-[11px] mt-0.5 break-all ${
                    inspection.applicationIdMatchesSami ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {inspection.applicationId || 'غير معروف'}
                </span>
              </div>

              <div className="bg-[#080c14] p-2.5 rounded-lg border border-slate-800/80">
                <span className="block text-[10px] text-slate-400">الإصدار وكود البناء</span>
                <span
                  dir="ltr"
                  className={`block font-black font-['JetBrains_Mono',monospace] tabular-nums mt-0.5 ${
                    inspection.isHigherThanPublished ? 'text-amber-300' : 'text-rose-400'
                  }`}
                >
                  v{inspection.versionName || '?'} (Code {inspection.versionCode || 0})
                </span>
              </div>

              <div className="bg-[#080c14] p-2.5 rounded-lg border border-slate-800/80">
                <span className="block text-[10px] text-slate-400">حجم ملف الـ APK</span>
                <span
                  dir="ltr"
                  className="block font-bold text-slate-200 font-['JetBrains_Mono',monospace] tabular-nums mt-0.5"
                >
                  {formatBytesAr(inspection.fileSize)} ({inspection.fileSize.toLocaleString()} B)
                </span>
              </div>

              <div className="bg-[#080c14] p-2.5 rounded-lg border border-slate-800/80">
                <span className="block text-[10px] text-slate-400">تطابق شهادة التوقيع</span>
                <span
                  className={`block font-black mt-0.5 ${
                    inspection.signatureMatchesOriginal ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {inspection.signatureMatchesOriginal
                    ? `مطابق لشهادة Sami (${inspection.signingCertificate?.scheme.toUpperCase()}) ✓`
                    : 'غير مطابق أو غير موقّع ✗'}
                </span>
              </div>
            </div>

            <div className="bg-[#080c14] p-2.5 rounded-lg border border-slate-800/80 space-y-1 text-[10px]">
              <div className="text-slate-400">بصمة الملف (SHA-256):</div>
              <div dir="ltr" className="text-slate-200 font-['JetBrains_Mono',monospace] break-all">
                {inspection.sha256}
              </div>
              {inspection.signingCertificate?.sha256Fingerprint && (
                <>
                  <div className="text-slate-400 pt-1">بصمة شهادة التوقيع (X.509 SHA-256):</div>
                  <div dir="ltr" className="text-amber-300 font-['JetBrains_Mono',monospace] break-all">
                    {inspection.signingCertificate.sha256Fingerprint}
                  </div>
                </>
              )}
            </div>

            {inspection.errors?.length > 0 && (
              <div className="bg-rose-500/15 border border-rose-500/40 rounded-lg p-3 space-y-1 text-rose-200">
                {inspection.errors.map((errStr, i) => (
                  <div key={i} className="font-bold">
                    • {errStr}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Update Type Selector (Mandatory vs Optional) & Release Notes */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">نوع التحديث للمستخدمين:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => setIsMandatory(false)}
                className={`p-3 rounded-xl border text-right transition cursor-pointer ${
                  !isMandatory
                    ? 'bg-amber-400/15 border-amber-400 text-amber-200'
                    : 'bg-[#0b0f17] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-black text-xs">تحديث اختياري مع إمكانية اختيار «لاحقًا»</div>
                <div className="text-[10px] opacity-80 mt-0.5">يسمح للمستخدم بتأجيل التحديث ومتابعة التصفح</div>
              </button>

              <button
                type="button"
                disabled={uploading}
                onClick={() => setIsMandatory(true)}
                className={`p-3 rounded-xl border text-right transition cursor-pointer ${
                  isMandatory
                    ? 'bg-rose-500/15 border-rose-500 text-rose-200'
                    : 'bg-[#0b0f17] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-black text-xs">تحديث إلزامي</div>
                <div className="text-[10px] opacity-80 mt-0.5">يلزم المستخدم بتحميل وتثبيت التحديث قبل المتابعة</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1.5">وصف التحديث وما الجديد:</label>
            <textarea
              rows={3}
              disabled={uploading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب ميزات وتحسينات هذا الإصدار التي ستظهر للمستخدمين داخل نافذة التحديث..."
              className="w-full bg-[#0b0f17] border border-slate-700 rounded-xl p-3 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Real Upload Progress Bar (0%..100%), Uploaded Bytes / Total Bytes, Cancel & Retry */}
        {(uploading || uploadError || uploadSuccessInfo) && (
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`font-black ${
                  uploadError
                    ? 'text-rose-400'
                    : uploadSuccessInfo
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                }`}
              >
                {uploadPhaseText}
              </span>
              <span dir="ltr" className="font-black text-slate-100 font-['JetBrains_Mono',monospace] tabular-nums">
                {uploadPercent}%
              </span>
            </div>

            <GoldProgressBar
              percent={uploadPercent}
              variant={uploadError ? 'rose' : uploadSuccessInfo ? 'emerald' : 'gold'}
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-['JetBrains_Mono',monospace] tabular-nums">
              <span dir="ltr">
                {formatBytesAr(uploadedBytes)} / {formatBytesAr(uploadTotalBytes)}
              </span>
              <span dir="ltr" className="text-amber-300">
                {uploading && uploadSpeedBps > 0 ? formatSpeedAr(uploadSpeedBps) : ''}
              </span>
            </div>

            {uploadError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-rose-300 font-bold leading-relaxed">
                {uploadError}
              </div>
            )}

            {uploadSuccessInfo?.githubRelease && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-200 space-y-1 text-[11px]">
                <div className="font-black">
                  ✓ تم النشر رسمياً على GitHub Releases ({uploadSuccessInfo.githubRelease.releaseTag}) وحفظ السجل في Firestore!
                </div>
                <div dir="ltr" className="text-[10px] font-['JetBrains_Mono',monospace] text-emerald-300/90 break-all">
                  Asset: {uploadSuccessInfo.githubRelease.assetName} | Verified SHA-256: {uploadSuccessInfo.githubRelease.sha256}
                </div>
              </div>
            )}

            {uploading && (
              <button
                type="button"
                onClick={handleCancelActiveUpload}
                className="w-full py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-black text-xs transition cursor-pointer"
              >
                إلغاء الرفع
              </button>
            )}

            {!uploading && uploadError && selectedFile && inspection?.canPublish && (
              <button
                type="button"
                onClick={handleStartUploadAndPublish}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer"
              >
                إعادة المحاولة لرفع ونشر الملف
              </button>
            )}
          </div>
        )}

        {/* Primary Publish Action & Modal Preview */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={uploading || inspectingFile || !selectedFile || !inspection?.canPublish}
            onClick={handleStartUploadAndPublish}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <span>
              {uploading ? 'جارٍ الرفع والتحقق والنشر...' : 'رفع ونشر التحديث عبر GitHub Releases 🚀'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="flex-1 py-2.5 rounded-xl bg-[#0b0f17] hover:bg-slate-800 text-amber-300 font-bold text-xs border border-amber-400/30 transition cursor-pointer"
            >
              معاينة نافذة التحديث للمستخدم
            </button>

            {currentPublished && currentPublished.storageSource === 'github_releases' && (
              <button
                type="button"
                disabled={actionBusy || uploading}
                onClick={handleToggleVisibility}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs border transition cursor-pointer disabled:opacity-50 ${
                  isCurrentActive
                    ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-300'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                }`}
              >
                {isCurrentActive ? '⏸️ إيقاف الإصدار مؤقتاً' : '▶️ تفعيل الإصدار للمستخدمين'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Release History & Rollback Section */}
      <div className="bg-[#121824] border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-amber-400">
            سجل الإصدارات المنشورة والرجوع لإصدار سابق (Rollback)
          </h4>
          <span className="text-[11px] text-slate-400 font-['JetBrains_Mono',monospace] tabular-nums">
            {historyList.length} إصدار
          </span>
        </div>

        {historyList.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">لا توجد سجلات إصدارات محفوظة بعد.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {historyList.map((item) => {
              const isItemActive =
                item.isActive === true &&
                !item.isHidden &&
                currentPublished?.versionCode === item.versionCode &&
                item.storageSource === 'github_releases';
              const isGitHubBacked = item.storageSource === 'github_releases' && Boolean(item.sha256);

              return (
                <div
                  key={`${item.versionCode}_${item.id}`}
                  className="bg-[#0b0f17] border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        dir="ltr"
                        className="font-black text-slate-100 font-['JetBrains_Mono',monospace] tabular-nums"
                      >
                        v{item.versionName} (Code {item.versionCode})
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                          isItemActive
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : isGitHubBacked
                              ? 'bg-slate-800 border-slate-700 text-slate-300'
                              : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        {isItemActive ? 'منشور ونشط' : isGitHubBacked ? 'متوقف (GitHub Release)' : 'سجل قديم (متوقف)'}
                      </span>
                      {item.releaseTag && (
                        <span
                          dir="ltr"
                          className="text-[10px] text-amber-300 font-['JetBrains_Mono',monospace]"
                        >
                          {item.releaseTag}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {item.fileSize ? `${formatBytesAr(item.fileSize)} • ` : ''}
                      {item.isMandatory ? 'إلزامي' : 'اختياري'}
                      {item.description ? ` • ${item.description.slice(0, 70)}` : ''}
                    </div>
                  </div>

                  {isGitHubBacked && !isItemActive && (
                    <button
                      type="button"
                      disabled={actionBusy || uploading}
                      onClick={() => handleRollbackToVersion(item.versionCode)}
                      className="px-3 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 font-black text-[11px] transition cursor-pointer disabled:opacity-50"
                    >
                      اعتماد هذا الإصدار
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Preview */}
      {showPreviewModal && (
        <SamiUserUpdateModal
          isOpen={showPreviewModal}
          isPreview={true}
          onDismiss={() => setShowPreviewModal(false)}
          config={
            inspection
              ? {
                  versionName: inspection.versionName || '1.3.2',
                  versionCode: inspection.versionCode || effectiveMinVersionCode + 1,
                  description: description.trim() || 'تحديث تجريبي للمعاينة داخل لوحة الإدارة',
                  fileSize: inspection.fileSize,
                  sha256: inspection.sha256,
                  signingCertSha256: inspection.signingCertificate?.sha256Fingerprint,
                  applicationId: inspection.applicationId,
                  storageSource: 'github_releases',
                  downloadUrl: '',
                  isMandatory,
                  isActive: true,
                  isHidden: false,
                }
              : currentPublished && currentPublished.storageSource === 'github_releases'
                ? currentPublished
                : {
                    versionName: '1.3.2',
                    versionCode: effectiveMinVersionCode + 1,
                    description: description.trim() || 'تحسينات شاملة في الأداء وتثبيت التحديثات المباشر من داخل تطبيق Sami.',
                    fileSize: 28 * 1024 * 1024,
                    storageSource: 'github_releases',
                    downloadUrl: '',
                    isMandatory,
                    isActive: true,
                    isHidden: false,
                  }
          }
        />
      )}
    </div>
  );
}

// ============================================================================
// EXPOSE GLOBALS FOR SAMI BUNDLE INTEGRATION
// ============================================================================

if (typeof window !== 'undefined') {
  const w = window as any;
  w.SamiUserUpdateModal = SamiUserUpdateModal;
  w.SamiAdminUpdatePanel = SamiAdminUpdatePanel;
  w.shouldShowSamiCloudUpdate = shouldShowCloudAppUpdate;
  w.getInstalledSamiAppInfo = getInstalledSamiAppInfo;
  w.getSamiServerBaseUrl = getSamiServerBaseUrl;
}
