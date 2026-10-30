import crypto from 'crypto';
import fs from 'fs';
import { Readable } from 'stream';
import type { Response } from 'express';
import {
  getKnownSecretTokensForRedaction,
  getResolvedGitHubCredentials,
  parseOwnerAndRepoInput,
  sanitizeGitHubSlug,
  type VaultPublicStatus,
} from './githubSecretVault.ts';

/**
 * GitHub Releases Cloud Update Storage Service (Sole APK Storage Backend)
 * - Uses GitHub REST API (2022-11-28) exclusively for storing Sami APK releases
 * - Never exposes GITHUB_TOKEN to clients, logs, error messages, or Firestore
 * - Contains zero hardcoded repository or owner names
 * - Enforces atomic Draft -> Upload Asset -> Verify Asset & SHA-256 -> Undraft Release flow
 * - Cleans up incomplete Draft Releases automatically if any step fails or is aborted
 * - Supports both Public repositories (direct official Release Asset URL) and Private repositories (authenticated server streaming proxy with HTTP Range support)
 */

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

export const GITHUB_MAX_RELEASE_ASSET_BYTES = 2 * 1024 * 1024 * 1024 - 1; // 2 GiB GitHub Releases limit
export const SERVER_MAX_APK_UPLOAD_BYTES = 350 * 1024 * 1024; // 350 MB practical Cloud Run streaming limit

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
  hasToken: boolean;
  vault: VaultPublicStatus;
}

export async function resolveGitHubConfig(): Promise<GitHubConfig> {
  const resolved = await getResolvedGitHubCredentials();
  return {
    owner: resolved.owner,
    repo: resolved.repo,
    token: resolved.token,
    hasToken: resolved.hasToken,
    vault: resolved.vault,
  };
}

/**
 * Scrubs any token or credential pattern so secrets NEVER appear in logs or client errors.
 */
export function redactGitHubSecrets(input: unknown): string {
  let msg = input instanceof Error ? input.message : String(input || '');
  const tokens = getKnownSecretTokensForRedaction();
  for (const token of tokens) {
    if (token && token.length >= 4) {
      msg = msg.split(token).join('[REDACTED_GITHUB_TOKEN]');
    }
  }
  msg = msg.replace(/github_pat_[A-Za-z0-9_]+/g, '[REDACTED_GITHUB_PAT]');
  msg = msg.replace(/gh[pousr]_[A-Za-z0-9_]+/g, '[REDACTED_GITHUB_TOKEN]');
  msg = msg.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]');
  return msg;
}

