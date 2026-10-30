import crypto from 'crypto';
import {
  getCloudGitHubSettings,
  isValidProductionServerUrl,
  saveCloudGitHubSettings,
} from './db.ts';

/**
 * Permanent & Isolated Server-Only Secret Vault for GitHub Releases Credentials
 *
 * Security & Persistence Invariants:
 * 1. `GITHUB_OWNER` and `GITHUB_REPO` (non-secret) are persisted permanently in Cloud Firestore (`app_updates/latest`).
 * 2. `GITHUB_TOKEN` is NEVER stored in Firestore, Supabase, SQLite, disk files, LocalStorage, or APK.
 * 3. `GITHUB_TOKEN` is NEVER stored in ephemeral RAM-only storage that disappears on server restart.
 * 4. `GITHUB_TOKEN` is NEVER returned to the client, logs, or API error responses.
 * 5. Permanent Token Storage Tiers:
 *    - Tier 1 (`gcp_secret_manager`): Google Cloud Secret Manager (`secretmanager.googleapis.com`) with version superseding.
 *    - Tier 2 (`server_env`): Permanent Cloud Run / AI Studio Server Environment Secret (`GITHUB_TOKEN` / `GITHUB_RELEASES_TOKEN`).
 *    If a new/different token is submitted while Google Cloud Secret Manager is disabled on the host, the server refuses
 *    ephemeral or database storage, preserves previous settings untouched, and returns actionable instructions to enable it.
 */

const GCP_SECRET_ID = 'sami-github-releases-credentials';
const METADATA_BASE = 'http://metadata.google.internal/computeMetadata/v1';
const GCP_CACHE_TTL_MS = 30_000;

interface StoredSecretPayload {
  token: string;
  updatedAt: number;
}

export type VaultStorageMode =
  | 'gcp_secret_manager'
  | 'server_env'
  | 'unconfigured';

export interface VaultPublicStatus {
  storageMode: VaultStorageMode;
  persistentVaultAvailable: boolean;
  secretManagerEnabled: boolean;
  cloudSettingsPersisted: boolean;
  hasSavedToken: boolean;
  tokenStatusAr: string;
  updatedAt: number | null;
  updatedBy: string | null;
  apiServerUrl: string;
  hostingVaultNoticeAr: string | null;
}

export interface ResolvedGitHubVaultCredentials {
  owner: string;
  repo: string;
  token: string;
  hasToken: boolean;
  apiServerUrl: string;
  vault: VaultPublicStatus;
}

let gcpProbeDoneAt = 0;
let gcpSecretManagerAvailable = false;
let gcpTargetProjectId: string | null = null;
let gcpCachedPayload: { payload: StoredSecretPayload | null; cachedAt: number } | null = null;

// Isolated server-only set of active token strings used strictly by redactGitHubSecrets()
const redactionTokenSet = new Set<string>();

function registerTokenForRedaction(token: string): void {
  const clean = token.trim();
  if (clean.length >= 4) {
    redactionTokenSet.add(clean);
  }
}

export function getKnownSecretTokensForRedaction(): string[] {
  const envTok1 = (process.env.GITHUB_TOKEN || '').trim();
  const envTok2 = (process.env.GITHUB_RELEASES_TOKEN || '').trim();
  if (envTok1.length >= 4) redactionTokenSet.add(envTok1);
  if (envTok2.length >= 4) redactionTokenSet.add(envTok2);
  return Array.from(redactionTokenSet);
}

