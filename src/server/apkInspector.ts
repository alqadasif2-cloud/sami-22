import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import JSZip from 'jszip';

/**
 * Sami APK Binary Inspector & Signing Certificate Verifier
 * - Parses compiled Android binary XML (AXML) inside AndroidManifest.xml
 * - Extracts applicationId, versionCode, versionName, minSdkVersion, targetSdkVersion
 * - Extracts X.509 signing certificates from APK Signature Scheme v2/v3 blocks & v1 META-INF PKCS#7
 * - Computes full-file SHA-256 and signing certificate SHA-256 fingerprint
 * - Verifies strict upgrade compatibility with Sami's original signing certificate
 */

export const SAMI_APPLICATION_ID = 'com.sami.tradingchallengetracker';
export const SAMI_INSTALLED_BASELINE_VERSION_CODE = 15;
export const SAMI_INSTALLED_BASELINE_VERSION_NAME = '1.3.1';

export interface SigningCertificateInfo {
  sha256Fingerprint: string; // Uppercase colon-separated: 0D:63:B2:...
  sha256Hex: string; // Lowercase continuous hex: 0d63b2...
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  scheme: 'v2' | 'v3' | 'v1';
}

export interface OriginalSigningKeyStatus {
  available: boolean;
  keystorePath: string;
  sha256Fingerprint: string | null;
  sha256Hex: string | null;
  subject: string | null;
  error?: string;
}

export interface ApkInspectionResult {
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
  signingCertificate: SigningCertificateInfo | null;
  originalKeyStatus: OriginalSigningKeyStatus;
  signatureMatchesOriginal: boolean;
  applicationIdMatchesSami: boolean;
  isHigherThanPublished: boolean;
  publishedVersionCode: number;
  installedBaselineVersionCode: number;
  canPublish: boolean;
  errors: string[];
  warnings: string[];
}

let cachedOriginalKeyStatus: OriginalSigningKeyStatus | null = null;

export function normalizeFingerprintHex(fp: string): string {
  return String(fp || '')
    .replace(/[^a-fA-F0-9]/g, '')
    .toLowerCase();
}

export function formatColonFingerprint(hexOrFp: string): string {
  const clean = normalizeFingerprintHex(hexOrFp).toUpperCase();
  if (clean.length !== 64) return hexOrFp.toUpperCase();
  return clean.match(/.{1,2}/g)!.join(':');
}

/**
 * Reads the authoritative original Sami signing certificate directly from `app/sami-signing-key.p12`.
 * Never substitutes or generates a new certificate.
 */
