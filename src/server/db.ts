import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  isSupabaseConfigured,
  testSupabaseConnection,
  supabaseGetUserById,
  supabaseGetUserByUsername,
  supabaseGetAllUsers,
  supabaseUpsertUser,
  supabaseGetChannels,
  supabaseGetChannelById,
  supabaseUpsertChannel,
  supabaseGetChannelMessages,
  supabaseInsertChannelMessage,
  supabaseGetPrivateMessages,
  supabaseInsertPrivateMessage,
  supabaseGetUserChallenge,
  supabaseUpsertUserChallenge,
  supabaseGetUserTrades,
  supabaseInsertTrade,
  supabaseGetLatestAppUpdate,
  supabaseUpsertAppUpdate,
  syncAllToSupabase,
  reconcileSupabaseData,
} from './supabase.ts';

/**
 * Google Cloud Firestore Persistence Layer for Sami Full-Stack Application
 * Targeting project: majestic-interface-ksmzh
 * Database ID: ai-studio-c1d1b606-9578-42a6-b7b2-17faaec47f72
 */

const SHARED_FIREBASE_PROJECT_ID = 'majestic-interface-ksmzh';
const SHARED_FIRESTORE_DB_ID = 'ai-studio-c1d1b606-9578-42a6-b7b2-17faaec47f72';

function loadAppletConfig(): Record<string, string> {
  try {
    const configPath = path.resolve('firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch {}
  return {};
}

const appletConfig = loadAppletConfig();

function resolveProjectId(): string {
  const envProj = (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || appletConfig.projectId || '').trim();
  if (!envProj || envProj.startsWith('ai-studio-') || envProj.endsWith('-media')) {
    return SHARED_FIREBASE_PROJECT_ID;
  }
  return envProj;
}

function resolveDatabaseId(): string {
  const envDb = (process.env.FIRESTORE_DATABASE_ID || appletConfig.firestoreDatabaseId || '').trim();
  if (
    !envDb ||
    envDb.endsWith('-media') ||
    envDb.includes('.firebasestorage.') ||
    envDb.includes('.appspot.')
  ) {
    return SHARED_FIRESTORE_DB_ID;
  }
  return envDb;
}

export const projectId = resolveProjectId();
export const databaseId = resolveDatabaseId();

// 1. Initialize Google Cloud Firestore Server Client (with graceful local fallback)
let firestoreClient: any = null;
let firestoreInitError: string | null = null;

try {
  let FirestoreClass: any = null;
  try {
    // Dynamic require/import to prevent crash if @google-cloud/firestore is absent
    const gcf = (await import('@google-cloud/firestore' as any).catch(() => null)) as any;
    FirestoreClass = gcf?.Firestore || null;
  } catch {}

  if (FirestoreClass) {
    const options: Record<string, unknown> = {
      projectId,
      databaseId: databaseId === '(default)' ? undefined : databaseId,
    };

    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      try {
        const raw = process.env.GCP_SERVICE_ACCOUNT_KEY.trim();
        const jsonStr = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
        options.credentials = JSON.parse(jsonStr);
      } catch (e: any) {
        console.warn('[Sami DB] Failed to parse GCP_SERVICE_ACCOUNT_KEY:', e.message);
      }
    }

    firestoreClient = new FirestoreClass(options);
    console.log(`[Sami DB] Google Cloud Firestore client initialized for project: ${projectId}, database: ${databaseId}`);
  } else {
    console.log('[Sami DB] Running with local persistent disk store (persistent_store.json)');
  }
} catch (err: any) {
  firestoreInitError = err?.message || String(err);
  console.warn('[Sami DB] Firestore client notice:', firestoreInitError);
}

import { firestoreMetrics } from './metrics.ts';

export { firestoreClient };

// Circuit Breaker and Rate-Limiting Backoff
let firestoreRestBackoffUntil = 0;
export const FIRESTORE_QUOTA_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown on quota exhaustion (RESOURCE_EXHAUSTED)
export const FIRESTORE_BACKOFF_DURATION_MS = FIRESTORE_QUOTA_COOLDOWN_MS;

export function setFirestoreRestBackoff(durationMs = FIRESTORE_QUOTA_COOLDOWN_MS) {
  firestoreRestBackoffUntil = Math.max(firestoreRestBackoffUntil, Date.now() + durationMs);
  firestoreMetrics.setCircuitBreaker(firestoreRestBackoffUntil);
}

export function isFirestoreRestBackoffActive(): boolean {
  return Date.now() < firestoreRestBackoffUntil || firestoreMetrics.isCircuitBreakerActive();
}

export function handleFirestoreQuotaOrError(err: any, caller: string, collection: string) {
  const msg = err?.message || String(err);
  firestoreMetrics.recordError(caller, collection, err);
  if (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota') ||
    msg.includes('429') ||
    msg.includes('8 RESOURCE_EXHAUSTED')
  ) {
    setFirestoreRestBackoff(FIRESTORE_QUOTA_COOLDOWN_MS);
    console.warn(
      `[Sami DB] 🛡️ Firestore Quota Exceeded in ${caller} (${collection}). Entering 15-minute circuit breaker cooldown. All requests securely served from memory & local persistent store.`
    );
  } else {
    console.warn(`[Sami DB] Firestore notice in ${caller} (${collection}):`, msg);
  }
}

// ============================================================================
// IN-MEMORY TTL CACHES (ZERO-COST READ DEFENSE)
// ============================================================================
export const userCache = new Map<number, { user: UserRecord; cachedAt: number }>();
export const usernameCache = new Map<string, { user: UserRecord; cachedAt: number }>();
const USER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cachedChannels: { channels: ChannelRecord[]; cachedAt: number } | null = null;
const CHANNELS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedAllUsers: { users: Omit<UserRecord, 'passwordHash' | 'salt'>[]; cachedAt: number } | null = null;
const ALL_USERS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const channelMessagesCache = new Map<string, { messages: ChannelMessage[]; cachedAt: number }>();
const CHANNEL_MESSAGES_TTL_MS = 60 * 1000; // 60 seconds

const privateMessagesCache = new Map<string, { messages: PrivateMessageRecord[]; cachedAt: number }>();
const PRIVATE_MESSAGES_TTL_MS = 60 * 1000; // 60 seconds

const userConversationsCache = new Map<number, { conversations: any[]; cachedAt: number }>();
const USER_CONVERSATIONS_TTL_MS = 2 * 60 * 1000; // 2 minutes

const challengeCache = new Map<number, { challenge: ChallengeRecord; cachedAt: number }>();
const tradesCache = new Map<number, { trades: TradeRecord[]; cachedAt: number }>();
const CHALLENGE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateUserCache(userId?: number) {
  if (userId) {
    userCache.delete(userId);
  } else {
    userCache.clear();
  }
  usernameCache.clear();
  cachedAllUsers = null;
}

export function invalidateChannelCache(channelId?: string) {
  cachedChannels = null;
  if (channelId) {
    channelMessagesCache.delete(channelId);
  }
}

export function invalidatePrivateMessagesCache(u1: number, u2: number) {
  const pairKey = [u1, u2].sort((a, b) => a - b).join('_');
  privateMessagesCache.delete(pairKey);
  userConversationsCache.delete(u1);
  userConversationsCache.delete(u2);
}

// Persistent local disk store file for data survival across container restarts if cloud ADC is pending
const DATA_DIR = path.resolve('data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'persistent_store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface LocalDiskStore {
  users: Record<string, any>;
  channels: Record<string, any>;
  channelMessages: Record<string, any[]>;
  privateMessages: Record<string, any[]>;
  challenges: Record<string, any>;
  trades: Record<string, any[]>;
  appUpdates?: AppUpdateRecord;
  appUpdatesHistory?: AppUpdateRecord[];
}

function loadLocalDiskStore(): LocalDiskStore {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORE_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn('[Sami DB] Notice reading persistent store file, initializing clean store');
  }
  return {
    users: {},
    channels: {},
    channelMessages: {},
    privateMessages: {},
    challenges: {},
    trades: {},
  };
}

function saveLocalDiskStore(store: LocalDiskStore): void {
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('[Sami DB] Error persisting store to disk:', e);
  }
}

const diskStore = loadLocalDiskStore();