function sha256ConstantTimeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function sanitizeGitHubSlug(val: string | undefined | null): string {
  return String(val || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
}

export function parseOwnerAndRepoInput(rawOwner: string, rawRepo: string): { owner: string; repo: string } {
  let owner = sanitizeGitHubSlug(rawOwner);
  let repo = sanitizeGitHubSlug(rawRepo);

  const urlRegex = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i;
  const repoUrlMatch = repo.match(urlRegex);
  const ownerUrlMatch = owner.match(urlRegex);

  if (repoUrlMatch) {
    return {
      owner: sanitizeGitHubSlug(repoUrlMatch[1]),
      repo: sanitizeGitHubSlug(repoUrlMatch[2]),
    };
  }
  if (ownerUrlMatch) {
    return {
      owner: sanitizeGitHubSlug(ownerUrlMatch[1]),
      repo: sanitizeGitHubSlug(ownerUrlMatch[2]),
    };
  }
  if (!owner && repo.includes('/')) {
    const parts = repo.split('/').filter(Boolean);
    if (parts.length >= 2) {
      owner = sanitizeGitHubSlug(parts[0]);
      repo = sanitizeGitHubSlug(parts[1]);
    }
  } else if (repo.includes('/') && !repo.startsWith('http')) {
    const parts = repo.split('/').filter(Boolean);
    if (parts.length === 2 && (!owner || owner === parts[0])) {
      owner = sanitizeGitHubSlug(parts[0]);
      repo = sanitizeGitHubSlug(parts[1]);
    }
  }

  return { owner, repo };
}

async function fetchMetadataAccessToken(): Promise<{ accessToken: string; projectId: string } | null> {
  try {
    const headers = { 'Metadata-Flavor': 'Google' };
    const [projRes, tokRes] = await Promise.all([
      fetch(`${METADATA_BASE}/project/project-id`, {
        headers,
        signal: AbortSignal.timeout(2_500),
      }),
      fetch(`${METADATA_BASE}/instance/service-accounts/default/token`, {
        headers,
        signal: AbortSignal.timeout(2_500),
      }),
    ]);
    if (!tokRes.ok) return null;
    const tokJson: any = await tokRes.json().catch(() => null);
    const metaProj = projRes.ok ? (await projRes.text()).trim() : '';
    const projectId = (process.env.GCP_SECRET_MANAGER_PROJECT || metaProj || '').trim();
    if (!tokJson?.access_token || !projectId) return null;
    return { accessToken: String(tokJson.access_token), projectId };
  } catch {
    return null;
  }
}

async function probeGcpSecretManager(force = false): Promise<boolean> {
  if (!force && gcpProbeDoneAt > 0 && Date.now() - gcpProbeDoneAt < 60_000) {
    return gcpSecretManagerAvailable;
  }
  gcpProbeDoneAt = Date.now();

  const meta = await fetchMetadataAccessToken();
  if (!meta) {
    gcpSecretManagerAvailable = false;
    return false;
  }

  try {
    const res = await fetch(
      `https://secretmanager.googleapis.com/v1/projects/${encodeURIComponent(meta.projectId)}/secrets?pageSize=1`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${meta.accessToken}` },
        signal: AbortSignal.timeout(4_000),
      }
    );
    if (res.ok) {
      gcpSecretManagerAvailable = true;
      gcpTargetProjectId = meta.projectId;
      return true;
    }
    gcpSecretManagerAvailable = false;
    return false;
  } catch {
    gcpSecretManagerAvailable = false;
    return false;
  }
}

async function readFromGcpSecretManager(bypassCache = false): Promise<StoredSecretPayload | null> {
  if (!bypassCache && gcpCachedPayload && Date.now() - gcpCachedPayload.cachedAt < GCP_CACHE_TTL_MS) {
    return gcpCachedPayload.payload;
  }

  const ok = await probeGcpSecretManager(bypassCache);
  if (!ok || !gcpTargetProjectId) return null;
  const meta = await fetchMetadataAccessToken();
  if (!meta) return null;

  try {
    const res = await fetch(
      `https://secretmanager.googleapis.com/v1/projects/${encodeURIComponent(gcpTargetProjectId)}/secrets/${GCP_SECRET_ID}/versions/latest:access`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${meta.accessToken}` },
        signal: AbortSignal.timeout(5_000),
      }
    );
    if (!res.ok) {
      gcpCachedPayload = { payload: null, cachedAt: Date.now() };
      return null;
    }
    const data: any = await res.json();
    const b64 = data?.payload?.data;
    if (!b64) return null;
    const jsonStr = Buffer.from(String(b64), 'base64').toString('utf8');
    const parsed = JSON.parse(jsonStr) as any;
    const cleanTok = sanitizeGitHubSlug(parsed?.token);
    if (!cleanTok) return null;
    registerTokenForRedaction(cleanTok);
    const result: StoredSecretPayload = {
      token: cleanTok,
      updatedAt: Number(parsed?.updatedAt) || Date.now(),
    };
    gcpCachedPayload = { payload: result, cachedAt: Date.now() };
    return result;
  } catch {
    return null;
  }
}