function buildGitHubHeaders(token?: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'User-Agent': 'Sami-Cloud-Update-Server/1.3',
    ...extra,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export interface GitHubRepositoryStatus {
  configured: boolean;
  liveTested?: boolean;
  hasToken: boolean;
  owner: string;
  repo: string;
  fullName: string;
  exists: boolean;
  isPrivate: boolean | null;
  visibility: string | null;
  defaultBranch: string | null;
  canPublishReleases: boolean;
  releasesReachable: boolean;
  existingReleasesCount: number;
  rateLimitRemaining: number | null;
  rateLimitResetAt: number | null;
  missingEnvVars: string[];
  setupInstructionsAr: string | null;
  error: string | null;
  vault?: VaultPublicStatus;
}

/**
 * Returns saved cloud GitHub settings & token readiness WITHOUT making live external requests to api.github.com.
 * Used when loading the admin page so UI renders never trigger unnecessary GitHub API traffic.
 */
export async function getSavedGitHubSettingsSummary(): Promise<GitHubRepositoryStatus> {
  const cfg = await resolveGitHubConfig();
  const fullName = cfg.owner && cfg.repo ? `${cfg.owner}/${cfg.repo}` : '';
  const missingEnvVars: string[] = [];
  if (!cfg.owner) missingEnvVars.push('GITHUB_OWNER');
  if (!cfg.repo) missingEnvVars.push('GITHUB_REPO');
  if (!cfg.hasToken) missingEnvVars.push('GITHUB_TOKEN');

  const isReady = Boolean(cfg.owner && cfg.repo && cfg.hasToken);
  return {
    configured: isReady,
    liveTested: false,
    hasToken: cfg.hasToken,
    owner: cfg.owner,
    repo: cfg.repo,
    fullName,
    exists: Boolean(cfg.owner && cfg.repo),
    isPrivate: null,
    visibility: null,
    defaultBranch: null,
    canPublishReleases: isReady,
    releasesReachable: isReady,
    existingReleasesCount: 0,
    rateLimitRemaining: null,
    rateLimitResetAt: null,
    missingEnvVars,
    setupInstructionsAr: !cfg.owner || !cfg.repo
      ? 'افتح قسم «⚙️ إعدادات GitHub Releases» وأدخل GITHUB_OWNER وGITHUB_REPO وGITHUB_TOKEN ثم اضغط «حفظ إعدادات GitHub».'
      : !cfg.hasToken
        ? `يرجى فتح قسم «⚙️ إعدادات GitHub Releases» وإدخال التوكن السري (GITHUB_TOKEN) بصلاحية Contents: Read and write للمستودع ${fullName} ثم حفظ الإعدادات.`
        : null,
    error: !cfg.owner || !cfg.repo
      ? 'لم يتم تحديد اسم المالك أو اسم المستودع في إعدادات GitHub Releases بعد.'
      : !cfg.hasToken
        ? 'التوكن السري (GITHUB_TOKEN) غير محفوظ بعد.'
        : null,
    vault: cfg.vault,
  };
}

export async function checkGitHubRepositoryStatus(override?: {
  owner?: string;
  repo?: string;
  token?: string;
}): Promise<GitHubRepositoryStatus> {
  const baseCfg = await resolveGitHubConfig();

  let effectiveOwner = baseCfg.owner;
  let effectiveRepo = baseCfg.repo;
  if (override && (override.owner !== undefined || override.repo !== undefined)) {
    const parsedOverride = parseOwnerAndRepoInput(
      override.owner !== undefined ? override.owner : baseCfg.owner,
      override.repo !== undefined ? override.repo : baseCfg.repo
    );
    effectiveOwner = parsedOverride.owner;
    effectiveRepo = parsedOverride.repo;
  }

  const cleanOverrideTok = override?.token !== undefined ? sanitizeGitHubSlug(override.token) : '';
  const effectiveToken = cleanOverrideTok || baseCfg.token;

  const cfg: GitHubConfig = {
    owner: effectiveOwner,
    repo: effectiveRepo,
    token: effectiveToken,
    hasToken: effectiveToken.length > 0,
    vault: baseCfg.vault,
  };

  const fullName = cfg.owner && cfg.repo ? `${cfg.owner}/${cfg.repo}` : '';
  const missingEnvVars: string[] = [];
  if (!cfg.owner) missingEnvVars.push('GITHUB_OWNER');
  if (!cfg.repo) missingEnvVars.push('GITHUB_REPO');
  if (!cfg.hasToken) missingEnvVars.push('GITHUB_TOKEN');

  if (!cfg.owner || !cfg.repo) {
    return {
      configured: false,
      hasToken: cfg.hasToken,
      owner: cfg.owner,
      repo: cfg.repo,
      fullName: '',
      exists: false,
      isPrivate: null,
      visibility: null,
      defaultBranch: null,
      canPublishReleases: false,
      releasesReachable: false,
      existingReleasesCount: 0,
      rateLimitRemaining: null,
      rateLimitResetAt: null,
      missingEnvVars,
      setupInstructionsAr:
        'افتح قسم «⚙️ إعدادات GitHub Releases» وأدخل GITHUB_OWNER وGITHUB_REPO وGITHUB_TOKEN ثم اضغط «حفظ إعدادات GitHub».',
      error: 'لم يتم تحديد اسم المالك أو اسم المستودع في إعدادات GitHub Releases بعد.',
      vault: cfg.vault,
    };
  }

  const baseInstructions = !cfg.hasToken
    ? `يرجى فتح قسم «⚙️ إعدادات GitHub Releases» وإدخال التوكن السري (GITHUB_TOKEN) بصلاحية Contents: Read and write للمستودع ${fullName} ثم حفظ الإعدادات.`
    : null;

  try {
    const repoRes = await fetch(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`,
      {
        method: 'GET',
        headers: buildGitHubHeaders(cfg.hasToken ? cfg.token : undefined),
        signal: AbortSignal.timeout(15_000),
      }
    );

    const rateRemainingHeader = repoRes.headers.get('x-ratelimit-remaining');
    const rateResetHeader = repoRes.headers.get('x-ratelimit-reset');
    const rateLimitRemaining = rateRemainingHeader !== null ? parseInt(rateRemainingHeader, 10) : null;
    const rateLimitResetAt = rateResetHeader !== null ? parseInt(rateResetHeader, 10) * 1000 : null;

    if (repoRes.status === 401) {
      return {
        configured: false,
        hasToken: cfg.hasToken,
        owner: cfg.owner,
        repo: cfg.repo,
        fullName,
        exists: false,
        isPrivate: null,
        visibility: null,
        defaultBranch: null,
        canPublishReleases: false,
        releasesReachable: false,
        existingReleasesCount: 0,
        rateLimitRemaining,
        rateLimitResetAt,
        missingEnvVars,
        setupInstructionsAr:
          'رمز GitHub الحالي غير صالح أو منتهي الصلاحية. يرجى تحديثه برمز Fine-grained PAT صالح بصلاحية Contents: Read and write.',
        error: 'فشل التحقق من رمز GitHub لدى GitHub API (401 Unauthorized)',
      };
    }

    if (repoRes.status === 403 && rateLimitRemaining === 0) {
      return {
        configured: cfg.hasToken,
        hasToken: cfg.hasToken,
        owner: cfg.owner,
        repo: cfg.repo,
        fullName,
        exists: false,
        isPrivate: null,
        visibility: null,
        defaultBranch: null,
        canPublishReleases: false,
        releasesReachable: false,
        existingReleasesCount: 0,
        rateLimitRemaining,
        rateLimitResetAt,
        missingEnvVars,
        setupInstructionsAr: baseInstructions,
        error: 'تم تجاوز حد طلبات GitHub API مؤقتاً (Rate Limit). يرجى المحاولة بعد قليل أو التأكد من إعداد رمز GitHub.',
      };
    }

    if (repoRes.status === 404) {
      let swappedHint: string | null = null;
      if (cfg.owner && cfg.repo && cfg.owner !== cfg.repo) {
        try {
          const swappedCheck = await fetch(
            `${GITHUB_API_BASE}/repos/${encodeURIComponent(cfg.repo)}/${encodeURIComponent(cfg.owner)}`,
            {
              method: 'GET',
              headers: buildGitHubHeaders(cfg.hasToken ? cfg.token : undefined),
              signal: AbortSignal.timeout(8_000),
            }
          );
          if (swappedCheck.ok) {
            swappedHint = `تنبيه: يبدو أنه تم عكس حقل المالك وحقل المستودع بالخطأ. ضع "${cfg.repo}" في حقل GITHUB_OWNER وضع "${cfg.owner}" في حقل GITHUB_REPO.`;
          }
        } catch {
          // ignore secondary check failure
        }
      }

      return {
        configured: false,
        hasToken: cfg.hasToken,
        owner: cfg.owner,
        repo: cfg.repo,
        fullName,
        exists: false,
        isPrivate: cfg.hasToken ? null : true,
        visibility: null,
        defaultBranch: null,
        canPublishReleases: false,
        releasesReachable: false,
        existingReleasesCount: 0,
        rateLimitRemaining,
        rateLimitResetAt,
        missingEnvVars,
        setupInstructionsAr:
          swappedHint ||
          (!cfg.hasToken
            ? `المستودع ${fullName} غير مرئي للعامة أو خاص. يرجى إدخال التوكن (GITHUB_TOKEN) بصلاحية Contents: Read and write للوصول إليه.`
            : `لم يتم العثور على المستودع ${fullName} أو أن الرمز لا يملك صلاحية الوصول إليه.`),
        error: `تعذر الوصول إلى المستودع ${fullName} (404)`,
        vault: cfg.vault,
      };
    }

    if (!repoRes.ok) {
      return {
        configured: false,
        hasToken: cfg.hasToken,
        owner: cfg.owner,
        repo: cfg.repo,
        fullName,
        exists: false,
        isPrivate: null,
        visibility: null,
        defaultBranch: null,
        canPublishReleases: false,
        releasesReachable: false,
        existingReleasesCount: 0,
        rateLimitRemaining,
        rateLimitResetAt,
        missingEnvVars,
        setupInstructionsAr: baseInstructions,
        error: `استجابة غير متوقعة من GitHub API (${repoRes.status})`,
        vault: cfg.vault,
      };
    }

    const repoData: any = await repoRes.json();
    const isPrivate = Boolean(repoData.private);
    const visibility = String(repoData.visibility || (isPrivate ? 'private' : 'public'));
    const defaultBranch = String(repoData.default_branch || 'main');

    // Check Releases API endpoint reachability
    const relRes = await fetch(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/releases?per_page=10`,
      {
        method: 'GET',
        headers: buildGitHubHeaders(cfg.hasToken ? cfg.token : undefined),
        signal: AbortSignal.timeout(12_000),
      }
    );
    const releasesReachable = relRes.ok;
    const relList: any[] = relRes.ok ? await relRes.json().catch(() => []) : [];

    // Check push/contents write capability when authenticated (including Fine-Grained PATs where repoData.permissions reflects user role rather than token scope)
    let hasPushPerm = cfg.hasToken
      ? repoData.permissions
        ? Boolean(repoData.permissions.push || repoData.permissions.admin || repoData.permissions.maintain)
        : releasesReachable
      : false;
    let fineGrainedScopeMissing = false;

    if (cfg.hasToken && hasPushPerm) {
      const oauthScopes = repoRes.headers.get('x-oauth-scopes');
      if (oauthScopes !== null) {
        // Classic PAT: must include `repo` (or `public_repo` for public repositories)
        const scopes = oauthScopes.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
        hasPushPerm = scopes.includes('repo') || (!isPrivate && scopes.includes('public_repo'));
      } else {
        // Fine-Grained PAT (`github_pat_...`): non-destructively probe `POST /releases` with `{"tag_name":""}`.
        // GitHub evaluates Fine-Grained PAT `Contents: write` authorization (403) BEFORE rejecting empty `tag_name` (422), so zero release or tag is ever created.
        try {
          const writeProbe = await fetch(
            `${GITHUB_API_BASE}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/releases`,
            {
              method: 'POST',
              headers: {
                ...buildGitHubHeaders(cfg.token),
                'Content-Type': 'application/json',
              },
              body: '{"tag_name":""}',
              signal: AbortSignal.timeout(10_000),
            }
          );
          if (writeProbe.status === 403 || writeProbe.status === 401) {
            hasPushPerm = false;
            fineGrainedScopeMissing = true;
          }
        } catch {
          // Keep repoData.permissions result on transient network issue
        }
      }
    }

    return {
      configured: cfg.hasToken && releasesReachable && hasPushPerm,
      liveTested: true,
      hasToken: cfg.hasToken,
      owner: cfg.owner,
      repo: cfg.repo,
      fullName,
      exists: true,
      isPrivate,
      visibility,
      defaultBranch,
      canPublishReleases: cfg.hasToken && releasesReachable && hasPushPerm,
      releasesReachable,
      existingReleasesCount: Array.isArray(relList) ? relList.length : 0,
      rateLimitRemaining,
      rateLimitResetAt,
      missingEnvVars,
      setupInstructionsAr: !cfg.hasToken
        ? baseInstructions
        : !hasPushPerm
          ? fineGrainedScopeMissing
            ? `التوكن المحفوظ يتصل بحسابك وبالمستودع ${fullName} بنجاح، لكنه من نوع Fine-grained PAT بصلاحية قراءة فقط. لنشر ملفات APK في GitHub Releases، افتح إعدادات التوكن في GitHub وحدّد المستودع ${fullName} وفعّل صلاحية Repository permissions → Contents: Read and write.`
            : `رمز GITHUB_TOKEN الحالي لا يملك صلاحية الكتابة على الإصدارات في ${fullName}. يرجى منح صلاحية Contents: Read and write للرمز.`
          : null,
      error: !cfg.hasToken
        ? 'لم يتم حفظ GITHUB_TOKEN في إعدادات الخادم بعد؛ القراءة العامة متاحة لكن الرفع والنشر يتطلبان حفظ التوكن.'
        : !hasPushPerm
          ? fineGrainedScopeMissing
            ? `التوكن متصل بالمستودع ${fullName} لكن ينقصه إذن Contents: Read and write لإنشاء Releases ورفع APK`
            : 'رمز GITHUB_TOKEN لا يملك صلاحية إنشاء الإصدارات (Contents: Write)'
          : null,
      vault: cfg.vault,
    };
  } catch (err: any) {
    return {
      configured: false,
      hasToken: cfg.hasToken,
      owner: cfg.owner,
      repo: cfg.repo,
      fullName,
      exists: false,
      isPrivate: null,
      visibility: null,
      defaultBranch: null,
      canPublishReleases: false,
      releasesReachable: false,
      existingReleasesCount: 0,
      rateLimitRemaining: null,
      rateLimitResetAt: null,
      missingEnvVars,
      setupInstructionsAr: baseInstructions,
      error: `فشل الاتصال بخدمة GitHub API: ${redactGitHubSecrets(err)}`,
      vault: cfg.vault,
    };
  }
}

// ============================================================================
// UPLOAD JOB TRACKING (REAL-TIME PROGRESS & CANCELLATION)
// ============================================================================

export interface UploadJobProgress {
  uploadId: string;
  phase:
    | 'receiving_apk'
    | 'inspecting_apk'
    | 'creating_draft_release'
    | 'uploading_asset'
    | 'verifying_asset'
    | 'publishing_release'
    | 'saving_firestore'
    | 'completed'
    | 'canceled'
    | 'failed';
  phaseLabelAr: string;
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
  error?: string;
  updatedAt: number;
}

const uploadJobs = new Map<string, UploadJobProgress>();

export function setUploadJobProgress(job: UploadJobProgress): void {
  uploadJobs.set(job.uploadId, { ...job, updatedAt: Date.now() });
  // Prune old jobs older than 30 minutes
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [k, v] of uploadJobs.entries()) {
    if (v.updatedAt < cutoff) uploadJobs.delete(k);
  }
}