// Dynamic secure PBKDF2 Password Hashing with per-user salt
export function hashPasswordWithSalt(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyUserPassword(password: string, hash: string, salt: string): boolean {
  try {
    const calculated = hashPasswordWithSalt(password, salt);
    return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

// ============================================================================
// FIRESTORE TEST & VERIFICATION
// ============================================================================

export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  projectId: string;
  databaseId: string;
  error?: string;
  errorType?: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'OTHER';
}> {
  if (!firestoreClient) {
    return {
      connected: false,
      projectId,
      databaseId,
      error: firestoreInitError || 'Firestore client was not initialized',
      errorType: 'UNAVAILABLE',
    };
  }

  try {
    // Attempt a live read from health ping collection
    const pingRef = firestoreClient.collection('_system_health').doc('ping');
    await pingRef.get();
    return {
      connected: true,
      projectId,
      databaseId,
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    let errorType: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'OTHER' = 'OTHER';

    if (msg.includes('PERMISSION_DENIED') || msg.includes('7 PERMISSION_DENIED')) {
      errorType = 'PERMISSION_DENIED';
    } else if (msg.includes('NOT_FOUND') || msg.includes('5 NOT_FOUND')) {
      errorType = 'NOT_FOUND';
    } else if (msg.includes('Quota') || msg.includes('8 RESOURCE_EXHAUSTED')) {
      errorType = 'QUOTA_EXCEEDED';
    } else if (msg.includes('UNAVAILABLE') || msg.includes('14 UNAVAILABLE')) {
      errorType = 'UNAVAILABLE';
    }

    return {
      connected: false,
      projectId,
      databaseId,
      error: msg,
      errorType,
    };
  }
}

// ============================================================================
// USER PERSISTENCE (FIRESTORE PRIMARY WITH LOCAL DISK SURVIVAL)
// ============================================================================

export interface UserRecord {
  id: number;
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  role: 'owner' | 'moderator' | 'user' | 'guest';
  avatarUrl?: string | null;
  warningsCount?: number;
  createdAt: number;
  updatedAt: number;
}

export async function getUserById(userId: number): Promise<UserRecord | null> {
  // 0. Check in-memory cache first (ZERO network reads!)
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL_MS) {
    firestoreMetrics.recordRead('getUserById', 'users', 'cache_hit', 1, true);
    return cached.user;
  }

  // If in circuit breaker or rate limit, use persistent disk store directly
  if (isFirestoreRestBackoffActive()) {
    const diskUser = diskStore.users[String(userId)] || null;
    if (diskUser) {
      userCache.set(userId, { user: diskUser, cachedAt: Date.now() });
      firestoreMetrics.recordRead('getUserById', 'users', 'cache_hit', 1, true);
    }
    return diskUser;
  }

  // 1. Try Google Cloud Firestore
  if (firestoreClient) {
    try {
      const snap = await firestoreClient.collection('users').doc(String(userId)).get();
      if (snap.exists) {
        const u = snap.data() as UserRecord;
        userCache.set(userId, { user: u, cachedAt: Date.now() });
        diskStore.users[String(userId)] = u;
        firestoreMetrics.recordRead('getUserById', 'users', 'getDoc', 1, false);
        return u;
      }
    } catch (err: any) {
      handleFirestoreQuotaOrError(err, 'getUserById', 'users');
    }
  }

  // 2. Try Supabase fallback if configured
  if (isSupabaseConfigured()) {
    try {
      const sbUser = await supabaseGetUserById(userId);
      if (sbUser) {
        userCache.set(userId, { user: sbUser, cachedAt: Date.now() });
        return sbUser;
      }
    } catch (err: any) {
      console.warn(`[Sami DB] Supabase read notice for user ${userId}:`, err.message);
    }
  }

  // 3. Persistent disk fallback
  const diskFallback = diskStore.users[String(userId)] || null;
  if (diskFallback) {
    userCache.set(userId, { user: diskFallback, cachedAt: Date.now() });
  }
  return diskFallback;
}

export async function getUserByUsername(username: string): Promise<UserRecord | null> {
  const clean = username.trim().toLowerCase();

  // 0. Check in-memory cache first (ZERO network reads!)
  const cached = usernameCache.get(clean);
  if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL_MS) {
    firestoreMetrics.recordRead('getUserByUsername', 'users', 'cache_hit', 1, true);
    return cached.user;
  }

  // If in circuit breaker or rate limit, use persistent disk store directly
  if (isFirestoreRestBackoffActive()) {
    for (const u of Object.values(diskStore.users)) {
      if (u.username && u.username.toLowerCase() === clean) {
        usernameCache.set(clean, { user: u as UserRecord, cachedAt: Date.now() });
        firestoreMetrics.recordRead('getUserByUsername', 'users', 'cache_hit', 1, true);
        return u as UserRecord;
      }
    }
    return null;
  }

  // 1. Try Google Cloud Firestore
  if (firestoreClient) {
    try {
      const snap = await firestoreClient
        .collection('users')
        .where('usernameLower', '==', clean)
        .limit(1)
        .get();
      if (!snap.empty) {
        const u = snap.docs[0].data() as UserRecord;
        usernameCache.set(clean, { user: u, cachedAt: Date.now() });
        userCache.set(u.id, { user: u, cachedAt: Date.now() });
        diskStore.users[String(u.id)] = u;
        firestoreMetrics.recordRead('getUserByUsername', 'users', 'query', 1, false);
        return u;
      }
    } catch (err: any) {
      handleFirestoreQuotaOrError(err, 'getUserByUsername', 'users');
    }
  }

  // 2. Try Supabase fallback if configured
  if (isSupabaseConfigured()) {
    try {
      const sbUser = await supabaseGetUserByUsername(clean);
      if (sbUser) {
        usernameCache.set(clean, { user: sbUser, cachedAt: Date.now() });
        userCache.set(sbUser.id, { user: sbUser, cachedAt: Date.now() });
        return sbUser;
      }
    } catch (err: any) {
      console.warn(`[Sami DB] Supabase read notice for username ${username}:`, err.message);
    }
  }

  // 3. Persistent disk fallback
  for (const u of Object.values(diskStore.users)) {
    if (u.username && u.username.toLowerCase() === clean) {
      usernameCache.set(clean, { user: u as UserRecord, cachedAt: Date.now() });
      userCache.set(u.id, { user: u, cachedAt: Date.now() });
      return u as UserRecord;
    }
  }

  return null;
}

export async function getUsersCount(): Promise<number> {
  if (firestoreClient) {
    try {
      const snap = await firestoreClient.collection('users').count().get();
      return snap.data().count;
    } catch {
      // Ignore and fallback
    }
  }
  return Object.keys(diskStore.users).length;
}

export async function createUserRecord(user: {
  username: string;
  displayName: string;
  password: string;
  role?: 'owner' | 'moderator' | 'user' | 'guest';
  avatarUrl?: string | null;
}): Promise<UserRecord> {
  const existingCount = await getUsersCount();
  // Self-bootstrap: If zero users exist, first user is automatically Owner
  const role = user.role || (existingCount === 0 ? 'owner' : 'user');
  const now = Date.now();
  const salt = generateSalt();
  const passwordHash = hashPasswordWithSalt(user.password, salt);
  const nextId = existingCount === 0 ? 1 : Math.max(1, ...Object.keys(diskStore.users).map(Number)) + 1;

  const record: UserRecord = {
    id: nextId,
    username: user.username.trim(),
    displayName: user.displayName.trim() || user.username.trim(),
    passwordHash,
    salt,
    role,
    avatarUrl: user.avatarUrl || null,
    warningsCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Try Google Cloud Firestore
  if (firestoreClient) {
    try {
      await firestoreClient.collection('users').doc(String(record.id)).set({
        ...record,
        usernameLower: record.username.toLowerCase(),
      });
      console.log(`[Sami DB] User ${record.username} (ID: ${record.id}) saved to Firestore.`);
    } catch (err: any) {
      console.warn(`[Sami DB] Firestore write notice for user ${record.id}:`, err.message);
    }
  }

  // 2. Save to persistent disk store
  diskStore.users[String(record.id)] = record;
  saveLocalDiskStore(diskStore);

  // 3. Dual-write to Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    supabaseUpsertUser(record).catch((e) =>
      console.warn('[Sami DB] Supabase dual-write user note:', e?.message || e)
    );
  }

  return record;
}