export function getOriginalSamiSigningKeyStatus(): OriginalSigningKeyStatus {
  if (cachedOriginalKeyStatus) return cachedOriginalKeyStatus;

  const keystorePath = path.resolve('app/sami-signing-key.p12');
  if (!fs.existsSync(keystorePath)) {
    cachedOriginalKeyStatus = {
      available: false,
      keystorePath,
      sha256Fingerprint: null,
      sha256Hex: null,
      subject: null,
      error: 'ملف مفتاح التوقيع الأصلي (app/sami-signing-key.p12) غير موجود في المشروع. يلزم توفر مفتاح التوقيع الأصلي لضمان التحديث فوق النسخة السابقة دون حذفها.',
    };
    return cachedOriginalKeyStatus;
  }

  try {
    // Extract PEM certificate from PKCS#12 keystore using openssl (read-only)
    const pem = execFileSync(
      'openssl',
      ['pkcs12', '-in', keystorePath, '-passin', 'pass:samitrading', '-nokeys', '-clcerts'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const certMatch = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
    if (!certMatch) {
      throw new Error('لم يتم العثور على شهادة X.509 داخل ملف التوقيع الأصلي');
    }
    const x509 = new crypto.X509Certificate(certMatch[0]);
    const fpColon = formatColonFingerprint(x509.fingerprint256);
    cachedOriginalKeyStatus = {
      available: true,
      keystorePath,
      sha256Fingerprint: fpColon,
      sha256Hex: normalizeFingerprintHex(fpColon),
      subject: x509.subject,
    };
    return cachedOriginalKeyStatus;
  } catch (err: any) {
    cachedOriginalKeyStatus = {
      available: false,
      keystorePath,
      sha256Fingerprint: null,
      sha256Hex: null,
      subject: null,
      error: `تعذر قراءة شهادة التوقيع الأصلية: ${err?.message || String(err)}`,
    };
    return cachedOriginalKeyStatus;
  }
}

// ============================================================================
// 1. ANDROID BINARY XML (AXML) MANIFEST PARSER
// ============================================================================

const RES_STRING_POOL_TYPE = 0x0001;
const RES_XML_TYPE = 0x0003;
const RES_XML_RESOURCE_MAP_TYPE = 0x0180;
const RES_XML_START_ELEMENT_TYPE = 0x0102;

const ATTR_VERSION_CODE = 0x0101021b;
const ATTR_VERSION_CODE_MAJOR = 0x01010576;
const ATTR_VERSION_NAME = 0x0101021c;
const ATTR_MIN_SDK = 0x0101020c;
const ATTR_TARGET_SDK = 0x01010270;

const TYPE_STRING = 0x03;
const TYPE_INT_DEC = 0x10;
const TYPE_INT_HEX = 0x11;
const TYPE_INT_BOOLEAN = 0x12;

function readUtf8Len(buf: Buffer, offset: number): { len: number; bytesRead: number } {
  const b0 = buf[offset];
  if ((b0 & 0x80) !== 0) {
    const b1 = buf[offset + 1];
    return { len: ((b0 & 0x7f) << 8) | b1, bytesRead: 2 };
  }
  return { len: b0, bytesRead: 1 };
}

function readUtf16Len(buf: Buffer, offset: number): { charLen: number; bytesRead: number } {
  const u0 = buf.readUInt16LE(offset);
  if ((u0 & 0x8000) !== 0) {
    const u1 = buf.readUInt16LE(offset + 2);
    return { charLen: ((u0 & 0x7fff) << 16) | u1, bytesRead: 4 };
  }
  return { charLen: u0, bytesRead: 2 };
}

export interface ParsedAndroidManifest {
  applicationId: string;
  versionCode: number;
  versionName: string;
  minSdkVersion?: number;
  targetSdkVersion?: number;
}

export function parseBinaryAndroidManifest(buf: Buffer): ParsedAndroidManifest {
  if (buf.length < 16) {
    throw new Error('ملف AndroidManifest.xml فارغ أو تالف');
  }

  // Plain-text XML fallback (rare, e.g. uncompiled manifest)
  const headStr = buf.subarray(0, Math.min(200, buf.length)).toString('utf8');
  if (headStr.trimStart().startsWith('<?xml') || headStr.trimStart().startsWith('<manifest')) {
    const xml = buf.toString('utf8');
    const pkg = /package\s*=\s*["']([^"']+)["']/.exec(xml)?.[1] || '';
    const vc = parseInt(/versionCode\s*=\s*["'](\d+)["']/.exec(xml)?.[1] || '0', 10);
    const vn = /versionName\s*=\s*["']([^"']+)["']/.exec(xml)?.[1] || '';
    const minSdk = parseInt(/minSdkVersion\s*=\s*["'](\d+)["']/.exec(xml)?.[1] || '0', 10) || undefined;
    const targetSdk = parseInt(/targetSdkVersion\s*=\s*["'](\d+)["']/.exec(xml)?.[1] || '0', 10) || undefined;
    if (!pkg || !vc) {
      throw new Error('تعذر استخراج بيانات الحزمة من AndroidManifest.xml');
    }
    return { applicationId: pkg, versionCode: vc, versionName: vn || String(vc), minSdkVersion: minSdk, targetSdkVersion: targetSdk };
  }

  const rootType = buf.readUInt16LE(0);
  const rootHeaderSize = buf.readUInt16LE(2);
  if (rootType !== RES_XML_TYPE) {
    throw new Error('تنسيق AndroidManifest.xml الثنائي (AXML) غير صالح');
  }

  let strings: string[] = [];
  let resourceIds: number[] = [];

  let applicationId = '';
  let versionCode = 0;
  let versionCodeMajor = 0;
  let versionName = '';
  let minSdkVersion: number | undefined;
  let targetSdkVersion: number | undefined;

  let offset = rootHeaderSize;
  while (offset + 8 <= buf.length) {
    const chunkType = buf.readUInt16LE(offset);
    const headerSize = buf.readUInt16LE(offset + 2);
    const chunkSize = buf.readUInt32LE(offset + 4);

    if (chunkSize < 8 || offset + chunkSize > buf.length) {
      break;
    }

    if (chunkType === RES_STRING_POOL_TYPE) {
      const stringCount = buf.readUInt32LE(offset + 8);
      const flags = buf.readUInt32LE(offset + 16);
      const stringsStart = buf.readUInt32LE(offset + 20);
      const isUtf8 = (flags & (1 << 8)) !== 0;

      const offsetsBase = offset + headerSize;
      const poolBase = offset + stringsStart;
      strings = new Array(stringCount);

      for (let i = 0; i < stringCount; i++) {
        if (offsetsBase + (i + 1) * 4 > offset + chunkSize) {
          strings[i] = '';
          continue;
        }
        const strRelOffset = buf.readUInt32LE(offsetsBase + i * 4);
        const pos = poolBase + strRelOffset;
        if (pos >= offset + chunkSize) {
          strings[i] = '';
          continue;
        }
        try {
          if (isUtf8) {
            const charLenInfo = readUtf8Len(buf, pos);
            const byteLenInfo = readUtf8Len(buf, pos + charLenInfo.bytesRead);
            const startByte = pos + charLenInfo.bytesRead + byteLenInfo.bytesRead;
            strings[i] = buf.subarray(startByte, startByte + byteLenInfo.len).toString('utf8');
          } else {
            const lenInfo = readUtf16Len(buf, pos);
            const startByte = pos + lenInfo.bytesRead;
            strings[i] = buf.subarray(startByte, startByte + lenInfo.charLen * 2).toString('utf16le');
          }
        } catch {
          strings[i] = '';
        }
      }
    } else if (chunkType === RES_XML_RESOURCE_MAP_TYPE) {
      const count = Math.floor((chunkSize - headerSize) / 4);
      resourceIds = new Array(count);
      for (let i = 0; i < count; i++) {
        resourceIds[i] = buf.readUInt32LE(offset + headerSize + i * 4);
      }
    } else if (chunkType === RES_XML_START_ELEMENT_TYPE) {
      const nameIdx = buf.readInt32LE(offset + 20);
      const attrStart = buf.readUInt16LE(offset + 24);
      const attrSize = buf.readUInt16LE(offset + 26);
      const attrCount = buf.readUInt16LE(offset + 28);

      const tagName = nameIdx >= 0 && nameIdx < strings.length ? strings[nameIdx] : '';
      const attrsBase = offset + 16 + attrStart;
      const step = attrSize >= 20 ? attrSize : 20;

      for (let i = 0; i < attrCount; i++) {
        const aPos = attrsBase + i * step;
        if (aPos + 20 > offset + chunkSize) break;

        const attrNameIdx = buf.readInt32LE(aPos + 4);
        const rawValueIdx = buf.readInt32LE(aPos + 8);
        const dataType = buf.readUInt8(aPos + 15);
        const dataVal = buf.readUInt32LE(aPos + 16);

        const attrName = attrNameIdx >= 0 && attrNameIdx < strings.length ? strings[attrNameIdx] : '';
        const resId = attrNameIdx >= 0 && attrNameIdx < resourceIds.length ? resourceIds[attrNameIdx] : 0;

        const strVal =
          rawValueIdx >= 0 && rawValueIdx < strings.length
            ? strings[rawValueIdx]
            : dataType === TYPE_STRING && dataVal < strings.length
              ? strings[dataVal]
              : '';

        if (tagName === 'manifest') {
          if (attrName === 'package' && strVal) {
            applicationId = strVal;
          } else if (resId === ATTR_VERSION_CODE || attrName === 'versionCode') {
            if (dataType === TYPE_INT_DEC || dataType === TYPE_INT_HEX || dataType === TYPE_INT_BOOLEAN) {
              versionCode = dataVal;
            } else if (strVal && /^\d+$/.test(strVal)) {
              versionCode = parseInt(strVal, 10);
            }
          } else if (resId === ATTR_VERSION_CODE_MAJOR || attrName === 'versionCodeMajor') {
            versionCodeMajor = dataVal;
          } else if (resId === ATTR_VERSION_NAME || attrName === 'versionName') {
            versionName = strVal || String(dataVal || '');
          }
        } else if (tagName === 'uses-sdk') {
          if (resId === ATTR_MIN_SDK || attrName === 'minSdkVersion') {
            minSdkVersion = dataVal || (strVal ? parseInt(strVal, 10) : undefined);
          } else if (resId === ATTR_TARGET_SDK || attrName === 'targetSdkVersion') {
            targetSdkVersion = dataVal || (strVal ? parseInt(strVal, 10) : undefined);
          }
        }
      }
    }

    offset += chunkSize;
  }

  const finalVersionCode =
    versionCodeMajor > 0 ? Number((BigInt(versionCodeMajor) << 32n) | BigInt(versionCode)) : versionCode;

  if (!applicationId) {
    throw new Error('تعذر استخراج معرّف الحزمة (applicationId) من ملف APK');
  }
  if (!finalVersionCode || finalVersionCode <= 0) {
    throw new Error('تعذر استخراج كود الإصدار الرقمي (versionCode) من ملف APK');
  }

  return {
    applicationId,
    versionCode: finalVersionCode,
    versionName: versionName || String(finalVersionCode),
    minSdkVersion,
    targetSdkVersion,
  };
}

// ============================================================================
// 2. APK SIGNATURE SCHEME v2 / v3 & v1 CERTIFICATE EXTRACTOR
// ============================================================================

const APK_SIG_BLOCK_MAGIC_LO = 0x20676953204b5041n; // "APK Sig "
const APK_SIG_BLOCK_MAGIC_HI = 0x3234206b636f6c42n; // "Block 42"
const APK_SIGNATURE_SCHEME_V2_BLOCK_ID = 0x7109871a;
const APK_SIGNATURE_SCHEME_V3_BLOCK_ID = 0xf05368c0;

function findZipEndOfCentralDirectory(buf: Buffer): number {
  const minEocdSize = 22;
  if (buf.length < minEocdSize) return -1;
  const maxCommentLen = Math.min(0xffff, buf.length - minEocdSize);
  for (let commentLen = 0; commentLen <= maxCommentLen; commentLen++) {
    const pos = buf.length - minEocdSize - commentLen;
    if (buf.readUInt32LE(pos) === 0x06054b50) {
      const recordedCommentLen = buf.readUInt16LE(pos + 20);
      if (recordedCommentLen === commentLen) {
        return pos;
      }
    }
  }
  return -1;
}

function parseX509FromDer(der: Buffer, scheme: 'v2' | 'v3' | 'v1'): SigningCertificateInfo | null {
  try {
    const x509 = new crypto.X509Certificate(der);
    const fpColon = formatColonFingerprint(x509.fingerprint256);
    return {
      sha256Fingerprint: fpColon,
      sha256Hex: normalizeFingerprintHex(fpColon),
      subject: x509.subject,
      issuer: x509.issuer,
      validFrom: x509.validFrom,
      validTo: x509.validTo,
      serialNumber: x509.serialNumber,
      scheme,
    };
  } catch {
    return null;
  }
}

function parseLengthPrefixedCertFromV2OrV3Block(blockValue: Buffer, scheme: 'v2' | 'v3'): SigningCertificateInfo | null {
  try {
    if (blockValue.length < 12) return null;
    const signersLen = blockValue.readUInt32LE(0);
    if (signersLen < 4 || 4 + signersLen > blockValue.length) return null;

    const firstSignerLen = blockValue.readUInt32LE(4);
    if (firstSignerLen < 8 || 8 + firstSignerLen > 4 + signersLen) return null;

    const signerBuf = blockValue.subarray(8, 8 + firstSignerLen);
    const signedDataLen = signerBuf.readUInt32LE(0);
    if (signedDataLen < 8 || 4 + signedDataLen > signerBuf.length) return null;

    const signedData = signerBuf.subarray(4, 4 + signedDataLen);
    const digestsLen = signedData.readUInt32LE(0);
    const certsOffset = 4 + digestsLen;
    if (certsOffset + 8 > signedData.length) return null;

    const certsTotalLen = signedData.readUInt32LE(certsOffset);
    if (certsTotalLen < 4 || certsOffset + 4 + certsTotalLen > signedData.length) return null;

    const firstCertLen = signedData.readUInt32LE(certsOffset + 4);
    const certStart = certsOffset + 8;
    if (firstCertLen < 64 || certStart + firstCertLen > signedData.length) return null;

    const certDer = signedData.subarray(certStart, certStart + firstCertLen);
    return parseX509FromDer(certDer, scheme);
  } catch {
    return null;
  }
}

function extractSigningCertFromV2V3Block(apkBuf: Buffer): SigningCertificateInfo | null {
  const eocdOffset = findZipEndOfCentralDirectory(apkBuf);
  if (eocdOffset < 0) return null;

  const centralDirOffset = apkBuf.readUInt32LE(eocdOffset + 16);
  if (centralDirOffset < 32 || centralDirOffset > eocdOffset) return null;

  const magicLo = apkBuf.readBigUInt64LE(centralDirOffset - 16);
  const magicHi = apkBuf.readBigUInt64LE(centralDirOffset - 8);
  if (magicLo !== APK_SIG_BLOCK_MAGIC_LO || magicHi !== APK_SIG_BLOCK_MAGIC_HI) {
    return null;
  }

  const sizeInFooter = Number(apkBuf.readBigUInt64LE(centralDirOffset - 24));
  const blockStart = centralDirOffset - sizeInFooter - 8;
  if (blockStart < 0 || blockStart + 8 >= centralDirOffset - 24) return null;

  const sizeInHeader = Number(apkBuf.readBigUInt64LE(blockStart));
  if (sizeInHeader !== sizeInFooter) return null;

  let pairsPos = blockStart + 8;
  const pairsEnd = centralDirOffset - 24;

  let v3Cert: SigningCertificateInfo | null = null;
  let v2Cert: SigningCertificateInfo | null = null;

  while (pairsPos + 12 <= pairsEnd) {
    const pairLen = Number(apkBuf.readBigUInt64LE(pairsPos));
    if (pairLen < 4 || pairsPos + 8 + pairLen > pairsEnd) break;
    const id = apkBuf.readUInt32LE(pairsPos + 8);
    const val = apkBuf.subarray(pairsPos + 12, pairsPos + 8 + pairLen);

    if (id === APK_SIGNATURE_SCHEME_V3_BLOCK_ID && !v3Cert) {
      v3Cert = parseLengthPrefixedCertFromV2OrV3Block(val, 'v3');
    } else if (id === APK_SIGNATURE_SCHEME_V2_BLOCK_ID && !v2Cert) {
      v2Cert = parseLengthPrefixedCertFromV2OrV3Block(val, 'v2');
    }
    pairsPos += 8 + pairLen;
  }

  return v3Cert || v2Cert;
}

function extractSigningCertFromPkcs7Der(pkcs7Buf: Buffer): SigningCertificateInfo | null {
  // Scan ASN.1 SEQUENCE (0x30 0x82 lenHi lenLo) candidates inside META-INF/*.RSA|*.EC|*.DSA
  for (let i = 0; i + 4 < pkcs7Buf.length; i++) {
    if (pkcs7Buf[i] === 0x30 && pkcs7Buf[i + 1] === 0x82) {
      const seqLen = (pkcs7Buf[i + 2] << 8) | pkcs7Buf[i + 3];
      const totalLen = 4 + seqLen;
      if (seqLen >= 256 && i + totalLen <= pkcs7Buf.length) {
        // Check if inner element looks like TBSCertificate SEQUENCE
        if (pkcs7Buf[i + 4] === 0x30) {
          const parsed = parseX509FromDer(pkcs7Buf.subarray(i, i + totalLen), 'v1');
          if (parsed) return parsed;
        }
      }
    }
  }
  return null;
}

// ============================================================================
// 3. FULL APK ARCHIVE INSPECTION & COMPATIBILITY VALIDATION
// ============================================================================

export async function inspectApkBuffer(params: {
  buffer: Buffer;
  fileName: string;
  publishedVersionCode: number;
}): Promise<ApkInspectionResult> {
  const { buffer, fileName, publishedVersionCode } = params;
  const errors: string[] = [];
  const warnings: string[] = [];
  const cleanName = String(fileName || '').trim();
  const originalKeyStatus = getOriginalSamiSigningKeyStatus();

  if (!cleanName.toLowerCase().endsWith('.apk')) {
    errors.push('يرجى اختيار ملف بصيغة .apk صالحة فقط');
  }

  if (!buffer || buffer.length < 64) {
    errors.push('ملف الـ APK فارغ أو غير مكتمل');
  } else if (buffer.readUInt32LE(0) !== 0x04034b50) {
    errors.push('الملف المرفوع ليس حزمة Android APK صالحة (ترويسة الأرشيف غير صحيحة)');
  }

  const sha256 = buffer && buffer.length > 0 ? crypto.createHash('sha256').update(buffer).digest('hex') : '';

  if (!originalKeyStatus.available) {
    errors.push(
      originalKeyStatus.error ||
        'شهادة التوقيع الأصلية لتطبيق Sami غير متوفرة للتحقق من توافق الترقية فوق النسخة السابقة'
    );
  }

  let applicationId = '';
  let versionName = '';
  let versionCode = 0;
  let minSdkVersion: number | undefined;
  let targetSdkVersion: number | undefined;
  let hasClassesDex = false;
  let signingCertificate: SigningCertificateInfo | null = null;

  if (buffer && buffer.length >= 64 && buffer.readUInt32LE(0) === 0x04034b50) {
    // 1. Extract v2/v3 signing certificate from raw APK Signing Block first
    signingCertificate = extractSigningCertFromV2V3Block(buffer);

    // 2. Open ZIP entries to inspect AndroidManifest.xml, classes.dex, and v1 META-INF fallback
    try {
      const zip = await JSZip.loadAsync(buffer);
      const manifestEntry = zip.file('AndroidManifest.xml');
      const dexEntry = zip.file('classes.dex');
      hasClassesDex = Boolean(dexEntry);

      if (!manifestEntry) {
        errors.push('الملف لا يحتوي على AndroidManifest.xml وليس تطبيق Android صالحاً');
      } else {
        const manifestBuf = await manifestEntry.async('nodebuffer');
        const parsedManifest = parseBinaryAndroidManifest(manifestBuf);
        applicationId = parsedManifest.applicationId;
        versionCode = parsedManifest.versionCode;
        versionName = parsedManifest.versionName;
        minSdkVersion = parsedManifest.minSdkVersion;
        targetSdkVersion = parsedManifest.targetSdkVersion;
      }

      if (!hasClassesDex) {
        errors.push('ملف الـ APK لا يحتوي على الكود التنفيذي للتطبيق (classes.dex)');
      }

      if (!signingCertificate) {
        const metaCertFiles = Object.keys(zip.files).filter((k) =>
          /^META-INF\/[^/]+\.(RSA|EC|DSA)$/i.test(k)
        );
        for (const certFileKey of metaCertFiles) {
          const certBuf = await zip.files[certFileKey].async('nodebuffer');
          const v1Cert = extractSigningCertFromPkcs7Der(certBuf);
          if (v1Cert) {
            signingCertificate = v1Cert;
            break;
          }
        }
      }
    } catch (err: any) {
      errors.push(`ملف الـ APK تالف أو غير قابل للقراءة: ${err?.message || String(err)}`);
    }
  }

  const applicationIdMatchesSami = applicationId === SAMI_APPLICATION_ID;
  if (applicationId && !applicationIdMatchesSami) {
    errors.push(
      `معرّف الحزمة (${applicationId}) لا يطابق تطبيق Sami المثبت (${SAMI_APPLICATION_ID})`
    );
  }

  const minRequiredAbove = Math.max(publishedVersionCode || 0, SAMI_INSTALLED_BASELINE_VERSION_CODE);
  const isHigherThanPublished = versionCode > minRequiredAbove;

  if (versionCode > 0 && versionCode <= publishedVersionCode) {
    errors.push(
      `لا يمكن نشر كود الإصدار (${versionCode}) لأنه أقل من أو يساوي الإصدار المنشور حالياً (${publishedVersionCode}). يجب رفع إصدار برقم versionCode أعلى.`
    );
  } else if (versionCode > 0 && versionCode <= SAMI_INSTALLED_BASELINE_VERSION_CODE) {
    errors.push(
      `لا يمكن نشر كود الإصدار (${versionCode}) لأنه أقل من أو يساوي كود إصدار تطبيق Sami الحالي (${SAMI_INSTALLED_BASELINE_VERSION_CODE}). يجب أن يكون versionCode أكبر من ${SAMI_INSTALLED_BASELINE_VERSION_CODE}.`
    );
  }

  let signatureMatchesOriginal = false;
  if (!signingCertificate) {
    errors.push('ملف الـ APK غير موقّع بشهادة توقيع Android صالحة (لم يتم العثور على توقيع v1/v2/v3)');
  } else if (originalKeyStatus.available && originalKeyStatus.sha256Hex) {
    signatureMatchesOriginal = signingCertificate.sha256Hex === originalKeyStatus.sha256Hex;
    if (!signatureMatchesOriginal) {
      errors.push(
        `بصمة شهادة توقيع الـ APK (${signingCertificate.sha256Fingerprint.slice(0, 23)}...) تختلف عن شهادة توقيع تطبيق Sami الأصلية (${originalKeyStatus.sha256Fingerprint?.slice(0, 23)}...). سيرفض Android تثبيت التحديث فوق النسخة الحالية.`
      );
    }
  }

  const valid =
    errors.length === 0 &&
    Boolean(applicationId) &&
    versionCode > 0 &&
    hasClassesDex &&
    applicationIdMatchesSami &&
    signatureMatchesOriginal &&
    isHigherThanPublished;

  return {
    valid,
    fileName: cleanName,
    fileSize: buffer ? buffer.length : 0,
    sha256,
    applicationId,
    versionName,
    versionCode,
    minSdkVersion,
    targetSdkVersion,
    hasClassesDex,
    signingCertificate,
    originalKeyStatus,
    signatureMatchesOriginal,
    applicationIdMatchesSami,
    isHigherThanPublished,
    publishedVersionCode,
    installedBaselineVersionCode: minRequiredAbove,
    canPublish: valid,
    errors,
    warnings,
  };
}