async function writeToGcpSecretManager(payload: StoredSecretPayload): Promise<boolean> {
  const ok = await probeGcpSecretManager(true);
  if (!ok || !gcpTargetProjectId) return false;
  const meta = await fetchMetadataAccessToken();
  if (!meta) return false;

  const parent = `projects/${encodeURIComponent(gcpTargetProjectId)}`;
  const secretName = `${parent}/secrets/${GCP_SECRET_ID}`;
  const authHeaders = {
    Authorization: `Bearer ${meta.accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const getSec = await fetch(`https://secretmanager.googleapis.com/v1/${secretName}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${meta.accessToken}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (getSec.status === 404) {
      const createSec = await fetch(
        `https://secretmanager.googleapis.com/v1/${parent}/secrets?secretId=${GCP_SECRET_ID}`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ replication: { automatic: {} } }),
          signal: AbortSignal.timeout(6_000),
        }
      );
      if (!createSec.ok) return false;
    } else if (!getSec.ok) {
      return false;
    }

    const b64Data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    const addVer = await fetch(`https://secretmanager.googleapis.com/v1/${secretName}:addVersion`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ payload: { data: b64Data } }),
      signal: AbortSignal.timeout(6_000),
    });
    if (!addVer.ok) return false;

    const addedMeta: any = await addVer.json().catch(() => null);
    const addedVersionName = String(addedMeta?.name || '');

    // Best-effort disable superseded enabled versions so old tokens cannot be reused accidentally
    if (addedVersionName) {
      try {
        const listVer = await fetch(`https://secretmanager.googleapis.com/v1/${secretName}/versions?pageSize=10`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${meta.accessToken}` },
          signal: AbortSignal.timeout(4_000),
        });
        if (listVer.ok) {
          const listJson: any = await listVer.json().catch(() => ({}));
          const versions: any[] = Array.isArray(listJson?.versions) ? listJson.versions : [];
          for (const v of versions) {
            if (v?.name && v.name !== addedVersionName && v.state === 'ENABLED') {
              await fetch(`https://secretmanager.googleapis.com/v1/${v.name}:disable`, {
                method: 'POST',
                headers: authHeaders,
                body: '{}',
                signal: AbortSignal.timeout(3_500),
              }).catch(() => {});
            }
          }
        }
      } catch {}
    }

    // Read-after-write verification in Secret Manager
    gcpCachedPayload = null;
    const verified = await readFromGcpSecretManager(true);
    return Boolean(verified && sha256ConstantTimeEqual(verified.token, payload.token));
  } catch {
    return false;
  }
}

function readPermanentEnvCredentials(): { owner: string; repo: string; token: string } {
  const rawOwner = (process.env.GITHUB_RELEASES_OWNER || process.env.GITHUB_OWNER || '').trim();
  const rawRepo = (process.env.GITHUB_RELEASES_REPO || process.env.GITHUB_REPO || '').trim();
  const parsed = parseOwnerAndRepoInput(rawOwner, rawRepo);
  const token = sanitizeGitHubSlug(process.env.GITHUB_RELEASES_TOKEN || process.env.GITHUB_TOKEN || '');
  if (token) registerTokenForRedaction(token);
  return {
    owner: parsed.owner,
    repo: parsed.repo,
    token,
  };
}