export async function getAllUsersList(): Promise<Omit<UserRecord, 'passwordHash' | 'salt'>[]> {
  // 0. Check memory cache first (ZERO network reads!)
  if (cachedAllUsers && Date.now() - cachedAllUsers.cachedAt < ALL_USERS_CACHE_TTL_MS) {
    firestoreMetrics.recordRead('getAllUsersList', 'users', 'cache_hit', cachedAllUsers.users.length, true);
    return cachedAllUsers.users;
  }

  const results: Record<string, Omit<UserRecord, 'passwordHash' | 'salt'>> = {};

  // If in circuit breaker or rate limit, return directly from persistent disk store!
  if (isFirestoreRestBackoffActive()) {
    for (const [id, d] of Object.entries(diskStore.users)) {
      results[id] = {
        id: d.id,
        username: d.username,
        displayName: d.displayName,
        role: d.role,
        avatarUrl: d.avatarUrl,
        warningsCount: d.warningsCount,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    }
    const userList = Object.values(results);
    cachedAllUsers = { users: userList, cachedAt: Date.now() };
    firestoreMetrics.recordRead('getAllUsersList', 'users', 'cache_hit', userList.length, true);
    return userList;
  }

  if (firestoreClient) {
    try {
      const snap = await firestoreClient.collection('users').get();
      snap.forEach((doc: any) => {
        const d = doc.data();
        results[doc.id] = {
          id: d.id,
          username: d.username,
          displayName: d.displayName,
          role: d.role,
          avatarUrl: d.avatarUrl,
          warningsCount: d.warningsCount,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      });
      firestoreMetrics.recordRead('getAllUsersList', 'users', 'getDocs', snap.size, false);
    } catch (err: any) {
      handleFirestoreQuotaOrError(err, 'getAllUsersList', 'users');
    }
  }

  for (const [id, d] of Object.entries(diskStore.users)) {
    if (!results[id]) {
      results[id] = {
        id: d.id,
        username: d.username,
        displayName: d.displayName,
        role: d.role,
        avatarUrl: d.avatarUrl,
        warningsCount: d.warningsCount,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    }
  }

  // Fallback: also read shared Firestore community_users via REST if needed and not backed off
  if (!isFirestoreRestBackoffActive() && Object.keys(results).length === 0) {
    try {
      const dbSeg = encodeURIComponent(databaseId || '(default)');
      const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${dbSeg}/documents:runQuery`;
      const res = await fetch(runQueryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'community_users' }],
            limit: 100,
          },
        }),
      });

      if (res.status === 429) {
        setFirestoreRestBackoff(FIRESTORE_QUOTA_COOLDOWN_MS);
      } else if (res.ok) {
        const rows: any[] = await res.json();
        if (Array.isArray(rows)) {
          for (const row of rows) {
            const doc = row?.document;
            const f = doc?.fields;
            if (!doc?.name || !f) continue;
            const docId = String(doc.name).split('/').pop() || '';
            const uid = Number(f.id?.integerValue || docId || 0);
            if (!uid || uid <= 0 || uid >= 9000000) continue;
            const key = String(uid);
            if (!results[key]) {
              const rawRole = String(f.role?.stringValue || 'user');
              const role: UserRecord['role'] =
                uid === 1
                  ? 'owner'
                  : rawRole === 'moderator'
                    ? 'moderator'
                    : rawRole === 'guest'
                      ? 'guest'
                      : 'user';
              results[key] = {
                id: uid,
                username: String(f.username?.stringValue || `user_${uid}`),
                displayName: String(f.displayName?.stringValue || f.username?.stringValue || `مستخدم ${uid}`),
                role,
                avatarUrl: f.avatarUrl?.stringValue || null,
                warningsCount: Number(f.warningsCount?.integerValue || 0),
                createdAt: Number(f.createdAt?.integerValue || Date.now()),
                updatedAt: Number(f.updatedAt?.integerValue || Date.now()),
              };
            }
          }
        }
      }
    } catch {}
  }

  // Fallback: read from Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    try {
      const sbUsers = await supabaseGetAllUsers();
      for (const u of sbUsers) {
        const key = String(u.id);
        if (!results[key]) {
          results[key] = u;
        }
      }
    } catch {}
  }

  const finalUsers = Object.values(results);
  cachedAllUsers = { users: finalUsers, cachedAt: Date.now() };
  return finalUsers;
}


// ============================================================================
// CHANNELS PERSISTENCE
// ============================================================================

export interface ChannelRecord {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  isOpenPublic?: boolean;
  password?: string;
  imageUrl?: string | null;
  storagePath?: string | null;
  visibility: 'public' | 'visible' | 'hidden';
  allowedMemberIds: number[];
  memberIds: number[];
  createdAt: number;
  updatedAt?: number;
  displayMemberCount?: number | null;
}

export function isChannelOpenPublic(channel: Partial<ChannelRecord> | null | undefined): boolean {
  if (!channel) return false;
  if (channel.visibility === 'hidden') return false;
  if (channel.isOpenPublic === true) return true;
  if (channel.isOpenPublic === false) return false;
  const hasPassword = typeof channel.password === 'string' && channel.password.trim().length > 0;
  return !channel.isPrivate && !hasPassword;
}

export const INITIAL_CHANNELS_CONFIG: ChannelRecord[] = [
  {
    id: 'general_trading',
    name: '💬 دردشة عامة - دفعة 3000$',
    description: 'القناة العامة لتبادل الأفكار والنقاشات بين جميع المشتركين.',
    isPrivate: false,
    visibility: 'public',
    allowedMemberIds: [],
    memberIds: [1],
    createdAt: 1735689600000,
  },
  {
    id: 'signals_vip',
    name: '👑 قناة Sami VIP الخاصة',
    description: 'قناة التوصيات والصفقات المتقدمة الخاصة بالأعضاء المصرح لهم فقط.',
    isPrivate: true,
    visibility: 'hidden',
    allowedMemberIds: [1],
    memberIds: [1],
    createdAt: 1735689600000,
  },
];

// Seed initial channels to persistent disk if missing
for (const c of INITIAL_CHANNELS_CONFIG) {
  if (!diskStore.channels[c.id]) {
    diskStore.channels[c.id] = c;
  }
}
saveLocalDiskStore(diskStore);

export async function getChannelsForUser(userId: number, role: string): Promise<ChannelRecord[]> {
  const channelMap: Record<string, ChannelRecord> = {};

  if (firestoreClient) {
    try {
      const snap = await firestoreClient.collection('channels').get();
      snap.forEach((doc: any) => {
        channelMap[doc.id] = doc.data() as ChannelRecord;
      });
    } catch (err: any) {
      console.warn('[Sami DB] Firestore channels read notice:', err.message);
    }
  }

  // Fallback / merge from Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    try {
      const sbChannels = await supabaseGetChannels();
      for (const c of sbChannels) {
        if (!channelMap[c.id]) {
          channelMap[c.id] = c;
        }
      }
    } catch (err: any) {
      console.warn('[Sami DB] Supabase channels read notice:', err.message);
    }
  }

  // Merge with disk store
  for (const [id, c] of Object.entries(diskStore.channels)) {
    if (!channelMap[id]) {
      channelMap[id] = c;
    }
  }

  // Filter based on Zero-Trust RBAC permissions
  return Object.values(channelMap).filter((channel) => {
    // Owner sees all channels
    if (role === 'owner') return true;

    // Hidden channels are strictly invisible to unauthorized users
    if (channel.visibility === 'hidden') {
      return channel.allowedMemberIds?.includes(userId) || channel.memberIds?.includes(userId);
    }

    // Open public channels are visible to everyone including guests
    if (isChannelOpenPublic(channel)) {
      return true;
    }

    // Private channels require explicit membership (guests cannot access private/protected channels)
    if (role === 'guest') {
      return false;
    }
    if (channel.isPrivate) {
      return channel.allowedMemberIds?.includes(userId) || channel.memberIds?.includes(userId);
    }

    // Public channels visible to registered users
    return true;
  });
}

export async function getChannelById(channelId: string): Promise<ChannelRecord | null> {
  if (firestoreClient) {
    try {
      const doc = await firestoreClient.collection('channels').doc(channelId).get();
      if (doc.exists) {
        return doc.data() as ChannelRecord;
      }
      const commDoc = await firestoreClient.collection('community_channels').doc(channelId).get();
      if (commDoc.exists) {
        return commDoc.data() as ChannelRecord;
      }
    } catch {}
  }

  // Fallback to Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    try {
      const sbChannel = await supabaseGetChannelById(channelId);
      if (sbChannel) return sbChannel;
    } catch {}
  }

  if (diskStore.channels[channelId]) {
    return diskStore.channels[channelId];
  }
  // Fallback: read from shared Firestore community_channels via REST
  if (!isFirestoreRestBackoffActive()) {
    try {
      const dbSeg = encodeURIComponent(databaseId || '(default)');
      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${dbSeg}/documents/community_channels/${encodeURIComponent(channelId)}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Cache-Control': 'no-cache' } });
      if (res.status === 429) {
        setFirestoreRestBackoff(FIRESTORE_BACKOFF_DURATION_MS);
      } else if (res.ok) {
        const json: any = await res.json();
        const f = json?.fields;
        if (f) {
          const str = (v: any) => (v && 'stringValue' in v ? String(v.stringValue) : undefined);
          const bool = (v: any) => (v && 'booleanValue' in v ? Boolean(v.booleanValue) : undefined);
          const num = (v: any) => (v && 'integerValue' in v ? Number(v.integerValue) : v && 'doubleValue' in v ? Number(v.doubleValue) : undefined);
          const arrNums = (v: any): number[] =>
            Array.isArray(v?.arrayValue?.values)
              ? v.arrayValue.values.map((x: any) => num(x)).filter((n: any): n is number => typeof n === 'number' && !isNaN(n))
              : [];
          const pwd = str(f.password) ?? '';
          const vis = str(f.visibility) === 'hidden' ? 'hidden' : 'public';
          const openPub = bool(f.isOpenPublic) ?? (vis !== 'hidden' && !pwd.trim() && bool(f.isPrivate) !== true);
          return {
            id: str(f.id) || channelId,
            name: str(f.name) || 'قناة تداول',
            description: str(f.description) || '',
            password: pwd,
            isOpenPublic: openPub,
            isPrivate: !openPub && (bool(f.isPrivate) ?? Boolean(pwd.trim() || vis === 'hidden')),
            visibility: vis,
            allowedMemberIds: arrNums(f.allowedMemberIds),
            memberIds: arrNums(f.memberIds),
            createdAt: num(f.createdAt) || Date.now(),
            updatedAt: num(f.updatedAt) || Date.now(),
            displayMemberCount: num(f.displayMemberCount) ?? null,
          };
        }
      }
    } catch {}
  }
  return null;
}

export async function saveChannelRecord(channel: ChannelRecord): Promise<void> {
  diskStore.channels[channel.id] = channel;
  saveLocalDiskStore(diskStore);

  if (firestoreClient) {
    try {
      await firestoreClient.collection('channels').doc(channel.id).set(channel, { merge: true });
      await firestoreClient.collection('community_channels').doc(channel.id).set(channel, { merge: true });
    } catch (err: any) {
      console.warn('[Sami DB] Firestore save channel note:', err?.message);
    }
  }

  // Dual-write to Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    supabaseUpsertChannel(channel).catch((e) =>
      console.warn('[Sami DB] Supabase save channel note:', e?.message || e)
    );
  }
}

export async function joinChannelWithAccessCheck(params: {
  channelId: string;
  userId: number;
  userRole: string;
  isGuest?: boolean;
  password?: string;
}): Promise<{ channel: ChannelRecord }> {
  const { channelId, userId, userRole, isGuest, password } = params;
  const channel = await getChannelById(channelId);
  if (!channel) {
    throw new Error('القناة غير موجودة');
  }

  if (channel.visibility === 'hidden' && userRole !== 'owner') {
    const isAllowed = channel.allowedMemberIds?.includes(userId) || channel.memberIds?.includes(userId);
    if (!isAllowed) {
      throw new Error('هذه القناة مخفية ومخصصة للأعضاء المصرح لهم فقط');
    }
  }

  const openPublic = isChannelOpenPublic(channel);
  const guestAccount = Boolean(isGuest || userRole === 'guest' || userId > 9000000);

  if (!openPublic && userRole !== 'owner') {
    if (guestAccount) {
      throw new Error('القنوات المحمية والخاصة متاحة للأعضاء المسجلين فقط');
    }
    if (channel.password && channel.password.trim().length > 0) {
      if ((password || '').trim() !== channel.password.trim()) {
        throw new Error('كلمة مرور القناة غير صحيحة');
      }
    } else if (channel.isPrivate) {
      const isAllowed = channel.allowedMemberIds?.includes(userId) || channel.memberIds?.includes(userId);
      if (!isAllowed) {
        throw new Error('ليس لديك صلاحية للانضمام إلى هذه القناة الخاصة');
      }
    }
  }

  // Persist membership for registered users (guests get read/chat access with guest role without polluting admin lists)
  if (!guestAccount && userId > 0) {
    const updatedMembers = Array.from(new Set([1, ...(channel.memberIds || []), userId]));
    channel.memberIds = updatedMembers;
    if (!openPublic && Array.isArray(channel.allowedMemberIds)) {
      channel.allowedMemberIds = Array.from(new Set([1, ...channel.allowedMemberIds, userId]));
    }
    channel.updatedAt = Date.now();
    await saveChannelRecord(channel);
  }

  return { channel };
}

export async function updateChannelMembers(channelId: string, memberIds: number[]): Promise<ChannelRecord | null> {
  const channel = await getChannelById(channelId);
  if (!channel) return null;

  channel.allowedMemberIds = Array.from(new Set([...memberIds, 1])); // Owner always included
  channel.memberIds = channel.allowedMemberIds;

  await saveChannelRecord(channel);
  return channel;
}

// ============================================================================
// MESSAGES PERSISTENCE
// ============================================================================

export interface ChannelMessage {
  id: string;
  channelId: string;
  senderId: number;
  senderName: string;
  senderRole: string;
  senderAvatarUrl?: string | null;
  text?: string;
  imageUrl?: string;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  replyToId?: string | null;
  replyToText?: string | null;
  replyToSenderName?: string | null;
  isDeleted?: boolean;
  timestamp: number;
}

export async function getChannelMessages(channelId: string, limitCount = 80, beforeTimestamp?: number): Promise<ChannelMessage[]> {
  if (firestoreClient) {
    try {
      let q = firestoreClient
        .collection('channels')
        .doc(channelId)
        .collection('messages')
        .orderBy('timestamp', 'asc');

      if (beforeTimestamp && beforeTimestamp > 0) {
        q = q.where('timestamp', '<', beforeTimestamp);
      }

      const snap = await q.limitToLast(limitCount).get();

      if (!snap.empty) {
        return snap.docs.map((d: any) => d.data() as ChannelMessage);
      }
    } catch (err: any) {
      console.warn(`[Sami DB] Firestore messages read notice for ${channelId}:`, err.message);
    }
  }

  // Fallback to Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    try {
      const sbMsgs = await supabaseGetChannelMessages(channelId, limitCount);
      if (sbMsgs && sbMsgs.length > 0) {
        return beforeTimestamp && beforeTimestamp > 0
          ? sbMsgs.filter((m) => m.timestamp < beforeTimestamp).slice(-limitCount)
          : sbMsgs;
      }
    } catch (err: any) {
      console.warn(`[Sami DB] Supabase messages read notice for ${channelId}:`, err.message);
    }
  }

  // Fallback to persistent disk store
  let list = diskStore.channelMessages[channelId] || [];
  if (beforeTimestamp && beforeTimestamp > 0) {
    list = list.filter((m: any) => m && Number(m.timestamp) < beforeTimestamp);
  }
  return limitCount > 0 ? list.slice(-limitCount) : list;
}

export async function saveChannelMessage(message: ChannelMessage): Promise<void> {
  if (firestoreClient) {
    try {
      await firestoreClient
        .collection('channels')
        .doc(message.channelId)
        .collection('messages')
        .doc(message.id)
        .set(message);
    } catch (err: any) {
      console.warn('[Sami DB] Firestore message write notice:', err.message);
    }
  }

  if (!diskStore.channelMessages[message.channelId]) {
    diskStore.channelMessages[message.channelId] = [];
  }
  diskStore.channelMessages[message.channelId].push(message);
  saveLocalDiskStore(diskStore);

  // Dual-write to Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    supabaseInsertChannelMessage(message).catch((e) =>
      console.warn('[Sami DB] Supabase message write notice:', e?.message || e)
    );
  }
}

// ============================================================================
// CHALLENGE & TRADES PERSISTENCE (150 MILESTONES)
// ============================================================================

export interface ChallengeRecord {
  id: string;
  userId: number;
  userName: string;
  initialCapitalCents: number;
  currentBalanceCents: number;
  targetBalanceCents: number;
  tradeCount: number;
  challengeStarted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TradeRecord {
  id: string;
  challengeId: string;
  userId: number;
  tradeNumber: number;
  resultCents: number;
  oldBalanceCents: number;
  newBalanceCents: number;
  type: 'WIN' | 'LOSS';
  attachmentPath?: string | null;
  timestamp: number;
}

export async function getUserChallenge(userId: number, userName = ''): Promise<ChallengeRecord> {
  const challengeId = `challenge_${userId}`;

  if (firestoreClient) {
    try {
      const doc = await firestoreClient.collection('challenges').doc(challengeId).get();
      if (doc.exists) {
        return doc.data() as ChallengeRecord;
      }
    } catch {}
  }

  // Fallback to Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    try {
      const sbChal = await supabaseGetUserChallenge(userId);
      if (sbChal) return sbChal;
    } catch {}
  }

  if (diskStore.challenges[String(userId)]) {
    return diskStore.challenges[String(userId)];
  }

  const defaultChallenge: ChallengeRecord = {
    id: challengeId,
    userId,
    userName: userName || `متداول #${userId}`,
    initialCapitalCents: 10000, // $100.00
    currentBalanceCents: 10000,
    targetBalanceCents: 300000, // $3,000.00
    tradeCount: 0,
    challengeStarted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveUserChallenge(defaultChallenge);
  return defaultChallenge;
}

export async function saveUserChallenge(challenge: ChallengeRecord): Promise<void> {
  challenge.updatedAt = Date.now();

  if (firestoreClient) {
    try {
      await firestoreClient.collection('challenges').doc(challenge.id).set(challenge);
    } catch (err: any) {
      console.warn('[Sami DB] Firestore challenge save notice:', err.message);
    }
  }

  diskStore.challenges[String(challenge.userId)] = challenge;
  saveLocalDiskStore(diskStore);

  // Dual-write to Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    supabaseUpsertUserChallenge(challenge).catch((e) =>
      console.warn('[Sami DB] Supabase save challenge note:', e?.message || e)
    );
  }
}

export async function getUserTrades(userId: number): Promise<TradeRecord[]> {
  if (firestoreClient) {
    try {
      const snap = await firestoreClient
        .collection('challenges')
        .doc(`challenge_${userId}`)
        .collection('trades')
        .orderBy('tradeNumber', 'asc')
        .get();

      if (!snap.empty) {
        return snap.docs.map((d: any) => d.data() as TradeRecord);
      }
    } catch {}
  }

  // Fallback to Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    try {
      const sbTrades = await supabaseGetUserTrades(userId);
      if (sbTrades && sbTrades.length > 0) return sbTrades;
    } catch {}
  }

  return diskStore.trades[String(userId)] || [];
}

export async function addTradeRecord(userId: number, trade: TradeRecord, updatedChallenge: ChallengeRecord): Promise<void> {
  if (firestoreClient) {
    try {
      const batch = firestoreClient.batch();
      const chalRef = firestoreClient.collection('challenges').doc(updatedChallenge.id);
      const tradeRef = chalRef.collection('trades').doc(trade.id);

      batch.set(chalRef, updatedChallenge);
      batch.set(tradeRef, trade);
      await batch.commit();
    } catch (err: any) {
      console.warn('[Sami DB] Firestore addTrade notice:', err.message);
    }
  }

  if (!diskStore.trades[String(userId)]) {
    diskStore.trades[String(userId)] = [];
  }
  diskStore.trades[String(userId)].push(trade);
  diskStore.challenges[String(userId)] = updatedChallenge;
  saveLocalDiskStore(diskStore);

  // Dual-write to Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    supabaseInsertTrade(trade, updatedChallenge).catch((e) =>
      console.warn('[Sami DB] Supabase insert trade note:', e?.message || e)
    );
  }
}

