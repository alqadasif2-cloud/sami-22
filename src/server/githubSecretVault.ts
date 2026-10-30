import crypto from 'crypto';

/**
 * Isolated Server-Only Secret Vault for GitHub Releases Credentials
 *
 * Security Invariants:
 * 1. NEVER stores GITHUB_TOKEN in Firestore, Supabase, SQLite, LocalStorage, project files, or APK.
 * 2. NEVER contains hardcoded repository or owner names.
 * 3. NEVER returns the raw token to client/API responses or error logs.
 * 4. Tier 1: Uses Google Cloud Secret Manager (`secretmanager.googleapis.com`) when available and permitted on the host.
 * 5. Tier 2: When Google Cloud Secret Manager is disabled by the hosting sandbox (e.g. 403 PERMISSION_DENIED),
 *    refuses to fall back to any database or file, seals credentials in isolated Node.js RAM using AES-256-GCM,
 *    and exposes an honest hosting capability notice to the application Owner.
 */

const GCP_SECRET_ID = 'sami-github-releases-credentials';
const METADATA_BASE = 'http://metadata.google.internal/computeMetadata/v1';

// Process-ephemeral 256-bit key generated strictly inside isolated server RAM
const RAM_VAULT_KEY = crypto.randomBytes(32);

interface SealedRamBlob {
  iv: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
  updatedAt: number;
}

interface StoredVaultPayload {
  owner: string;
  repo: string;
  token: string;
  updatedAt: number;
}

export type VaultStorageMode =
  | 'gcp_secret_manager'
  | 'server_encrypted_memory'
  | 'server_env'
  | 'unconfigured';

export interface VaultPublicStatus {
  storageMode: VaultStorageMode;
  persistentVaultAvailable: boolean;
  hasSavedToken: boolean;
  updatedAt: number | null;
  hostingVaultNoticeAr: string | null;
}

export interface ResolvedGitHubVaultCredentials {
  owner: string;
  repo: string;
  token: string;
  hasToken: boolean;
  vault: VaultPublicStatus;
}

let sealedRamVault: SealedRamBlob | null = null;
let gcpProbeDone = false;
let gcpSecretManagerAvailable = false;
let gcpTargetProjectId: string | null = null;
let gcpUnavailableReason: string | null = null;
let gcpInitialLoadAttempted = false;

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

function sealPayloadInRam(payload: StoredVaultPayload): void {
  // Zero previous ciphertext buffer before replacing
  if (sealedRamVault) {
    sealedRamVault.ciphertext.fill(0);
    sealedRamVault.iv.fill(0);
    sealedRamVault.authTag.fill(0);
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', RAM_VAULT_KEY, iv);
  const plainBuf = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plainBuf), cipher.final()]);
  plainBuf.fill(0);
  const authTag = cipher.getAuthTag();
  sealedRamVault = {
    iv,
    authTag,
    ciphertext: encrypted,
    updatedAt: payload.updatedAt,
  };
  if (payload.token) {
    registerTokenForRedaction(payload.token);
  }
}

function unsealPayloadFromRam(): StoredVaultPayload | null {
  if (!sealedRamVault) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', RAM_VAULT_KEY, sealedRamVault.iv);
    decipher.setAuthTag(sealedRamVault.authTag);
    const decrypted = Buffer.concat([decipher.update(sealedRamVault.ciphertext), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf8')) as StoredVaultPayload;
    decrypted.fill(0);
    return parsed;
  } catch {
    return null;
  }
}

async function fetchMetadataAccessToken(): Promise<{ accessToken: string; projectId: string } | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const headers = { 'Metadata-Flavor': 'Google' };
    const [projRes, tokRes] = await Promise.all([
      fetch(`${METADATA_BASE}/project/project-id`, { headers, signal: ctrl.signal }),
      fetch(`${METADATA_BASE}/instance/service-accounts/default/token`, { headers, signal: ctrl.signal }),
    ]);
    clearTimeout(timer);
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

async function probeGcpSecretManager(): Promise<boolean> {
  if (gcpProbeDone) return gcpSecretManagerAvailable;
  gcpProbeDone = true;

  const meta = await fetchMetadataAccessToken();
  if (!meta) {
    gcpSecretManagerAvailable = false;
    gcpUnavailableReason = 'metadata_unavailable';
    return false;
  }

  try {
    const res = await fetch(
      `https://secretmanager.googleapis.com/v1/projects/${encodeURIComponent(meta.projectId)}/secrets?pageSize=1`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${meta.accessToken}` },
      }
    );
    if (res.ok) {
      gcpSecretManagerAvailable = true;
      gcpTargetProjectId = meta.projectId;
      gcpUnavailableReason = null;
      return true;
    }
    gcpSecretManagerAvailable = false;
    gcpUnavailableReason = `http_${res.status}`;
    return false;
  } catch {
    gcpSecretManagerAvailable = false;
    gcpUnavailableReason = 'network_error';
    return false;
  }
}

async function readFromGcpSecretManager(): Promise<StoredVaultPayload | null> {
  const ok = await probeGcpSecretManager();
  if (!ok || !gcpTargetProjectId) return null;
  const meta = await fetchMetadataAccessToken();
  if (!meta) return null;

  try {
    const res = await fetch(
      `https://secretmanager.googleapis.com/v1/projects/${encodeURIComponent(gcpTargetProjectId)}/secrets/${GCP_SECRET_ID}/versions/latest:access`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${meta.accessToken}` },
      }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const b64 = data?.payload?.data;
    if (!b64) return null;
    const jsonStr = Buffer.from(String(b64), 'base64').toString('utf8');
    const parsed = JSON.parse(jsonStr) as StoredVaultPayload;
    if (parsed?.token) registerTokenForRedaction(parsed.token);
    return parsed;
  } catch {
    return null;
  }
}

async function writeToGcpSecretManager(payload: StoredVaultPayload): Promise<boolean> {
  const ok = await probeGcpSecretManager();
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
    // Ensure secret container exists
    const getSec = await fetch(`https://secretmanager.googleapis.com/v1/${secretName}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${meta.accessToken}` },
    });
    if (getSec.status === 404) {
      const createSec = await fetch(
        `https://secretmanager.googleapis.com/v1/${parent}/secrets?secretId=${GCP_SECRET_ID}`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ replication: { automatic: {} } }),
        }
      );
      if (!createSec.ok) return false;
    } else if (!getSec.ok) {
      return false;
    }

    // Add new secret version
    const b64Data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    const addVer = await fetch(`https://secretmanager.googleapis.com/v1/${secretName}:addVersion`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ payload: { data: b64Data } }),
    });
    return addVer.ok;
  } catch {
    return false;
  }
}