function buildHostingNotice(params: {
  secretManagerEnabled: boolean;
  hasPermanentEnvToken: boolean;
}): string | null {
  if (params.secretManagerEnabled) {
    return null;
  }
  if (params.hasPermanentEnvToken) {
    return 'الحفظ السحابي الدائم مفعّل: يُحفظ اسما المالك والمستودع في Cloud Firestore بشكل دائم، بينما يُقرأ التوكن من مخزن الأسرار البيئي الدائم للخادم (GITHUB_TOKEN). لتبديل قيمة التوكن مستقبلاً من المتصفح مباشرة، فعّل Secret Manager API على مشروع Google Cloud أو حدّث GITHUB_TOKEN في لوحة أسرار الخادم.';
  }
  return 'تنبيه إعداد الأسرار الدائمة: لتخزين GITHUB_TOKEN بشكل دائم وآمن دون استخدام تخزين مؤقت، يرجى تفعيل خدمة Secret Manager API في مشروع Google Cloud (مع صلاحية Secret Manager Admin لحساب خدمة Cloud Run) أو إضافة GITHUB_TOKEN في مخزن أسرار بيئة الخادم الدائمة.';
}

export async function getResolvedGitHubCredentials(forceFresh = false): Promise<ResolvedGitHubVaultCredentials> {
  const [secretManagerEnabled, cloudSettings] = await Promise.all([
    probeGcpSecretManager(forceFresh),
    getCloudGitHubSettings(forceFresh),
  ]);

  const gcpSecret = secretManagerEnabled ? await readFromGcpSecretManager(forceFresh) : null;
  const envCreds = readPermanentEnvCredentials();

  // Non-secret Owner & Repo come primarily from Cloud Firestore (`app_updates/latest`), with env fallback only if cloud is unset
  const resolvedOwner = cloudSettings.githubOwner || envCreds.owner;
  const resolvedRepo = cloudSettings.githubRepo || envCreds.repo;

  // Secret Token comes ONLY from permanent Secret Manager or permanent Server Environment Secret
  let resolvedToken = '';
  let storageMode: VaultStorageMode = 'unconfigured';

  if (gcpSecret?.token) {
    resolvedToken = gcpSecret.token;
    storageMode = 'gcp_secret_manager';
  } else if (envCreds.token) {
    resolvedToken = envCreds.token;
    storageMode = 'server_env';
  }

  const hasSavedToken = resolvedToken.length > 0;
  const persistentVaultAvailable = secretManagerEnabled || envCreds.token.length > 0;
  const updatedAt = cloudSettings.updatedAt || gcpSecret?.updatedAt || null;

  return {
    owner: resolvedOwner,
    repo: resolvedRepo,
    token: resolvedToken,
    hasToken: hasSavedToken,
    apiServerUrl: cloudSettings.apiServerUrl,
    vault: {
      storageMode,
      persistentVaultAvailable,
      secretManagerEnabled,
      cloudSettingsPersisted: cloudSettings.source === 'firestore',
      hasSavedToken,
      tokenStatusAr: hasSavedToken ? 'التوكن محفوظ' : 'التوكن غير محفوظ',
      updatedAt,
      updatedBy: cloudSettings.updatedBy,
      apiServerUrl: cloudSettings.apiServerUrl,
      hostingVaultNoticeAr: buildHostingNotice({
        secretManagerEnabled,
        hasPermanentEnvToken: envCreds.token.length > 0,
      }),
    },
  };
}