// ============================================================================
// PRIVATE MESSAGES PERSISTENCE
// ============================================================================

export interface PrivateMessageRecord {
  id: string;
  conversationId?: string;
  participantId?: number;
  participantName?: string;
  participantIds?: number[];
  senderId: number;
  receiverId: number;
  senderName: string;
  senderRole: string;
  senderAvatarUrl?: string | null;
  text?: string;
  imageUrl?: string;
  storagePath?: string;
  audioUrl?: string;
  audioDuration?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  replyToId?: string | null;
  replyToSenderName?: string | null;
  replyToText?: string | null;
  replyToIsDeleted?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  timestamp: number;
}

export function buildCanonicalConversationId(userId1: number | string, userId2: number | string): string {
  const a = Number(userId1) || 0;
  const b = Number(userId2) || 0;
  return [a, b].sort((x, y) => x - y).join('_');
}

function normalizeMessageTimestamp(rawTs: any, fallbackId?: string): number {
  if (typeof rawTs === 'number' && Number.isFinite(rawTs) && rawTs > 0) {
    return rawTs < 1e11 ? Math.floor(rawTs * 1000) : Math.floor(rawTs);
  }
  if (typeof rawTs === 'string' && rawTs.trim()) {
    const trimmed = rawTs.trim();
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (Number.isFinite(n) && n > 0) return n < 1e11 ? Math.floor(n * 1000) : Math.floor(n);
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  if (rawTs && typeof rawTs === 'object') {
    if (typeof rawTs.toMillis === 'function') {
      const ms = Number(rawTs.toMillis());
      if (Number.isFinite(ms) && ms > 0) return ms;
    }
    if (typeof rawTs.seconds === 'number') {
      return rawTs.seconds * 1000 + Math.floor((Number(rawTs.nanoseconds) || 0) / 1e6);
    }
  }
  if (fallbackId) {
    const m = /^pm_(\d{10,15})_/.exec(fallbackId);
    if (m) return Number(m[1]);
  }
  return Date.now();
}

function normalizeRawPrivateMessage(raw: any, fallbackDocId = ''): PrivateMessageRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || fallbackDocId || '').trim();
  const senderId = Number(raw.senderId || 0);
  if (!id || senderId <= 0) return null;

  const legacyParticipantId = Number(raw.participantId || 0);
  let receiverId = Number(raw.receiverId || 0);
  if (receiverId <= 0 && Array.isArray(raw.participantIds)) {
    const other = raw.participantIds.map(Number).find((n: number) => n > 0 && n !== senderId);
    if (other) receiverId = other;
  }
  if (receiverId <= 0 && typeof raw.conversationId === 'string' && raw.conversationId.includes('_')) {
    const parts = raw.conversationId.split('_').map(Number).filter((n: number) => n > 0);
    const other = parts.find((n: number) => n !== senderId);
    if (other) receiverId = other;
  }
  if (receiverId <= 0) {
    receiverId = senderId === 1 && legacyParticipantId > 0 ? legacyParticipantId : 1;
  }

  const conversationId = buildCanonicalConversationId(senderId, receiverId);
  const participantIds = [Math.min(senderId, receiverId), Math.max(senderId, receiverId)];
  const participantId =
    legacyParticipantId > 0
      ? legacyParticipantId
      : senderId === 1
        ? receiverId
        : receiverId === 1
          ? senderId
          : raw.senderRole === 'moderator'
            ? receiverId
            : senderId;

  return {
    id,
    conversationId,
    participantId,
    participantName: typeof raw.participantName === 'string' ? raw.participantName : undefined,
    participantIds,
    senderId,
    receiverId,
    senderName: String(raw.senderName || 'مستخدم'),
    senderRole: senderId === 1 ? 'owner' : String(raw.senderRole || 'user'),
    senderAvatarUrl: typeof raw.senderAvatarUrl === 'string' ? raw.senderAvatarUrl : null,
    text: typeof raw.text === 'string' ? raw.text : undefined,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
    storagePath: typeof raw.storagePath === 'string' ? raw.storagePath : undefined,
    audioUrl: typeof raw.audioUrl === 'string' ? raw.audioUrl : undefined,
    audioDuration: typeof raw.audioDuration === 'number' ? raw.audioDuration : undefined,
    fileUrl: typeof raw.fileUrl === 'string' ? raw.fileUrl : undefined,
    fileName: typeof raw.fileName === 'string' ? raw.fileName : undefined,
    fileSize: typeof raw.fileSize === 'number' ? raw.fileSize : undefined,
    fileType: typeof raw.fileType === 'string' ? raw.fileType : undefined,
    replyToId: typeof raw.replyToId === 'string' ? raw.replyToId : null,
    replyToSenderName: typeof raw.replyToSenderName === 'string' ? raw.replyToSenderName : null,
    replyToText: typeof raw.replyToText === 'string' ? raw.replyToText : null,
    replyToIsDeleted: Boolean(raw.replyToIsDeleted),
    isEdited: Boolean(raw.isEdited),
    isDeleted: Boolean(raw.isDeleted),
    timestamp: normalizeMessageTimestamp(raw.timestamp ?? raw.createdAt ?? raw.updatedAt, id),
  };
}