function buildHostingNotice(persistentAvailable: boolean, mode: VaultStorageMode): string | null {
  if (persistentAvailable) return null;
  if (mode === 'server_encrypted_memory') {
    return 'ملاحظة أمنية: بيئة الاستضافة الحالية لا تفعّل خدمة مخزن الأسرار السحابي الدائم (Google Cloud Secret Manager)؛ والتزاماً بحماية التوكن لم يتم حفظه في قاعدة البيانات (Firestore) أو ملفات التطبيق، بل حُفظ مشفراً (AES-256-GCM) في ذاكرة الخادم المعزولة فقط وسيعمل تلقائياً طوال فترة تشغيل الخادم الحالي.';
  }
  return 'ملاحظة أمنية: خدمة Google Cloud Secret Manager غير مفعّلة في بيئة الاستضافة الحالية؛ عند حفظ الإعدادات من هذه الواجهة سيُحفظ التوكن مشفراً (AES-256-GCM) في ذاكرة الخادم المعزولة فقط دون تخزينه في قاعدة البيانات أو الملفات.';
}

function readEnvFallback(): { owner: string; repo: string; token: string } {
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

export async function getResolvedGitHubCredentials(): Promise<ResolvedGitHubVaultCredentials> {
  const persistentAvailable = await probeGcpSecretManager();

  if (persistentAvailable && !gcpInitialLoadAttempted && !sealedRamVault) {
    gcpInitialLoadAttempted = true;
    const fromGcp = await readFromGcpSecretManager();
    if (fromGcp) {
      sealPayloadInRam(fromGcp);
    }
  }

  const ramData = unsealPayloadFromRam();
  const envData = readEnvFallback();

  if (ramData) {
    const mergedOwner = ramData.owner || envData.owner;
    const mergedRepo = ramData.repo || envData.repo;
    const mergedToken = ramData.token || envData.token;
    const mode: VaultStorageMode = persistentAvailable ? 'gcp_secret_manager' : 'server_encrypted_memory';
    return {
      owner: mergedOwner,
      repo: mergedRepo,
      token: mergedToken,
      hasToken: mergedToken.length > 0,
      vault: {
        storageMode: mode,
        persistentVaultAvailable: persistentAvailable,
        hasSavedToken: mergedToken.length > 0,
        updatedAt: ramData.updatedAt,
        hostingVaultNoticeAr: buildHostingNotice(persistentAvailable, mode),
      },
    };
  }

  const hasAnyEnv = Boolean(envData.owner || envData.repo || envData.token);
  const mode: VaultStorageMode = hasAnyEnv ? 'server_env' : 'unconfigured';
  return {
    owner: envData.owner,
    repo: envData.repo,
    token: envData.token,
    hasToken: envData.token.length > 0,
    vault: {
      storageMode: mode,
      persistentVaultAvailable: persistentAvailable,
      hasSavedToken: envData.token.length > 0,
      updatedAt: null,
      hostingVaultNoticeAr: buildHostingNotice(persistentAvailable, mode),
    },
  };
}

export async function saveGitHubCredentialsToVault(input: {
  owner: string;
  repo: string;
  token?: string;
}): Promise<{
  owner: string;
  repo: string;
  hasToken: boolean;
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

  const current = await getResolvedGitHubCredentials();
  const incomingToken = sanitizeGitHubSlug(input.token);

  if (incomingToken && /\s/.test(incomingToken)) {
    throw new Error('صيغة التوكن المدخل في GITHUB_TOKEN غير صالحة (يجب ألا يحتوي على مسافات)');
  }

  const effectiveToken = incomingToken || current.token;
  if (!effectiveToken) {
    throw new Error('يرجى إدخال التوكن السري (GITHUB_TOKEN) لحفظ الإعدادات لأول مرة');
  }

  const payload: StoredVaultPayload = {
    owner: parsed.owner,
    repo: parsed.repo,
    token: effectiveToken,
    updatedAt: Date.now(),
  };

  const persistedInGcp = await writeToGcpSecretManager(payload);
  sealPayloadInRam(payload);

  const mode: VaultStorageMode = persistedInGcp ? 'gcp_secret_manager' : 'server_encrypted_memory';
  return {
    owner: payload.owner,
    repo: payload.repo,
    hasToken: true,
    vault: {
      storageMode: mode,
      persistentVaultAvailable: persistedInGcp,
      hasSavedToken: true,
      updatedAt: payload.updatedAt,
      hostingVaultNoticeAr: buildHostingNotice(persistedInGcp, mode),
    },
  };
}