export function getUploadJobProgress(uploadId: string): UploadJobProgress | null {
  return uploadJobs.get(uploadId) || null;
}

export interface PublishedGitHubReleaseResult {
  githubOwner: string;
  githubRepo: string;
  isRepoPrivate: boolean;
  githubReleaseId: number;
  releaseTag: string;
  githubAssetId: number;
  assetName: string;
  assetSize: number;
  browserDownloadUrl: string;
  sha256: string;
  sha256VerificationMethod: 'github_asset_digest_and_stream' | 'stream_rehash' | 'github_asset_digest';
  uploadedAt: number;
  publishedAt: number;
}

async function deleteDraftReleaseSafely(owner: string, repo: string, releaseId: number, token: string): Promise<void> {
  try {
    await fetch(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/${releaseId}`,
      {
        method: 'DELETE',
        headers: buildGitHubHeaders(token),
      }
    );
  } catch (err) {
    console.warn('[Sami GitHub] Notice cleaning up draft release:', redactGitHubSecrets(err));
  }
}

async function resolveUniqueReleaseTag(params: {
  owner: string;
  repo: string;
  token: string;
  versionName: string;
  versionCode: number;
  signal?: AbortSignal;
}): Promise<string> {
  const { owner, repo, token, versionName, versionCode, signal } = params;
  const cleanVer = versionName.trim().replace(/^v/i, '');
  const baseTag = `v${cleanVer}`;

  // Check if tag already exists on any published or draft release (never overwrite an existing release!)
  const checkTagRes = await fetch(
    `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/tags/${encodeURIComponent(baseTag)}`,
    {
      method: 'GET',
      headers: buildGitHubHeaders(token),
      signal,
    }
  );

  if (checkTagRes.status === 404) {
    return baseTag;
  }

  const buildTag = `${baseTag}-b${versionCode}`;
  const checkBuildTagRes = await fetch(
    `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/tags/${encodeURIComponent(buildTag)}`,
    {
      method: 'GET',
      headers: buildGitHubHeaders(token),
      signal,
    }
  );

  if (checkBuildTagRes.status === 404) {
    return buildTag;
  }

  return `${baseTag}-b${versionCode}-${Math.floor(Date.now() / 1000)}`;
}

async function computeRemoteAssetSha256(params: {
  owner: string;
  repo: string;
  assetId: number;
  browserDownloadUrl: string;
  isPrivate: boolean;
  token: string;
  expectedSize: number;
  signal?: AbortSignal;
}): Promise<string> {
  const { owner, repo, assetId, browserDownloadUrl, isPrivate, token, expectedSize, signal } = params;

  const url = isPrivate
    ? `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/assets/${assetId}`
    : browserDownloadUrl;

  const headers: Record<string, string> = isPrivate
    ? {
        Accept: 'application/octet-stream',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
        'User-Agent': 'Sami-Cloud-Update-Server/1.3',
      }
    : {
        // Note: Draft release assets require token before undrafting; use API asset endpoint when still draft
        Accept: 'application/octet-stream',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
        'User-Agent': 'Sami-Cloud-Update-Server/1.3',
      };

  const apiAssetUrl = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/assets/${assetId}`;
  const res = await fetch(url.startsWith(GITHUB_API_BASE) ? url : apiAssetUrl, {
    method: 'GET',
    headers,
    redirect: 'follow',
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`تعذر قراءة ملف APK المرفوع من GitHub للتحقق من بصمة SHA-256 (${res.status})`);
  }

  const hash = crypto.createHash('sha256');
  let totalRead = 0;
  const reader = res.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalRead += value.byteLength;
      hash.update(value);
    }
  }

  if (totalRead !== expectedSize) {
    throw new Error(
      `حجم الملف المسترجع من GitHub (${totalRead} بايت) لا يطابق حجم الملف الأصلي (${expectedSize} بايت)`
    );
  }

  return hash.digest('hex');
}