async function queryRestPrivateMessagesByField(fieldName: 'senderId' | 'receiverId', userId: number): Promise<PrivateMessageRecord[]> {
  if (isFirestoreRestBackoffActive()) return [];
  try {
    const dbSeg = encodeURIComponent(databaseId || '(default)');
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${dbSeg}/documents:runQuery`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'private_messages' }],
          where: {
            fieldFilter: {
              field: { fieldPath: fieldName },
              op: 'EQUAL',
              value: { integerValue: String(Math.floor(userId)) },
            },
          },
        },
      }),
    });
    if (res.status === 429) {
      setFirestoreRestBackoff(FIRESTORE_BACKOFF_DURATION_MS);
      return [];
    }
    if (!res.ok) return [];
    const rows: any[] = await res.json();
    if (!Array.isArray(rows)) return [];
    const out: PrivateMessageRecord[] = [];
    const decodeField = (v: any): any => {
      if (!v || typeof v !== 'object') return undefined;
      if ('stringValue' in v) return v.stringValue;
      if ('integerValue' in v) return Number(v.integerValue);
      if ('doubleValue' in v) return Number(v.doubleValue);
      if ('booleanValue' in v) return Boolean(v.booleanValue);
      if ('timestampValue' in v) return Date.parse(v.timestampValue);
      if ('nullValue' in v) return null;
      if ('arrayValue' in v) return Array.isArray(v.arrayValue?.values) ? v.arrayValue.values.map(decodeField) : [];
      return undefined;
    };
    for (const row of rows) {
      const doc = row?.document;
      const fields = doc?.fields;
      if (!fields) continue;
      const raw: Record<string, any> = {};
      for (const [k, fv] of Object.entries(fields)) {
        raw[k] = decodeField(fv);
      }
      const docId = String(doc?.name || '').split('/').pop() || '';
      const norm = normalizeRawPrivateMessage(raw, docId);
      if (norm) out.push(norm);
    }
    return out;
  } catch {
    return [];
  }
}

export async function getPrivateMessagesList(userId1: number, userId2: number, limitCount = 80, beforeTimestamp?: number): Promise<PrivateMessageRecord[]> {
  const u1 = Number(userId1);
  const u2 = Number(userId2);
  const pairKey = buildCanonicalConversationId(u1, u2);
  const byId = new Map<string, PrivateMessageRecord>();

  const addIfMatch = (raw: any, docId = '') => {
    const norm = normalizeRawPrivateMessage(raw, docId);
    if (!norm) return;
    if (beforeTimestamp && beforeTimestamp > 0 && norm.timestamp >= beforeTimestamp) return;
    if ((norm.senderId === u1 && norm.receiverId === u2) || (norm.senderId === u2 && norm.receiverId === u1)) {
      byId.set(norm.id, norm);
    }
  };

  if (firestoreClient) {
    try {
      const [sentSnap, recvSnap, subSnap] = await Promise.all([
        firestoreClient.collection('private_messages').where('senderId', '==', u1).get().catch(() => null),
        firestoreClient.collection('private_messages').where('receiverId', '==', u1).get().catch(() => null),
        firestoreClient
          .collection('private_conversations')
          .doc(pairKey)
          .collection('messages')
          .get()
          .catch(() => null),
      ]);
      sentSnap?.forEach((d: any) => addIfMatch(d.data(), d.id));
      recvSnap?.forEach((d: any) => addIfMatch(d.data(), d.id));
      subSnap?.forEach((d: any) => addIfMatch(d.data(), d.id));
    } catch (err: any) {
      console.warn('[Sami DB] Firestore private messages notice:', err.message);
    }
  } else {
    const [restSent, restRecv] = await Promise.all([
      queryRestPrivateMessagesByField('senderId', u1),
      queryRestPrivateMessagesByField('receiverId', u1),
    ]);
    for (const m of [...restSent, ...restRecv]) {
      addIfMatch(m, m.id);
    }
  }

  for (const m of diskStore.privateMessages[pairKey] || []) {
    addIfMatch(m, m?.id);
  }

  // Fallback / merge from Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    try {
      const sbPms = await supabaseGetPrivateMessages(u1, u2, limitCount);
      for (const m of sbPms) {
        addIfMatch(m, m.id);
      }
    } catch (err: any) {
      console.warn('[Sami DB] Supabase private messages notice:', err.message);
    }
  }

  let merged = Array.from(byId.values()).sort(
    (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)
  );
  if (beforeTimestamp && beforeTimestamp > 0) {
    merged = merged.filter((m) => m.timestamp < beforeTimestamp);
  }
  return limitCount > 0 ? merged.slice(-limitCount) : merged;
}

export async function getUserConversationsList(userId: number, userRole: string): Promise<{
  conversationId: string;
  partnerId: number;
  partnerName: string;
  partnerRole: string;
  partnerAvatarUrl?: string | null;
  lastMessageText?: string;
  lastMessageTimestamp: number;
  isGuest: boolean;
}[]> {
  const uid = Number(userId);

  // 0. Check in-memory conversations cache first (ZERO network reads!)
  const cachedConv = userConversationsCache.get(uid);
  if (cachedConv && Date.now() - cachedConv.cachedAt < USER_CONVERSATIONS_TTL_MS) {
    firestoreMetrics.recordRead('getUserConversationsList', 'private_conversations', 'cache_hit', cachedConv.conversations.length, true);
    return cachedConv.conversations;
  }
  const map = new Map<number, {
    conversationId: string;
    partnerId: number;
    partnerName: string;
    partnerRole: string;
    partnerAvatarUrl?: string | null;
    lastMessageText?: string;
    lastMessageTimestamp: number;
    isGuest: boolean;
  }>();

  // If moderator, ensure Sami (ID: 1) is always available as a primary conversation option
  if (userRole === 'moderator' && uid !== 1) {
    const samiUser = await getUserById(1);
    map.set(1, {
      conversationId: buildCanonicalConversationId(1, uid),
      partnerId: 1,
      partnerName: samiUser?.displayName || 'القائد Sami',
      partnerRole: 'owner',
      partnerAvatarUrl: samiUser?.avatarUrl || null,
      lastMessageText: 'محادثة خاصة ومباشرة مع القائد Sami',
      lastMessageTimestamp: samiUser?.createdAt || Date.now(),
      isGuest: false,
    });
  }

  const allUserMsgs = new Map<string, PrivateMessageRecord>();
  if (firestoreClient) {
    try {
      const [sentSnap, recvSnap] = await Promise.all([
        firestoreClient.collection('private_messages').where('senderId', '==', uid).get().catch(() => null),
        firestoreClient.collection('private_messages').where('receiverId', '==', uid).get().catch(() => null),
      ]);
      sentSnap?.forEach((d: any) => {
        const m = normalizeRawPrivateMessage(d.data(), d.id);
        if (m) allUserMsgs.set(m.id, m);
      });
      recvSnap?.forEach((d: any) => {
        const m = normalizeRawPrivateMessage(d.data(), d.id);
        if (m) allUserMsgs.set(m.id, m);
      });
    } catch {}
  } else {
    const [restSent, restRecv] = await Promise.all([
      queryRestPrivateMessagesByField('senderId', uid),
      queryRestPrivateMessagesByField('receiverId', uid),
    ]);
    for (const m of [...restSent, ...restRecv]) {
      allUserMsgs.set(m.id, m);
    }
  }

  for (const msgs of Object.values(diskStore.privateMessages)) {
    if (!Array.isArray(msgs)) continue;
    for (const raw of msgs) {
      const m = normalizeRawPrivateMessage(raw, raw?.id);
      if (m && (m.senderId === uid || m.receiverId === uid)) {
        allUserMsgs.set(m.id, m);
      }
    }
  }

  const groupedByPartner = new Map<number, PrivateMessageRecord[]>();
  for (const m of allUserMsgs.values()) {
    const partnerId = m.senderId === uid ? m.receiverId : m.senderId;
    if (!partnerId || partnerId === uid) continue;
    const arr = groupedByPartner.get(partnerId) || [];
    arr.push(m);
    groupedByPartner.set(partnerId, arr);
  }

  for (const [partnerId, msgs] of groupedByPartner.entries()) {
    msgs.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
    const lastMsg = msgs[msgs.length - 1];
    const isGuest = partnerId > 9000000;
    const partnerUser = await getUserById(partnerId);

    // If moderator: only list conversations with Sami or users, never other moderators
    if (userRole === 'moderator' && partnerUser?.role === 'moderator' && partnerId !== 1) {
      continue;
    }

    map.set(partnerId, {
      conversationId: buildCanonicalConversationId(uid, partnerId),
      partnerId,
      partnerName: partnerUser?.displayName || lastMsg.participantName || (isGuest ? `ضيف رقم ${partnerId - 9000000}` : `مستخدم #${partnerId}`),
      partnerRole: partnerId === 1 ? 'owner' : (partnerUser?.role || (isGuest ? 'guest' : 'user')),
      partnerAvatarUrl: partnerUser?.avatarUrl || null,
      lastMessageText: lastMsg?.isDeleted
        ? 'تم حذف هذه الرسالة.'
        : (lastMsg?.text || (lastMsg?.audioUrl ? '🎤 رسالة صوتية' : (lastMsg?.imageUrl ? '📷 صورة مرفقة' : (lastMsg?.fileName ? `📎 ملف: ${lastMsg.fileName}` : 'رسالة جديدة')))),
      lastMessageTimestamp: lastMsg?.timestamp || Date.now(),
      isGuest,
    });
  }

  const finalConversations = Array.from(map.values()).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
  userConversationsCache.set(uid, { conversations: finalConversations, cachedAt: Date.now() });
  return finalConversations;
}