export async function saveGitHubCredentialsToVault(input: {
  owner: string;
  repo: string;
  token?: string;
  apiServerUrl?: string;
  updatedBy?: string;
}): Promise<{
  owner: string;
  repo: string;
  hasToken: boolean;
  apiServerUrl: string;
  vault: VaultPublicStatus;
}> {
  const parsed = parseOwnerAndRepoInput(input.owner, input.repo);
  const slugRegex = /^[A-Za-z0-9._-]+$/;

  if (!parsed.owner || !slugRegex.test(parsed.owner)) {
    throw new Error('يرجى إدخال اسم مالك مستودع GitHub صالح في حقل GITHUB_OWNER');
  }
  if (!parsed.repo || !slugRegex.test(parsed.repo)) {
    throw new Error('يرجى إدخال اسم مستودع GitHub صالح في حقل GITHUB_REPO');
  }

  if (input.apiServerUrl !== undefined && String(input.apiServerUrl).trim() !== '') {
    if (!isValidProductionServerUrl(input.apiServerUrl)) {
      throw new Error(
        'عنوان الخادم المنشور غير صالح؛ يجب أن يكون عنوان HTTPS فعليًا (لا يقبل localhost أو عناوين معاينة Google AI Studio).'
      );
    }
  }

  const incomingToken = sanitizeGitHubSlug(input.token);
  if (incomingToken && /\s/.test(incomingToken)) {
    throw new Error('صيغة التوكن المدخل في GITHUB_TOKEN غير صالحة (يجب ألا يحتوي على مسافات)');
  }

  const current = await getResolvedGitHubCredentials(true);
  const envCreds = readPermanentEnvCredentials();

  // STEP 1: Verify permanent secret storage BEFORE modifying Cloud Firestore (never wipe previous settings on failure!)
  if (!incomingToken) {
    if (!current.hasToken) {
      if (!current.vault.secretManagerEnabled) {
        throw new Error(
          'لا يوجد توكن محفوظ حالياً، وخدمة Secret Manager API غير مفعّلة في مشروع Google Cloud. يرجى إضافة GITHUB_TOKEN في مخزن أسرار الخادم الدائم أو تفعيل Secret Manager API أولاً.'
        );
      }
      throw new Error('يرجى إدخال التوكن السري (GITHUB_TOKEN) لحفظ الإعدادات لأول مرة');
    }
  } else {
    registerTokenForRedaction(incomingToken);
    const secretManagerSaved = await writeToGcpSecretManager({
      token: incomingToken,
      updatedAt: Date.now(),
    });

    if (!secretManagerSaved) {
      // Check if the submitted token already matches the permanent server environment secret (`GITHUB_TOKEN`)
      const matchesPermanentEnvToken =
        envCreds.token.length > 0 && sha256ConstantTimeEqual(incomingToken, envCreds.token);

      if (!matchesPermanentEnvToken) {
        throw new Error(
          'تم إيقاف الحفظ لأن التوكن الجديد لا يمكن تخزينه بشكل دائم في بيئة الاستضافة الحالية (خدمة Google Cloud Secret Manager غير مفعّلة، والتخزين المؤقت أو في قاعدة البيانات محظور أمنياً). لتفعيل الحفظ الدائم للتوكن الجديد: (1) فعّل Secret Manager API في مشروع Google Cloud وامنح حساب خدمة Cloud Run صلاحية Secret Manager Admin، أو (2) حدّث قيمة السر الدائم GITHUB_TOKEN في إعدادات أسرار الخادم ثم احفظ GITHUB_OWNER وGITHUB_REPO مع ترك حقل التوكن فارغاً.'
        );
      }
    }
  }

  // STEP 2: Persist non-secret GITHUB_OWNER, GITHUB_REPO, and optional API Server URL permanently in Cloud Firestore
  await saveCloudGitHubSettings({
    githubOwner: parsed.owner,
    githubRepo: parsed.repo,
    apiServerUrl: input.apiServerUrl,
    updatedBy: input.updatedBy,
  });

  // STEP 3: Read back fresh verified state from both Cloud Firestore & permanent secret vault
  const verified = await getResolvedGitHubCredentials(true);
  if (!verified.hasToken || verified.owner !== parsed.owner || verified.repo !== parsed.repo) {
    throw new Error('تعذر التحقق النهائي من حفظ الإعدادات الدائمة في السحابة');
  }

  return {
    owner: verified.owner,
    repo: verified.repo,
    hasToken: true,
    apiServerUrl: verified.apiServerUrl,
    vault: verified.vault,
  };
}