/**
 * Executes the strict atomic 12-step GitHub Releases APK upload & verification pipeline.
 */
export async function publishApkToGitHubRelease(params: {
  uploadId: string;
  apkFilePath: string;
  apkSize: number;
  sha256: string;
  versionName: string;
  versionCode: number;
  applicationId: string;
  signingCertSha256: string;
  description: string;
  isMandatory: boolean;
  originalFileName: string;
  signal?: AbortSignal;
}): Promise<PublishedGitHubReleaseResult> {
  const cfg = await resolveGitHubConfig();
  if (!cfg.owner || !cfg.repo) {
    throw new Error(
      'لم يتم تحديد المستودع في إعدادات GitHub Releases. يرجى فتح قسم «⚙️ إعدادات GitHub Releases» وحفظ GITHUB_OWNER وGITHUB_REPO وGITHUB_TOKEN أولاً.'
    );
  }
  if (!cfg.hasToken) {
    throw new Error(
      `التوكن السري (GITHUB_TOKEN) غير محفوظ على الخادم بعد. يرجى فتح قسم «⚙️ إعدادات GitHub Releases» وحفظ التوكن بصلاحية Contents: Read and write للمستودع ${cfg.owner}/${cfg.repo}.`
    );
  }

  if (params.apkSize <= 0 || params.apkSize > GITHUB_MAX_RELEASE_ASSET_BYTES) {
    throw new Error('حجم ملف الـ APK يتجاوز الحد المسموح به في GitHub Releases (2 غيغابايت)');
  }

  // 1. Check repository status & permissions before creating anything
  const repoStatus = await checkGitHubRepositoryStatus();
  if (!repoStatus.exists) {
    throw new Error(repoStatus.error || `المستودع ${cfg.owner}/${cfg.repo} غير متاح`);
  }
  if (!repoStatus.canPublishReleases) {
    throw new Error(
      repoStatus.setupInstructionsAr ||
        repoStatus.error ||
        `رمز GITHUB_TOKEN لا يملك صلاحية إنشاء الإصدارات في المستودع ${cfg.owner}/${cfg.repo}`
    );
  }

  const isRepoPrivate = Boolean(repoStatus.isPrivate);
  let draftReleaseId: number | null = null;

  try {
    if (params.signal?.aborted) {
      throw new Error('تم إلغاء عملية الرفع من قبل المسؤول');
    }

    // 2. Resolve unique release tag (never overwrite existing published release)
    setUploadJobProgress({
      uploadId: params.uploadId,
      phase: 'creating_draft_release',
      phaseLabelAr: 'جارٍ إنشاء مسودة إصدار (Draft Release) على GitHub...',
      percent: 25,
      bytesTransferred: params.apkSize,
      totalBytes: params.apkSize,
      updatedAt: Date.now(),
    });

    const releaseTag = await resolveUniqueReleaseTag({
      owner: cfg.owner,
      repo: cfg.repo,
      token: cfg.token,
      versionName: params.versionName,
      versionCode: params.versionCode,
      signal: params.signal,
    });

    const safeVersionLabel = params.versionName.trim().replace(/^v/i, '');
    const assetName = `Sami-v${safeVersionLabel}-code${params.versionCode}.apk`.replace(/[^a-zA-Z0-9._-]/g, '_');

    const releaseNotesBody = [
      params.description?.trim() || `تحديث تطبيق Sami الإصدار ${params.versionName}`,
      '',
      '---',
      `- **Application ID**: \`${params.applicationId}\``,
      `- **Version Name**: \`${params.versionName}\``,
      `- **Version Code**: \`${params.versionCode}\``,
      `- **Update Type**: ${params.isMandatory ? 'إلزامي (Mandatory)' : 'اختياري (Optional)'}`,
      `- **File Size**: ${params.apkSize} bytes`,
      `- **SHA-256**: \`${params.sha256}\``,
      `- **Signing Certificate SHA-256**: \`${params.signingCertSha256}\``,
    ].join('\n');

    // 3. Create GitHub Release in DRAFT state (draft: true)
    const createDraftRes = await fetch(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/releases`,
      {
        method: 'POST',
        headers: buildGitHubHeaders(cfg.token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          tag_name: releaseTag,
          target_commitish: repoStatus.defaultBranch || 'main',
          name: `Sami v${safeVersionLabel} (Build ${params.versionCode})`,
          body: releaseNotesBody,
          draft: true,
          prerelease: false,
        }),
        signal: params.signal,
      }
    );

    if (!createDraftRes.ok) {
      const errBody = await createDraftRes.text().catch(() => '');
      throw new Error(
        `فشل إنشاء مسودة الإصدار على GitHub (${createDraftRes.status}): ${redactGitHubSecrets(errBody).slice(0, 240)}`
      );
    }

    const draftRelease: any = await createDraftRes.json();
    draftReleaseId = Number(draftRelease.id);
    if (!draftReleaseId) {
      throw new Error('لم يُرجع GitHub معرّف مسودة إصدار صالح');
    }

    const uploadUrlBase = String(draftRelease.upload_url || '').replace(/\{\?name,label\}$/, '');
    const uploadAssetUrl =
      uploadUrlBase
        ? `${uploadUrlBase}?name=${encodeURIComponent(assetName)}`
        : `https://uploads.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/releases/${draftReleaseId}/assets?name=${encodeURIComponent(assetName)}`;

    // 4. Upload APK file to GitHub Release Assets
    setUploadJobProgress({
      uploadId: params.uploadId,
      phase: 'uploading_asset',
      phaseLabelAr: 'جارٍ رفع حزمة الـ APK إلى GitHub Releases...',
      percent: 45,
      bytesTransferred: 0,
      totalBytes: params.apkSize,
      updatedAt: Date.now(),
    });

    const apkBuffer = await fs.promises.readFile(params.apkFilePath);
    if (apkBuffer.length !== params.apkSize) {
      throw new Error('حجم ملف APK المؤقت تغير بشكل غير متوقع قبل الرفع');
    }

    const uploadRes = await fetch(uploadAssetUrl, {
      method: 'POST',
      headers: buildGitHubHeaders(cfg.token, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': String(apkBuffer.length),
      }),
      body: apkBuffer,
      signal: params.signal,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      throw new Error(
        `فشل رفع ملف الـ APK إلى GitHub Release Assets (${uploadRes.status}): ${redactGitHubSecrets(errText).slice(0, 240)}`
      );
    }

    const uploadedAssetResp: any = await uploadRes.json();
    const uploadedAt = Date.now();

    // 5. Re-fetch the Draft Release to confirm the asset appears in Release Assets, state == 'uploaded', and size matches
    setUploadJobProgress({
      uploadId: params.uploadId,
      phase: 'verifying_asset',
      phaseLabelAr: 'جارٍ التحقق من سلامة الملف المرفوع وحجمه وبصمة SHA-256...',
      percent: 78,
      bytesTransferred: params.apkSize,
      totalBytes: params.apkSize,
      updatedAt: Date.now(),
    });

    const verifyRelRes = await fetch(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/releases/${draftReleaseId}`,
      {
        method: 'GET',
        headers: buildGitHubHeaders(cfg.token),
        signal: params.signal,
      }
    );

    if (!verifyRelRes.ok) {
      throw new Error(`تعذر استعلام الإصدار من GitHub للتحقق من المرفقات (${verifyRelRes.status})`);
    }

    const verifiedDraftRel: any = await verifyRelRes.json();
    const assetsList: any[] = Array.isArray(verifiedDraftRel.assets) ? verifiedDraftRel.assets : [];
    const matchingAsset = assetsList.find(
      (a) => Number(a.id) === Number(uploadedAssetResp.id) || a.name === assetName
    );

    if (!matchingAsset) {
      throw new Error('لم يظهر ملف الـ APK ضمن قائمة Release Assets على GitHub بعد الرفع');
    }

    if (matchingAsset.state !== 'uploaded') {
      throw new Error(`حالة ملف الـ APK على GitHub غير مكتملة (${matchingAsset.state})`);
    }

    if (Number(matchingAsset.size) !== params.apkSize) {
      throw new Error(
        `حجم ملف الـ APK على GitHub (${matchingAsset.size}) لا يطابق الحجم الأصلي (${params.apkSize})`
      );
    }

    // 6. Verify SHA-256 against GitHub's digest AND/OR re-streaming hash verification
    let sha256VerificationMethod: 'github_asset_digest_and_stream' | 'stream_rehash' | 'github_asset_digest' =
      'stream_rehash';

    const githubDigestRaw = typeof matchingAsset.digest === 'string' ? matchingAsset.digest.trim() : '';
    const hasGitHubDigest = githubDigestRaw.toLowerCase().startsWith('sha256:');
    if (hasGitHubDigest) {
      const ghHex = githubDigestRaw.slice('sha256:'.length).toLowerCase();
      if (ghHex !== params.sha256.toLowerCase()) {
        throw new Error(
          `فشل التحقق من بصمة SHA-256 على GitHub (المتوقع: ${params.sha256.slice(0, 16)}...، الفعلي: ${ghHex.slice(0, 16)}...)`
        );
      }
      sha256VerificationMethod = 'github_asset_digest';
    }

    // Perform authoritative stream hash check if GitHub digest wasn't populated or for files <= 120MB
    if (!hasGitHubDigest || params.apkSize <= 120 * 1024 * 1024) {
      const remoteSha256 = await computeRemoteAssetSha256({
        owner: cfg.owner,
        repo: cfg.repo,
        assetId: Number(matchingAsset.id),
        browserDownloadUrl: String(matchingAsset.browser_download_url || ''),
        isPrivate: isRepoPrivate,
        token: cfg.token,
        expectedSize: params.apkSize,
        signal: params.signal,
      });
      if (remoteSha256.toLowerCase() !== params.sha256.toLowerCase()) {
        throw new Error('بصمة SHA-256 للملف المسترجع من GitHub لا تطابق الملف الأصلي');
      }
      sha256VerificationMethod = hasGitHubDigest ? 'github_asset_digest_and_stream' : 'stream_rehash';
    }

    // 7. Undraft and officially publish the GitHub Release ONLY after all integrity checks pass!
    setUploadJobProgress({
      uploadId: params.uploadId,
      phase: 'publishing_release',
      phaseLabelAr: 'نجح التحقق — جارٍ نشر الإصدار رسمياً على GitHub Releases...',
      percent: 90,
      bytesTransferred: params.apkSize,
      totalBytes: params.apkSize,
      updatedAt: Date.now(),
    });

    const publishRes = await fetch(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/releases/${draftReleaseId}`,
      {
        method: 'PATCH',
        headers: buildGitHubHeaders(cfg.token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ draft: false }),
        signal: params.signal,
      }
    );

    if (!publishRes.ok) {
      const pubErr = await publishRes.text().catch(() => '');
      throw new Error(
        `فشل تحويل مسودة الإصدار إلى إصدار منشور على GitHub (${publishRes.status}): ${redactGitHubSecrets(pubErr).slice(0, 200)}`
      );
    }

    const publishedRelease: any = await publishRes.json();
    if (publishedRelease.draft === true) {
      throw new Error('بقي الإصدار في حالة مسودة (Draft) على GitHub ولم يكتمل نشره');
    }

    const finalAssets: any[] = Array.isArray(publishedRelease.assets) ? publishedRelease.assets : [matchingAsset];
    const finalAsset =
      finalAssets.find((a) => Number(a.id) === Number(matchingAsset.id)) || matchingAsset;
    const browserDownloadUrl = String(finalAsset.browser_download_url || '');

    // 8. If public repository: verify direct unauthenticated download works WITHOUT GitHub login!
    if (!isRepoPrivate) {
      if (!browserDownloadUrl) {
        throw new Error('لم يُرجع GitHub رابط تنزيل مباشر (browser_download_url) للإصدار العام');
      }
      const unauthCheck = await fetch(browserDownloadUrl, {
        method: 'GET',
        headers: {
          Range: 'bytes=0-0',
          'User-Agent': 'Sami-Android-Updater/1.3',
        },
        redirect: 'follow',
        signal: params.signal,
      });
      if (!unauthCheck.ok && unauthCheck.status !== 206) {
        throw new Error(
          `فشل التحقق من قابلية تنزيل الملف مباشرة دون تسجيل دخول GitHub (HTTP ${unauthCheck.status})`
        );
      }
      try {
        await unauthCheck.body?.cancel();
      } catch {}
    }

    return {
      githubOwner: cfg.owner,
      githubRepo: cfg.repo,
      isRepoPrivate,
      githubReleaseId: Number(publishedRelease.id),
      releaseTag: String(publishedRelease.tag_name || releaseTag),
      githubAssetId: Number(finalAsset.id),
      assetName: String(finalAsset.name || assetName),
      assetSize: Number(finalAsset.size || params.apkSize),
      browserDownloadUrl,
      sha256: params.sha256.toLowerCase(),
      sha256VerificationMethod,
      uploadedAt,
      publishedAt: Date.now(),
    };
  } catch (err: any) {
    // Cleanup incomplete Draft Release if created before publication succeeded
    if (draftReleaseId !== null) {
      await deleteDraftReleaseSafely(cfg.owner, cfg.repo, draftReleaseId, cfg.token);
    }
    throw new Error(redactGitHubSecrets(err));
  }
}