export async function savePrivateMessageRecord(msg: PrivateMessageRecord): Promise<void> {
  const senderId = Number(msg.senderId);
  const receiverId = Number(msg.receiverId);
  const pairKey = buildCanonicalConversationId(senderId, receiverId);
  const participantIds = [Math.min(senderId, receiverId), Math.max(senderId, receiverId)];
  const participantId =
    msg.participantId && Number(msg.participantId) > 0
      ? Number(msg.participantId)
      : senderId === 1
        ? receiverId
        : receiverId === 1
          ? senderId
          : msg.senderRole === 'moderator'
            ? receiverId
            : senderId;

  const fullRecord: PrivateMessageRecord = {
    ...msg,
    senderId,
    receiverId,
    conversationId: pairKey,
    participantIds,
    participantId,
    timestamp: normalizeMessageTimestamp(msg.timestamp, msg.id),
  };

  let savedToCloud = false;
  if (firestoreClient) {
    try {
      await Promise.all([
        firestoreClient.collection('private_messages').doc(fullRecord.id).set(fullRecord, { merge: true }),
        firestoreClient
          .collection('private_conversations')
          .doc(pairKey)
          .collection('messages')
          .doc(fullRecord.id)
          .set(fullRecord, { merge: true }),
      ]);
      savedToCloud = true;
    } catch (err: any) {
      console.warn('[Sami DB] Firestore savePrivateMessage notice:', err.message);
    }
  }

  if (!savedToCloud && !isFirestoreRestBackoffActive()) {
    try {
      const dbSeg = encodeURIComponent(databaseId || '(default)');
      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${dbSeg}/documents/private_messages/${encodeURIComponent(fullRecord.id)}`;
      const restFields: Record<string, any> = {
        id: { stringValue: fullRecord.id },
        conversationId: { stringValue: pairKey },
        participantId: { integerValue: String(participantId) },
        participantIds: {
          arrayValue: { values: participantIds.map((id) => ({ integerValue: String(id) })) },
        },
        senderId: { integerValue: String(senderId) },
        receiverId: { integerValue: String(receiverId) },
        senderName: { stringValue: fullRecord.senderName || 'مستخدم' },
        senderRole: { stringValue: fullRecord.senderRole || 'user' },
        timestamp: { integerValue: String(fullRecord.timestamp) },
        isDeleted: { booleanValue: Boolean(fullRecord.isDeleted) },
      };
      if (fullRecord.senderAvatarUrl) restFields.senderAvatarUrl = { stringValue: fullRecord.senderAvatarUrl };
      if (fullRecord.participantName) restFields.participantName = { stringValue: fullRecord.participantName };
      if (fullRecord.text) restFields.text = { stringValue: fullRecord.text };
      if (fullRecord.imageUrl) restFields.imageUrl = { stringValue: fullRecord.imageUrl };
      if (fullRecord.storagePath) restFields.storagePath = { stringValue: fullRecord.storagePath };
      if (fullRecord.audioUrl) restFields.audioUrl = { stringValue: fullRecord.audioUrl };
      if (typeof fullRecord.audioDuration === 'number') restFields.audioDuration = { integerValue: String(Math.floor(fullRecord.audioDuration)) };
      if (fullRecord.fileUrl) restFields.fileUrl = { stringValue: fullRecord.fileUrl };
      if (fullRecord.fileName) restFields.fileName = { stringValue: fullRecord.fileName };
      if (typeof fullRecord.fileSize === 'number') restFields.fileSize = { integerValue: String(Math.floor(fullRecord.fileSize)) };
      if (fullRecord.fileType) restFields.fileType = { stringValue: fullRecord.fileType };

      const patchRes = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: restFields }),
      });
      if (patchRes.status === 429) {
        setFirestoreRestBackoff(FIRESTORE_BACKOFF_DURATION_MS);
      }
    } catch {}
  }

  if (!diskStore.privateMessages[pairKey]) {
    diskStore.privateMessages[pairKey] = [];
  }
  const existingIdx = diskStore.privateMessages[pairKey].findIndex((m: any) => m?.id === fullRecord.id);
  if (existingIdx >= 0) {
    diskStore.privateMessages[pairKey][existingIdx] = fullRecord;
  } else {
    diskStore.privateMessages[pairKey].push(fullRecord);
  }
  saveLocalDiskStore(diskStore);

  // Invalidate and update memory caches
  invalidatePrivateMessagesCache(senderId, receiverId);
  const existingPm = privateMessagesCache.get(pairKey);
  if (existingPm) {
    const pmIdx = existingPm.messages.findIndex(m => m.id === fullRecord.id);
    if (pmIdx >= 0) {
      existingPm.messages[pmIdx] = fullRecord;
    } else {
      existingPm.messages.push(fullRecord);
    }
  } else {
    privateMessagesCache.set(pairKey, { messages: [fullRecord], cachedAt: Date.now() });
  }

  // Dual-write to Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    supabaseInsertPrivateMessage(fullRecord).catch((e) =>
      console.warn('[Sami DB] Supabase insert private message note:', e?.message || e)
    );
  }
}

export async function saveFullChallengeAndTrades(userId: number, challenge: ChallengeRecord, trades: TradeRecord[]): Promise<void> {
  if (firestoreClient) {
    try {
      const batch = firestoreClient.batch();
      const chalRef = firestoreClient.collection('challenges').doc(`challenge_${userId}`);
      batch.set(chalRef, challenge);

      for (const t of trades) {
        const tradeRef = chalRef.collection('trades').doc(t.id);
        batch.set(tradeRef, t);
      }
      await batch.commit();
    } catch (err: any) {
      console.warn('[Sami DB] Firestore saveFullChallengeAndTrades notice:', err.message);
    }
  }

  diskStore.challenges[String(userId)] = challenge;
  diskStore.trades[String(userId)] = trades;
  saveLocalDiskStore(diskStore);

  // Dual-write to Supabase secondary replica if configured
  if (isSupabaseConfigured()) {
    supabaseUpsertUserChallenge(challenge).catch(() => {});
    for (const t of trades) {
      supabaseInsertTrade(t, challenge).catch(() => {});
    }
  }
}

// ============================================================================
// APP UPDATES & VERSION MANAGEMENT (SHARED DATABASE STORE)
// ============================================================================

export interface AppUpdateRecord {
  id: string; // 'latest' or 'v_<versionCode>'
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
  updatedAt: number;
  status?: 'draft' | 'published' | 'paused';
  isMandatory: boolean;
  minSupportedVersionCode?: number;
  publishedBy?: string;
  isActive: boolean;
  isHidden?: boolean;
}

const DEFAULT_APP_UPDATE: AppUpdateRecord = {
  id: 'latest',
  versionName: '1.3.1',
  versionCode: 15,
  description: 'إصدار Sami 1.3.1 مستقر ومحدّث.',
  applicationId: 'com.sami.tradingchallengetracker',
  storageSource: 'github_releases',
  githubOwner: 'alqadasif2-cloud',
  githubRepo: 'samii-21',
  downloadUrl: '',
  status: 'paused',
  isMandatory: false,
  minSupportedVersionCode: 15,
  publishedBy: 'Sami',
  updatedAt: 0,
  isActive: false,
  isHidden: true,
};

function normalizeAppUpdateRecord(data: any, fallbackId = 'latest'): AppUpdateRecord {
  const rawStatus = typeof data?.status === 'string' ? data.status : '';
  const isActive =
    rawStatus === 'published'
      ? data?.isActive !== false && data?.isHidden !== true
      : rawStatus === 'paused' || rawStatus === 'draft'
        ? false
        : data?.isActive === true && data?.isHidden !== true;

  const inferredSource: 'github_releases' | 'legacy' =
    data?.storageSource === 'github_releases' ||
    Boolean(data?.githubReleaseId) ||
    Boolean(data?.githubAssetId) ||
    (typeof data?.downloadUrl === 'string' && data.downloadUrl.includes('/releases/download/'))
      ? 'github_releases'
      : 'legacy';

  const status: 'draft' | 'published' | 'paused' =
    rawStatus === 'draft'
      ? 'draft'
      : isActive
        ? 'published'
        : 'paused';

  const rec: AppUpdateRecord = {
    id: String(data?.id || fallbackId),
    versionName: String(data?.versionName || DEFAULT_APP_UPDATE.versionName),
    versionCode: Number(data?.versionCode) || DEFAULT_APP_UPDATE.versionCode,
    description: typeof data?.description === 'string' ? data.description : '',
    downloadUrl: typeof data?.downloadUrl === 'string' ? data.downloadUrl : '',
    storageSource: inferredSource,
    status,
    isMandatory: Boolean(data?.isMandatory),
    publishedBy: String(data?.publishedBy || 'Sami'),
    updatedAt: Number(data?.updatedAt) || 0,
    isActive,
    isHidden: !isActive,
  };

  if (data?.fileSize !== undefined && data?.fileSize !== null && Number(data.fileSize) > 0) {
    rec.fileSize = Math.floor(Number(data.fileSize));
  }
  if (typeof data?.fileName === 'string' && data.fileName.trim()) {
    rec.fileName = data.fileName.trim();
  }
  if (typeof data?.applicationId === 'string' && data.applicationId.trim()) {
    rec.applicationId = data.applicationId.trim();
  }
  if (typeof data?.githubOwner === 'string' && data.githubOwner.trim()) {
    rec.githubOwner = data.githubOwner.trim();
  }
  if (typeof data?.githubRepo === 'string' && data.githubRepo.trim()) {
    rec.githubRepo = data.githubRepo.trim();
  }
  if (data?.githubReleaseId !== undefined && data?.githubReleaseId !== null && Number(data.githubReleaseId) > 0) {
    rec.githubReleaseId = Math.floor(Number(data.githubReleaseId));
  }
  if (typeof data?.releaseTag === 'string' && data.releaseTag.trim()) {
    rec.releaseTag = data.releaseTag.trim();
  }
  if (data?.githubAssetId !== undefined && data?.githubAssetId !== null && Number(data.githubAssetId) > 0) {
    rec.githubAssetId = Math.floor(Number(data.githubAssetId));
  }
  if (typeof data?.isRepoPrivate === 'boolean') {
    rec.isRepoPrivate = data.isRepoPrivate;
  }
  if (typeof data?.secureDownloadPath === 'string' && data.secureDownloadPath.trim()) {
    rec.secureDownloadPath = data.secureDownloadPath.trim();
  }
  if (typeof data?.sha256 === 'string' && data.sha256.trim()) {
    rec.sha256 = data.sha256.trim().toLowerCase();
  }
  if (typeof data?.signingCertSha256 === 'string' && data.signingCertSha256.trim()) {
    rec.signingCertSha256 = data.signingCertSha256.trim().toUpperCase();
  }
  if (data?.uploadedAt !== undefined && data?.uploadedAt !== null && Number(data.uploadedAt) > 0) {
    rec.uploadedAt = Math.floor(Number(data.uploadedAt));
  }
  if (data?.publishedAt !== undefined && data?.publishedAt !== null && Number(data.publishedAt) > 0) {
    rec.publishedAt = Math.floor(Number(data.publishedAt));
  }
  if (data?.minSupportedVersionCode !== undefined && data?.minSupportedVersionCode !== null) {
    rec.minSupportedVersionCode = Math.floor(Number(data.minSupportedVersionCode));
  }

  return rec;
}

function getFirestoreRestDocUrl(docId: string): string {
  const dbSegment = encodeURIComponent(databaseId || '(default)');
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${dbSegment}/documents/app_updates/${encodeURIComponent(docId)}`;
}

function getFirestoreRestCollectionUrl(): string {
  const dbSegment = encodeURIComponent(databaseId || '(default)');
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${dbSegment}/documents/app_updates?pageSize=40`;
}

function parseFirestoreRestFields(fields: Record<string, any> | undefined, docId = 'latest'): AppUpdateRecord | null {
  if (!fields || typeof fields !== 'object') return null;
  const readVal = (f: any): any => {
    if (!f || typeof f !== 'object') return undefined;
    if ('stringValue' in f) return f.stringValue;
    if ('booleanValue' in f) return Boolean(f.booleanValue);
    if ('integerValue' in f) return Number(f.integerValue);
    if ('doubleValue' in f) return Number(f.doubleValue);
    if ('nullValue' in f) return null;
    return undefined;
  };
  const raw: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    raw[k] = readVal(v);
  }
  return normalizeAppUpdateRecord(raw, docId);
}

function toFirestoreRestFields(record: AppUpdateRecord): Record<string, any> {
  const fields: Record<string, any> = {
    id: { stringValue: record.id || 'latest' },
    versionName: { stringValue: record.versionName },
    versionCode: { integerValue: String(Math.floor(Number(record.versionCode) || 15)) },
    downloadUrl: { stringValue: record.downloadUrl || '' },
    description: { stringValue: record.description || '' },
    storageSource: { stringValue: record.storageSource || 'github_releases' },
    status: { stringValue: record.status || (record.isActive ? 'published' : 'paused') },
    isMandatory: { booleanValue: Boolean(record.isMandatory) },
    publishedBy: { stringValue: record.publishedBy || 'Sami' },
    updatedAt: { integerValue: String(Math.floor(Number(record.updatedAt) || Date.now())) },
    isActive: { booleanValue: Boolean(record.isActive) },
    isHidden: { booleanValue: Boolean(!record.isActive) },
  };
  if (record.fileSize !== undefined) {
    fields.fileSize = { integerValue: String(Math.floor(Number(record.fileSize))) };
  }
  if (record.fileName) {
    fields.fileName = { stringValue: record.fileName };
  }
  if (record.applicationId) {
    fields.applicationId = { stringValue: record.applicationId };
  }
  if (record.githubOwner) {
    fields.githubOwner = { stringValue: record.githubOwner };
  }
  if (record.githubRepo) {
    fields.githubRepo = { stringValue: record.githubRepo };
  }
  if (record.githubReleaseId !== undefined) {
    fields.githubReleaseId = { integerValue: String(Math.floor(Number(record.githubReleaseId))) };
  }
  if (record.releaseTag) {
    fields.releaseTag = { stringValue: record.releaseTag };
  }
  if (record.githubAssetId !== undefined) {
    fields.githubAssetId = { integerValue: String(Math.floor(Number(record.githubAssetId))) };
  }
  if (typeof record.isRepoPrivate === 'boolean') {
    fields.isRepoPrivate = { booleanValue: record.isRepoPrivate };
  }
  if (record.secureDownloadPath) {
    fields.secureDownloadPath = { stringValue: record.secureDownloadPath };
  }
  if (record.sha256) {
    fields.sha256 = { stringValue: record.sha256 };
  }
  if (record.signingCertSha256) {
    fields.signingCertSha256 = { stringValue: record.signingCertSha256 };
  }
  if (record.uploadedAt !== undefined) {
    fields.uploadedAt = { integerValue: String(Math.floor(Number(record.uploadedAt))) };
  }
  if (record.publishedAt !== undefined) {
    fields.publishedAt = { integerValue: String(Math.floor(Number(record.publishedAt))) };
  }
  if (record.minSupportedVersionCode !== undefined) {
    fields.minSupportedVersionCode = { integerValue: String(Math.floor(Number(record.minSupportedVersionCode))) };
  }
  return fields;
}

let cachedAppUpdate: { record: AppUpdateRecord; cachedAt: number } | null = null;
const APP_UPDATE_CACHE_TTL_MS = 30_000; // 30s responsive cache (invalidated immediately on writes)

async function readSharedAppUpdateDoc(docId = 'latest'): Promise<AppUpdateRecord | null> {
  // Check memory cache first
  if (docId === 'latest' && cachedAppUpdate && Date.now() - cachedAppUpdate.cachedAt < APP_UPDATE_CACHE_TTL_MS) {
    return cachedAppUpdate.record;
  }

  if (firestoreClient) {
    try {
      const doc = await firestoreClient.collection('app_updates').doc(docId).get();
      if (doc.exists) {
        const rec = normalizeAppUpdateRecord(doc.data(), docId);
        if (docId === 'latest') {
          cachedAppUpdate = { record: rec, cachedAt: Date.now() };
        }
        return rec;
      }
    } catch (err: any) {
      console.log('[Sami DB] Admin Firestore read notice, falling back to local mirror:', err?.message);
    }
  }

  // If in rate-limit backoff, check Supabase replica first before local persistent store
  if (isFirestoreRestBackoffActive()) {
    if (docId === 'latest' && isSupabaseConfigured()) {
      try {
        const sbUpdate = await supabaseGetLatestAppUpdate();
        if (sbUpdate) {
          cachedAppUpdate = { record: sbUpdate, cachedAt: Date.now() };
          return sbUpdate;
        }
      } catch {}
    }
    if (docId === 'latest' && diskStore.appUpdates) {
      return normalizeAppUpdateRecord(diskStore.appUpdates, docId);
    }
    const histMatch = (diskStore.appUpdatesHistory || []).find(
      (h) => h.id === docId || `v_${h.versionCode}` === docId
    );
    if (histMatch) return normalizeAppUpdateRecord(histMatch, docId);
    return docId === 'latest' && cachedAppUpdate ? cachedAppUpdate.record : null;
  }

  try {
    const res = await fetch(getFirestoreRestDocUrl(docId), {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });

    if (res.status === 404) {
      return null;
    }

    if (res.status === 429) {
      setFirestoreRestBackoff(FIRESTORE_BACKOFF_DURATION_MS);
      if (docId === 'latest' && isSupabaseConfigured()) {
        try {
          const sbUpdate = await supabaseGetLatestAppUpdate();
          if (sbUpdate) {
            cachedAppUpdate = { record: sbUpdate, cachedAt: Date.now() };
            return sbUpdate;
          }
        } catch {}
      }
      if (docId === 'latest' && diskStore.appUpdates) {
        const localRec = normalizeAppUpdateRecord(diskStore.appUpdates, docId);
        cachedAppUpdate = { record: localRec, cachedAt: Date.now() };
        return localRec;
      }
      return docId === 'latest' && cachedAppUpdate ? cachedAppUpdate.record : null;
    }

    if (!res.ok) {
      if (docId === 'latest' && diskStore.appUpdates) {
        return normalizeAppUpdateRecord(diskStore.appUpdates, docId);
      }
      return null;
    }

    const json: any = await res.json();
    const parsed = parseFirestoreRestFields(json?.fields, docId);
    if (parsed && docId === 'latest') {
      cachedAppUpdate = { record: parsed, cachedAt: Date.now() };
    }
    return parsed;
  } catch {
    setFirestoreRestBackoff(30_000);
    if (docId === 'latest' && diskStore.appUpdates) {
      return normalizeAppUpdateRecord(diskStore.appUpdates, docId);
    }
    return null;
  }
}

async function writeAndVerifySharedAppUpdateDoc(docId: string, record: AppUpdateRecord): Promise<AppUpdateRecord> {
  const normalized = normalizeAppUpdateRecord(record, docId);
  const cleanForAdmin = JSON.parse(JSON.stringify(normalized));

  // Always commit locally first so local state and visibility toggles are instantly persistent
  if (docId === 'latest') {
    diskStore.appUpdates = { ...normalized };
    saveLocalDiskStore(diskStore);
    cachedAppUpdate = { record: normalized, cachedAt: Date.now() };
  }

  let wroteViaAdmin = false;
  if (firestoreClient) {
    try {
      await firestoreClient.collection('app_updates').doc(docId).set(cleanForAdmin, { merge: true });
      wroteViaAdmin = true;
    } catch (err: any) {
      console.log('[Sami DB] Admin Firestore write notice, using REST/local store:', err?.message);
    }
  }

  if (!wroteViaAdmin && !isFirestoreRestBackoffActive()) {
    try {
      const res = await fetch(getFirestoreRestDocUrl(docId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ fields: toFirestoreRestFields(normalized) }),
      });
      if (res.status === 429) {
        setFirestoreRestBackoff(FIRESTORE_BACKOFF_DURATION_MS);
      }
    } catch {}
  }

  // Dual-write to Supabase secondary replica if configured
  if (docId === 'latest' && isSupabaseConfigured()) {
    supabaseUpsertAppUpdate(normalized).catch((e) =>
      console.warn('[Sami DB] Supabase app update save note:', e?.message || e)
    );
  }

  // Invalidate cache before Read-After-Write verification
  if (docId === 'latest') {
    cachedAppUpdate = null;
  }
  const verified = await readSharedAppUpdateDoc(docId);
  if (docId === 'latest') {
    cachedAppUpdate = { record: verified || normalized, cachedAt: Date.now() };
  }
  return verified || normalized;
}

export async function getLatestAppUpdate(): Promise<AppUpdateRecord> {
  try {
    const cloudRecord = await readSharedAppUpdateDoc('latest');
    if (cloudRecord) {
      if (
        !diskStore.appUpdates ||
        diskStore.appUpdates.isActive !== cloudRecord.isActive ||
        diskStore.appUpdates.versionCode !== cloudRecord.versionCode ||
        diskStore.appUpdates.updatedAt !== cloudRecord.updatedAt ||
        diskStore.appUpdates.sha256 !== cloudRecord.sha256
      ) {
        diskStore.appUpdates = { ...cloudRecord };
        saveLocalDiskStore(diskStore);
      }
      return cloudRecord;
    }
  } catch {}

  if (diskStore.appUpdates) {
    return normalizeAppUpdateRecord(diskStore.appUpdates, 'latest');
  }

  return { ...DEFAULT_APP_UPDATE };
}

export async function getAppUpdateByVersionOrId(target: string | number): Promise<AppUpdateRecord | null> {
  const raw = String(target || '').trim();
  if (!raw || raw === 'latest') {
    return getLatestAppUpdate();
  }

  const docId = /^\d+$/.test(raw) ? `v_${raw}` : raw;
  const direct = await readSharedAppUpdateDoc(docId);
  if (direct) return direct;

  const latest = await getLatestAppUpdate();
  if (
    latest.id === docId ||
    `v_${latest.versionCode}` === docId ||
    String(latest.versionCode) === raw
  ) {
    return latest;
  }

  const localMatch = (diskStore.appUpdatesHistory || []).find(
    (h) => h.id === docId || `v_${h.versionCode}` === docId || String(h.versionCode) === raw
  );
  return localMatch ? normalizeAppUpdateRecord(localMatch, docId) : null;
}

export async function getAppUpdatesHistory(): Promise<AppUpdateRecord[]> {
  const current = await getLatestAppUpdate();
  const byVersion = new Map<number, AppUpdateRecord>();

  // 1. Seed from local persistent history
  for (const h of diskStore.appUpdatesHistory || []) {
    const norm = normalizeAppUpdateRecord(h, h.id || `v_${h.versionCode}`);
    if (norm.versionCode > 0) {
      byVersion.set(norm.versionCode, norm);
    }
  }

  // 2. Merge archived version documents from shared Firestore `app_updates` collection
  if (firestoreClient) {
    try {
      const snap = await firestoreClient.collection('app_updates').get();
      snap.forEach((doc: any) => {
        if (doc.id === 'latest') return;
        const norm = normalizeAppUpdateRecord(doc.data(), doc.id);
        if (norm.versionCode > 0) {
          byVersion.set(norm.versionCode, norm);
        }
      });
    } catch {}
  } else if (!isFirestoreRestBackoffActive()) {
    try {
      const res = await fetch(getFirestoreRestCollectionUrl(), {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.status === 429) {
        setFirestoreRestBackoff(FIRESTORE_BACKOFF_DURATION_MS);
      } else if (res.ok) {
        const json: any = await res.json();
        const docs: any[] = Array.isArray(json?.documents) ? json.documents : [];
        for (const d of docs) {
          const nameParts = String(d?.name || '').split('/');
          const docId = nameParts[nameParts.length - 1] || '';
          if (!docId || docId === 'latest') continue;
          const parsed = parseFirestoreRestFields(d.fields, docId);
          if (parsed && parsed.versionCode > 0) {
            byVersion.set(parsed.versionCode, parsed);
          }
        }
      }
    } catch {}
  }

  // 3. Synchronize active status with `latest`
  if (current && current.versionCode > 0) {
    const existing = byVersion.get(current.versionCode);
    const mergedCurrent: AppUpdateRecord = {
      ...(existing || {}),
      ...current,
      id: `v_${current.versionCode}`,
      isActive: current.isActive,
      isHidden: !current.isActive,
      status: current.isActive ? 'published' : 'paused',
    };
    byVersion.set(current.versionCode, mergedCurrent);
  }

  // Mark any non-latest release as not active in the active pointer sense
  const result = Array.from(byVersion.values())
    .map((item) => {
      if (item.versionCode !== current.versionCode && item.isActive) {
        return {
          ...item,
          isActive: false,
          isHidden: true,
          status: 'paused' as const,
        };
      }
      return item;
    })
    .sort((a, b) => b.versionCode - a.versionCode);

  diskStore.appUpdatesHistory = result;
  saveLocalDiskStore(diskStore);
  return result;
}

export async function toggleAppUpdateVisibility(
  targetIdOrVersion: string | number | undefined,
  isActive: boolean
): Promise<AppUpdateRecord> {
  const desiredActive = Boolean(isActive);
  const current = await getLatestAppUpdate();
  const nextStatus: 'published' | 'paused' = desiredActive ? 'published' : 'paused';
  const nextRecord: AppUpdateRecord = {
    ...current,
    id: 'latest',
    status: nextStatus,
    isActive: desiredActive,
    isHidden: !desiredActive,
    updatedAt: Date.now(),
  };

  // Persist and verify in authoritative shared Firestore database first
  const verified = await writeAndVerifySharedAppUpdateDoc('latest', nextRecord);

  // Best-effort sync of archived version document without deleting any history
  try {
    await writeAndVerifySharedAppUpdateDoc(`v_${verified.versionCode}`, {
      ...verified,
      id: `v_${verified.versionCode}`,
    });
  } catch {}

  diskStore.appUpdates = { ...verified };
  if (!diskStore.appUpdatesHistory) {
    diskStore.appUpdatesHistory = [{ ...verified, id: `v_${verified.versionCode}` }];
  } else {
    let matched = false;
    for (const item of diskStore.appUpdatesHistory) {
      if (
        !targetIdOrVersion ||
        targetIdOrVersion === 'latest' ||
        item.id === String(targetIdOrVersion) ||
        item.versionCode === Number(targetIdOrVersion) ||
        item.versionCode === verified.versionCode
      ) {
        item.status = verified.status;
        item.isActive = verified.isActive;
        item.isHidden = verified.isHidden;
        item.updatedAt = verified.updatedAt;
        matched = true;
      }
    }
    if (!matched) {
      diskStore.appUpdatesHistory.unshift({ ...verified, id: `v_${verified.versionCode}` });
    }
  }
  saveLocalDiskStore(diskStore);
  console.log('[Sami DB] Verified app update visibility toggle:', verified.versionName, 'isActive =', verified.isActive);
  return verified;
}

export async function rollbackAppUpdateToVersion(
  targetVersionCode: number,
  actorName = 'Sami'
): Promise<AppUpdateRecord> {
  const code = Math.floor(Number(targetVersionCode));
  if (!code || code <= 0) {
    throw new Error('رقم الإصدار المطلوب للرجوع إليه غير صالح');
  }

  const targetRecord = await getAppUpdateByVersionOrId(`v_${code}`);
  if (!targetRecord) {
    throw new Error(`لم يتم العثور على سجل الإصدار (versionCode: ${code}) في قاعدة البيانات`);
  }

  const current = await getLatestAppUpdate();
  const now = Date.now();

  // Pause the superseded release in history without deleting it
  if (current && current.versionCode > 0 && current.versionCode !== code) {
    try {
      await writeAndVerifySharedAppUpdateDoc(`v_${current.versionCode}`, {
        ...current,
        id: `v_${current.versionCode}`,
        status: 'paused',
        isActive: false,
        isHidden: true,
        updatedAt: now,
      });
    } catch {}
  }

  const promotedLatest: AppUpdateRecord = {
    ...targetRecord,
    id: 'latest',
    status: 'published',
    isActive: true,
    isHidden: false,
    publishedBy: actorName || targetRecord.publishedBy || 'Sami',
    publishedAt: now,
    updatedAt: now,
  };

  const verified = await writeAndVerifySharedAppUpdateDoc('latest', promotedLatest);

  try {
    await writeAndVerifySharedAppUpdateDoc(`v_${code}`, {
      ...verified,
      id: `v_${code}`,
    });
  } catch {}

  await getAppUpdatesHistory();
  console.log('[Sami DB] Rolled back active app update to version:', verified.versionName, `(v${verified.versionCode})`);
  return verified;
}

export async function saveAppUpdateRecord(update: {
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  description: string;
  isMandatory: boolean;
  minSupportedVersionCode?: number;
  publishedBy?: string;
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
  secureDownloadPath?: string;
  sha256?: string;
  signingCertSha256?: string;
  uploadedAt?: number;
  publishedAt?: number;
  status?: 'draft' | 'published' | 'paused';
}): Promise<AppUpdateRecord> {
  const now = Date.now();
  const previous = await getLatestAppUpdate();

  // Preserve previous active release in history as paused before promoting new release
  if (previous && previous.versionCode > 0 && previous.versionCode !== Number(update.versionCode)) {
    try {
      await writeAndVerifySharedAppUpdateDoc(`v_${previous.versionCode}`, {
        ...previous,
        id: `v_${previous.versionCode}`,
        status: 'paused',
        isActive: false,
        isHidden: true,
        updatedAt: now,
      });
    } catch {}
  }

  const record: AppUpdateRecord = {
    id: 'latest',
    versionName: update.versionName.trim(),
    versionCode: Math.floor(Number(update.versionCode) || 15),
    downloadUrl: update.downloadUrl.trim(),
    description: update.description ? update.description.trim() : '',
    fileSize: update.fileSize ? Math.floor(Number(update.fileSize)) : undefined,
    fileName: update.fileName?.trim(),
    applicationId: update.applicationId?.trim() || 'com.sami.tradingchallengetracker',
    storageSource: update.storageSource || 'github_releases',
    githubOwner: update.githubOwner?.trim(),
    githubRepo: update.githubRepo?.trim(),
    githubReleaseId: update.githubReleaseId ? Math.floor(Number(update.githubReleaseId)) : undefined,
    releaseTag: update.releaseTag?.trim(),
    githubAssetId: update.githubAssetId ? Math.floor(Number(update.githubAssetId)) : undefined,
    isRepoPrivate: typeof update.isRepoPrivate === 'boolean' ? update.isRepoPrivate : undefined,
    secureDownloadPath: update.secureDownloadPath?.trim(),
    sha256: update.sha256?.trim().toLowerCase(),
    signingCertSha256: update.signingCertSha256?.trim().toUpperCase(),
    uploadedAt: update.uploadedAt || now,
    publishedAt: update.publishedAt || now,
    status: update.status || 'published',
    isMandatory: Boolean(update.isMandatory),
    minSupportedVersionCode: update.minSupportedVersionCode
      ? Math.floor(Number(update.minSupportedVersionCode))
      : undefined,
    publishedBy: update.publishedBy || 'Sami',
    updatedAt: now,
    isActive: (update.status || 'published') === 'published',
    isHidden: (update.status || 'published') !== 'published',
  };

  // Persist and verify in authoritative shared Firestore database first
  const verified = await writeAndVerifySharedAppUpdateDoc('latest', record);

  // Archive into history collection by versionCode without overwriting older releases
  try {
    await writeAndVerifySharedAppUpdateDoc(`v_${verified.versionCode}`, {
      ...verified,
      id: `v_${verified.versionCode}`,
    });
  } catch {}

  diskStore.appUpdates = { ...verified };
  if (!diskStore.appUpdatesHistory) {
    diskStore.appUpdatesHistory = [];
  }
  const existingIdx = diskStore.appUpdatesHistory.findIndex((h) => h.versionCode === verified.versionCode);
  const archivedEntry: AppUpdateRecord = { ...verified, id: `v_${verified.versionCode}` };
  if (existingIdx >= 0) {
    diskStore.appUpdatesHistory[existingIdx] = archivedEntry;
  } else {
    diskStore.appUpdatesHistory.unshift(archivedEntry);
  }
  for (const item of diskStore.appUpdatesHistory) {
    if (item.versionCode !== verified.versionCode) {
      item.isActive = false;
      item.isHidden = true;
      item.status = 'paused';
    }
  }

  saveLocalDiskStore(diskStore);
  console.log('[Sami DB] Verified saved app update in shared store:', verified.versionName, `(v${verified.versionCode})`);
  return verified;
}

/**
 * Triggers safe one-way sync of all existing records (snapshot of users, channels,
 * messages, private messages, challenges, trades, updates) into Supabase PostgreSQL.
 * Does not delete, alter, or disconnect any Firestore documents.
 */
export async function triggerFullDataSyncToSupabase() {
  return syncAllToSupabase({
    users: diskStore.users,
    channels: diskStore.channels,
    channelMessages: diskStore.channelMessages,
    privateMessages: diskStore.privateMessages,
    challenges: diskStore.challenges,
    trades: diskStore.trades,
    appUpdates: diskStore.appUpdates,
  });
}

/**
 * Generates an audit reconciliation report comparing record counts in the
 * system snapshot vs the secondary Supabase replica.
 * Completely non-destructive (zero writes/deletions).
 */
export async function getDatabaseReconciliationReport() {
  const sourceCounts = {
    users: Object.keys(diskStore.users || {}).length,
    channels: Object.keys(diskStore.channels || {}).length,
    messages: Object.values(diskStore.channelMessages || {}).reduce((acc, msgs) => acc + (msgs?.length || 0), 0),
    privateMessages: Object.values(diskStore.privateMessages || {}).reduce((acc, msgs) => acc + (msgs?.length || 0), 0),
    challenges: Object.keys(diskStore.challenges || {}).length,
    trades: Object.values(diskStore.trades || {}).reduce((acc, trs) => acc + (trs?.length || 0), 0),
    appUpdates: diskStore.appUpdates ? 1 : 0,
  };

  return reconcileSupabaseData(sourceCounts);
}