/**
 * Verifies an existing published GitHub Release Asset still exists and matches expected size before Rollback.
 */
export async function verifyExistingGitHubReleaseAsset(params: {
  owner: string;
  repo: string;
  releaseId: number;
  assetId: number;
  expectedSize: number;
  browserDownloadUrl?: string;
  isRepoPrivate?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const cfg = await resolveGitHubConfig();
  try {
    if (!params.isRepoPrivate && params.browserDownloadUrl && params.browserDownloadUrl.startsWith('https://github.com/')) {
      const probe = await fetch(params.browserDownloadUrl, {
        method: 'GET',
        headers: { Range: 'bytes=0-0', 'User-Agent': 'Sami-Cloud-Update-Server/1.3' },
        redirect: 'follow',
        signal: AbortSignal.timeout(12_000),
      });
      try {
        await probe.body?.cancel();
      } catch {}
      if (probe.ok || probe.status === 206) {
        return { ok: true };
      }
    }

    if (params.releaseId > 0) {
      const sameConfiguredRepo =
        cfg.hasToken &&
        params.owner.toLowerCase() === cfg.owner.toLowerCase() &&
        params.repo.toLowerCase() === cfg.repo.toLowerCase();
      const relRes = await fetch(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/releases/${params.releaseId}`,
        {
          method: 'GET',
          headers: buildGitHubHeaders(sameConfiguredRepo ? cfg.token : undefined),
          signal: AbortSignal.timeout(12_000),
        }
      );
      if (!relRes.ok) {
        return { ok: false, error: `تعذر التحقق من وجود الإصدار على GitHub (${relRes.status})` };
      }
      const rel: any = await relRes.json();
      const asset = Array.isArray(rel.assets)
        ? rel.assets.find((a: any) => Number(a.id) === Number(params.assetId))
        : null;
      if (!asset) {
        return { ok: false, error: 'ملف الـ APK المرتبط بهذا الإصدار لم يعد موجوداً في GitHub Release Assets' };
      }
      if (params.expectedSize > 0 && Number(asset.size) !== params.expectedSize) {
        return { ok: false, error: 'حجم ملف الـ APK على GitHub لا يطابق الحجم المسجل' };
      }
      return { ok: true };
    }

    return { ok: false, error: 'بيانات GitHub Release غير مكتملة لهذا الإصدار' };
  } catch (err: any) {
    return { ok: false, error: redactGitHubSecrets(err) };
  }
}

/**
 * Streams a GitHub Release Asset securely through the Sami server (supports HTTP Range resume!).
 * Never exposes GITHUB_TOKEN or upstream signed query tokens to the client.
 */
export async function streamGitHubReleaseAssetToResponse(params: {
  owner: string;
  repo: string;
  assetId: number;
  browserDownloadUrl: string;
  isRepoPrivate: boolean;
  fileName: string;
  expectedSize: number;
  expectedSha256: string;
  rangeHeader?: string;
  res: Response;
}): Promise<void> {
  const cfg = await resolveGitHubConfig();
  const {
    owner,
    repo,
    assetId,
    browserDownloadUrl,
    isRepoPrivate,
    fileName,
    expectedSize,
    expectedSha256,
    rangeHeader,
    res,
  } = params;

  if (isRepoPrivate && !cfg.hasToken) {
    res.status(503).json({
      error:
        'تعذر تنزيل التحديث من المستودع الخاص لأن GITHUB_TOKEN غير محفوظ على الخادم حالياً.',
    });
    return;
  }

  const upstreamHeaders: Record<string, string> = {
    'User-Agent': 'Sami-Cloud-Update-Server/1.3',
  };

  const isSameActiveRepo =
    cfg.hasToken &&
    owner.toLowerCase() === cfg.owner.toLowerCase() &&
    repo.toLowerCase() === cfg.repo.toLowerCase();

  let targetUrl = browserDownloadUrl;
  if (isRepoPrivate || !browserDownloadUrl || (assetId > 0 && isSameActiveRepo)) {
    targetUrl = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/assets/${assetId}`;
    upstreamHeaders.Accept = 'application/octet-stream';
    upstreamHeaders['X-GitHub-Api-Version'] = GITHUB_API_VERSION;
    if (cfg.hasToken && (isRepoPrivate || isSameActiveRepo)) {
      upstreamHeaders.Authorization = `Bearer ${cfg.token}`;
    }
  }

  if (rangeHeader && /^bytes=\d+-\d*$/.test(rangeHeader.trim())) {
    upstreamHeaders.Range = rangeHeader.trim();
  }

  const abortCtrl = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      abortCtrl.abort();
    }
  });

  const upstream = await fetch(targetUrl, {
    method: 'GET',
    headers: upstreamHeaders,
    redirect: 'follow',
    signal: abortCtrl.signal,
  });

  if (!upstream.ok && upstream.status !== 206) {
    res.status(upstream.status === 404 ? 404 : 502).json({
      error: `تعذر جلب ملف التحديث من GitHub Releases (HTTP ${upstream.status})`,
    });
    return;
  }

  const safeDownloadName = (fileName || 'Sami-Update.apk').replace(/[^a-zA-Z0-9._-]/g, '_');
  res.status(upstream.status === 206 ? 206 : 200);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-store');
  if (expectedSha256) {
    res.setHeader('X-Sami-Apk-Sha256', expectedSha256);
  }
  if (expectedSize > 0) {
    res.setHeader('X-Sami-Apk-Size', String(expectedSize));
  }

  const upstreamLen = upstream.headers.get('content-length');
  if (upstreamLen) {
    res.setHeader('Content-Length', upstreamLen);
  } else if (upstream.status === 200 && expectedSize > 0) {
    res.setHeader('Content-Length', String(expectedSize));
  }

  const contentRange = upstream.headers.get('content-range');
  if (contentRange) {
    res.setHeader('Content-Range', contentRange);
  }

  if (!upstream.body) {
    res.end();
    return;
  }

  const nodeStream = Readable.fromWeb(upstream.body as any);
  nodeStream.on('error', (err) => {
    if (!res.headersSent) {
      res.status(502).json({ error: redactGitHubSecrets(err) });
    } else {
      res.destroy();
    }
  });
  nodeStream.pipe(res);
}
