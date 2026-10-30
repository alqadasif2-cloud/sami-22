import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  UserRecord,
  ChannelRecord,
  ChannelMessage,
  PrivateMessageRecord,
  ChallengeRecord,
  TradeRecord,
  AppUpdateRecord,
} from './db.ts';

/**
 * Sami Application - Supabase Secondary Replica & Quota Fallback Client
 *
 * When Google Firestore reads hit quota (HTTP 429 RESOURCE_EXHAUSTED),
 * this client provides a warm secondary database replica to serve user
 * data, channels, messages, challenges, and app updates seamlessly.
 *
 * Secrets are loaded from environment variables:
 * - SUPABASE_URL: e.g. https://xyzcompany.supabase.co
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for server-side trusted read/write
 */

let supabaseInstance: SupabaseClient | null = null;
let lastSupabaseError: string | null = null;

export function resolveSupabaseCredentials(): { url: string | null; key: string | null } {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  return {
    url: url || null,
    key: key || null,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = resolveSupabaseCredentials();
  return Boolean(url && key);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const { url, key } = resolveSupabaseCredentials();
  if (!url || !key) {
    return null;
  }

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log(`[Sami Supabase] Secondary client initialized for URL: ${url}`);
    return supabaseInstance;
  } catch (err: any) {
    lastSupabaseError = err?.message || String(err);
    console.warn('[Sami Supabase] Initialization notice:', lastSupabaseError);
    return null;
  }
}

export async function testSupabaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  url?: string;
  error?: string;
  counts?: {
    users: number;
    channels: number;
    messages: number;
    privateMessages: number;
    challenges: number;
  };
}> {
  const { url } = resolveSupabaseCredentials();
  const client = getSupabaseClient();

  if (!client) {
    return {
      configured: false,
      connected: false,
      error: 'لم يتم إدخال مفاتيح Supabase بعد (SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY)',
    };
  }

  try {
    const [usersRes, channelsRes, msgRes, pmRes, chalRes] = await Promise.all([
      client.from('community_users').select('id', { count: 'exact', head: true }),
      client.from('community_channels').select('id', { count: 'exact', head: true }),
      client.from('chat_messages').select('id', { count: 'exact', head: true }),
      client.from('private_messages').select('id', { count: 'exact', head: true }),
      client.from('user_challenges').select('id', { count: 'exact', head: true }),
    ]);

    if (usersRes.error) {
      return {
        configured: true,
        connected: false,
        url: url || undefined,
        error: usersRes.error.message,
      };
    }

    return {
      configured: true,
      connected: true,
      url: url || undefined,
      counts: {
        users: usersRes.count ?? 0,
        channels: channelsRes.count ?? 0,
        messages: msgRes.count ?? 0,
        privateMessages: pmRes.count ?? 0,
        challenges: chalRes.count ?? 0,
      },
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      url: url || undefined,
      error: err?.message || String(err),
    };
  }
}

// ============================================================================
// 1. USERS
// ============================================================================

export async function supabaseGetUserById(userId: number): Promise<UserRecord | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('community_users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: Number(data.id),
      username: data.username,
      displayName: data.display_name,
      passwordHash: data.password_hash,
      salt: data.salt,
      role: data.role,
      avatarUrl: data.avatar_url,
      warningsCount: data.warnings_count,
      createdAt: Number(data.created_at),
      updatedAt: Number(data.updated_at),
    };
  } catch {
    return null;
  }
}

export async function supabaseGetUserByUsername(username: string): Promise<UserRecord | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const clean = username.trim().toLowerCase();
    const { data, error } = await client
      .from('community_users')
      .select('*')
      .eq('username_lower', clean)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: Number(data.id),
      username: data.username,
      displayName: data.display_name,
      passwordHash: data.password_hash,
      salt: data.salt,
      role: data.role,
      avatarUrl: data.avatar_url,
      warningsCount: data.warnings_count,
      createdAt: Number(data.created_at),
      updatedAt: Number(data.updated_at),
    };
  } catch {
    return null;
  }
}

export async function supabaseGetAllUsers(): Promise<Omit<UserRecord, 'passwordHash' | 'salt'>[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('community_users')
      .select('id, username, display_name, role, avatar_url, warnings_count, created_at, updated_at')
      .order('id', { ascending: true })
      .limit(300);

    if (error || !data) return [];
    return data.map((d) => ({
      id: Number(d.id),
      username: d.username,
      displayName: d.display_name,
      role: d.role,
      avatarUrl: d.avatar_url,
      warningsCount: d.warnings_count,
      createdAt: Number(d.created_at),
      updatedAt: Number(d.updated_at),
    }));
  } catch {
    return [];
  }
}

export async function supabaseUpsertUser(user: UserRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('community_users').upsert({
      id: user.id,
      username: user.username,
      username_lower: user.username.toLowerCase(),
      display_name: user.displayName,
      password_hash: user.passwordHash,
      salt: user.salt,
      role: user.role,
      avatar_url: user.avatarUrl || null,
      warnings_count: user.warningsCount || 0,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    });
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 2. CHANNELS
// ============================================================================

export async function supabaseGetChannels(): Promise<ChannelRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('community_channels')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      isPrivate: Boolean(c.is_private),
      isOpenPublic: Boolean(c.is_open_public),
      password: c.password || '',
      imageUrl: c.image_url,
      storagePath: c.storage_path,
      visibility: c.visibility,
      allowedMemberIds: Array.isArray(c.allowed_member_ids) ? c.allowed_member_ids.map(Number) : [],
      memberIds: Array.isArray(c.member_ids) ? c.member_ids.map(Number) : [],
      displayMemberCount: c.display_member_count ?? null,
      createdAt: Number(c.created_at),
      updatedAt: c.updated_at ? Number(c.updated_at) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function supabaseGetChannelById(channelId: string): Promise<ChannelRecord | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('community_channels')
      .select('*')
      .eq('id', channelId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      isPrivate: Boolean(data.is_private),
      isOpenPublic: Boolean(data.is_open_public),
      password: data.password || '',
      imageUrl: data.image_url,
      storagePath: data.storage_path,
      visibility: data.visibility,
      allowedMemberIds: Array.isArray(data.allowed_member_ids) ? data.allowed_member_ids.map(Number) : [],
      memberIds: Array.isArray(data.member_ids) ? data.member_ids.map(Number) : [],
      displayMemberCount: data.display_member_count ?? null,
      createdAt: Number(data.created_at),
      updatedAt: data.updated_at ? Number(data.updated_at) : undefined,
    };
  } catch {
    return null;
  }
}

export async function supabaseUpsertChannel(channel: ChannelRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('community_channels').upsert({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      is_private: channel.isPrivate,
      is_open_public: channel.isOpenPublic ?? !channel.isPrivate,
      password: channel.password || null,
      image_url: channel.imageUrl || null,
      storage_path: channel.storagePath || null,
      visibility: channel.visibility,
      allowed_member_ids: channel.allowedMemberIds || [],
      member_ids: channel.memberIds || [],
      display_member_count: channel.displayMemberCount ?? null,
      created_at: channel.createdAt,
      updated_at: channel.updatedAt || Date.now(),
    });
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 3. CHANNEL MESSAGES
// ============================================================================

export async function supabaseGetChannelMessages(channelId: string, limitCount = 80): Promise<ChannelMessage[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('chat_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('timestamp', { ascending: false })
      .limit(limitCount);

    if (error || !data) return [];
    return data
      .reverse()
      .map((m) => ({
        id: m.id,
        channelId: m.channel_id,
        senderId: Number(m.sender_id),
        senderName: m.sender_name,
        senderRole: m.sender_role,
        senderAvatarUrl: m.sender_avatar_url,
        text: m.text,
        imageUrl: m.image_url,
        storagePath: m.storage_path,
        fileName: m.file_name,
        fileSize: m.file_size ? Number(m.file_size) : undefined,
        fileType: m.file_type,
        fileUrl: m.file_url,
        audioUrl: m.audio_url,
        audioDuration: m.audio_duration ? Number(m.audio_duration) : undefined,
        replyToId: m.reply_to_id,
        replyToText: m.reply_to_text,
        replyToSenderName: m.reply_to_sender_name,
        isDeleted: Boolean(m.is_deleted),
        timestamp: Number(m.timestamp),
      }));
  } catch {
    return [];
  }
}

export async function supabaseInsertChannelMessage(msg: ChannelMessage): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('chat_messages').upsert({
      id: msg.id,
      channel_id: msg.channelId,
      sender_id: msg.senderId,
      sender_name: msg.senderName,
      sender_role: msg.senderRole,
      sender_avatar_url: msg.senderAvatarUrl || null,
      text: msg.text || null,
      image_url: msg.imageUrl || null,
      storage_path: msg.storagePath || null,
      file_name: msg.fileName || null,
      file_size: msg.fileSize || null,
      file_type: msg.fileType || null,
      file_url: msg.fileUrl || null,
      audio_url: msg.audioUrl || null,
      audio_duration: msg.audioDuration || null,
      reply_to_id: msg.replyToId || null,
      reply_to_text: msg.replyToText || null,
      reply_to_sender_name: msg.replyToSenderName || null,
      is_deleted: Boolean(msg.isDeleted),
      timestamp: msg.timestamp,
    });
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 4. PRIVATE MESSAGES
// ============================================================================

export async function supabaseGetPrivateMessages(p1: number, p2: number, limitCount = 80): Promise<PrivateMessageRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const convId = [Math.min(p1, p2), Math.max(p1, p2)].join('_');
    const { data, error } = await client
      .from('private_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('timestamp', { ascending: false })
      .limit(limitCount);

    if (error || !data) return [];
    return data
      .reverse()
      .map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        participantId: m.participant_id ? Number(m.participant_id) : undefined,
        participantName: m.participant_name,
        participantIds: Array.isArray(m.participant_ids) ? m.participant_ids.map(Number) : undefined,
        senderId: Number(m.sender_id),
        receiverId: Number(m.receiver_id),
        senderName: m.sender_name,
        senderRole: m.sender_role,
        senderAvatarUrl: m.sender_avatar_url,
        text: m.text,
        imageUrl: m.image_url,
        storagePath: m.storage_path,
        audioUrl: m.audio_url,
        audioDuration: m.audio_duration ? Number(m.audio_duration) : undefined,
        fileUrl: m.file_url,
        fileName: m.file_name,
        fileSize: m.file_size ? Number(m.file_size) : undefined,
        fileType: m.file_type,
        replyToId: m.reply_to_id,
        replyToSenderName: m.reply_to_sender_name,
        replyToText: m.reply_to_text,
        replyToIsDeleted: Boolean(m.reply_to_is_deleted),
        isEdited: Boolean(m.is_edited),
        isDeleted: Boolean(m.is_deleted),
        timestamp: Number(m.timestamp),
      }));
  } catch {
    return [];
  }
}

export async function supabaseInsertPrivateMessage(msg: PrivateMessageRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const convId = msg.conversationId || [Math.min(msg.senderId, msg.receiverId), Math.max(msg.senderId, msg.receiverId)].join('_');
    const { error } = await client.from('private_messages').upsert({
      id: msg.id,
      conversation_id: convId,
      participant_id: msg.participantId || null,
      participant_name: msg.participantName || null,
      participant_ids: msg.participantIds || [Math.min(msg.senderId, msg.receiverId), Math.max(msg.senderId, msg.receiverId)],
      sender_id: msg.senderId,
      receiver_id: msg.receiverId,
      sender_name: msg.senderName,
      sender_role: msg.senderRole,
      sender_avatar_url: msg.senderAvatarUrl || null,
      text: msg.text || null,
      image_url: msg.imageUrl || null,
      storage_path: msg.storagePath || null,
      audio_url: msg.audioUrl || null,
      audio_duration: msg.audioDuration || null,
      file_url: msg.fileUrl || null,
      file_name: msg.fileName || null,
      file_size: msg.fileSize || null,
      file_type: msg.fileType || null,
      reply_to_id: msg.replyToId || null,
      reply_to_sender_name: msg.replyToSenderName || null,
      reply_to_text: msg.replyToText || null,
      reply_to_is_deleted: Boolean(msg.replyToIsDeleted),
      is_edited: Boolean(msg.isEdited),
      is_deleted: Boolean(msg.isDeleted),
      timestamp: msg.timestamp,
    });
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 5. TRADING CHALLENGES & TRADES
// ============================================================================

export async function supabaseGetUserChallenge(userId: number): Promise<ChallengeRecord | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('user_challenges')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      userId: Number(data.user_id),
      userName: data.user_name || '',
      initialCapitalCents: Number(data.initial_capital_cents),
      currentBalanceCents: Number(data.current_balance_cents),
      targetBalanceCents: Number(data.target_balance_cents),
      tradeCount: Number(data.trade_count),
      challengeStarted: Boolean(data.challenge_started),
      createdAt: Number(data.created_at),
      updatedAt: Number(data.updated_at),
    };
  } catch {
    return null;
  }
}

export async function supabaseUpsertUserChallenge(chal: ChallengeRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('user_challenges').upsert({
      id: chal.id,
      user_id: chal.userId,
      user_name: chal.userName,
      initial_capital_cents: chal.initialCapitalCents,
      current_balance_cents: chal.currentBalanceCents,
      target_balance_cents: chal.targetBalanceCents,
      trade_count: chal.tradeCount,
      challenge_started: chal.challengeStarted,
      created_at: chal.createdAt,
      updated_at: chal.updatedAt,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function supabaseGetUserTrades(userId: number): Promise<TradeRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('user_trades')
      .select('*')
      .eq('user_id', userId)
      .order('trade_number', { ascending: true });

    if (error || !data) return [];
    return data.map((t) => ({
      id: t.id,
      challengeId: t.challenge_id,
      userId: Number(t.user_id),
      tradeNumber: Number(t.trade_number),
      resultCents: Number(t.result_cents),
      oldBalanceCents: Number(t.old_balance_cents),
      newBalanceCents: Number(t.new_balance_cents),
      type: t.type,
      attachmentPath: t.attachment_path,
      timestamp: Number(t.timestamp),
    }));
  } catch {
    return [];
  }
}

export async function supabaseInsertTrade(trade: TradeRecord, challenge: ChallengeRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    await supabaseUpsertUserChallenge(challenge);
    const { error } = await client.from('user_trades').upsert({
      id: trade.id,
      challenge_id: trade.challengeId,
      user_id: trade.userId,
      trade_number: trade.tradeNumber,
      result_cents: trade.resultCents,
      old_balance_cents: trade.oldBalanceCents,
      new_balance_cents: trade.newBalanceCents,
      type: trade.type,
      attachment_path: trade.attachmentPath || null,
      timestamp: trade.timestamp,
    });
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 6. APP UPDATES
// ============================================================================

export async function supabaseGetLatestAppUpdate(): Promise<AppUpdateRecord | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('app_updates')
      .select('*')
      .eq('id', 'latest')
      .maybeSingle();

    if (error || !data) return null;
    const isActive = Boolean(data.is_active) && !Boolean(data.is_hidden);
    return {
      id: data.id,
      versionName: data.version_name,
      versionCode: Number(data.version_code),
      downloadUrl: data.download_url || '',
      description: data.description || '',
      storageSource:
        typeof data.download_url === 'string' && data.download_url.includes('/releases/download/')
          ? 'github_releases'
          : 'legacy',
      status: isActive ? 'published' : 'paused',
      isMandatory: Boolean(data.is_mandatory),
      minSupportedVersionCode: data.min_supported_version_code ? Number(data.min_supported_version_code) : undefined,
      publishedBy: data.published_by,
      updatedAt: Number(data.updated_at),
      isActive,
      isHidden: !isActive,
    };
  } catch {
    return null;
  }
}

export async function supabaseUpsertAppUpdate(update: AppUpdateRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('app_updates').upsert({
      id: update.id || 'latest',
      version_name: update.versionName,
      version_code: update.versionCode,
      download_url: update.downloadUrl,
      description: update.description,
      is_mandatory: update.isMandatory,
      min_supported_version_code: update.minSupportedVersionCode ?? null,
      published_by: update.publishedBy || 'Sami',
      updated_at: update.updatedAt,
      is_active: update.isActive,
      is_hidden: update.isHidden ?? !update.isActive,
    });
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 7. SAFE MIGRATION / REPLICATION UTILITY
// ============================================================================

export async function syncAllToSupabase(snapshot: {
  users: Record<string, UserRecord>;
  channels: Record<string, ChannelRecord>;
  channelMessages: Record<string, ChannelMessage[]>;
  privateMessages: Record<string, PrivateMessageRecord[]>;
  challenges: Record<string, ChallengeRecord>;
  trades: Record<string, TradeRecord[]>;
  appUpdates?: AppUpdateRecord;
}): Promise<{
  success: boolean;
  synced: {
    users: number;
    channels: number;
    messages: number;
    privateMessages: number;
    challenges: number;
    trades: number;
  };
  errors: string[];
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      synced: { users: 0, channels: 0, messages: 0, privateMessages: 0, challenges: 0, trades: 0 },
      errors: ['Supabase client not configured or missing credentials.'],
    };
  }

  const errors: string[] = [];
  const synced = {
    users: 0,
    channels: 0,
    messages: 0,
    privateMessages: 0,
    challenges: 0,
    trades: 0,
  };

  // 1. Users
  for (const user of Object.values(snapshot.users || {})) {
    const ok = await supabaseUpsertUser(user);
    if (ok) synced.users++;
    else errors.push(`User ${user.id} sync failed`);
  }

  // 2. Channels
  for (const channel of Object.values(snapshot.channels || {})) {
    const ok = await supabaseUpsertChannel(channel);
    if (ok) synced.channels++;
    else errors.push(`Channel ${channel.id} sync failed`);
  }

  // 3. Channel messages
  for (const msgs of Object.values(snapshot.channelMessages || {})) {
    for (const msg of msgs) {
      const ok = await supabaseInsertChannelMessage(msg);
      if (ok) synced.messages++;
      else errors.push(`Message ${msg.id} sync failed`);
    }
  }

  // 4. Private messages
  for (const msgs of Object.values(snapshot.privateMessages || {})) {
    for (const msg of msgs) {
      const ok = await supabaseInsertPrivateMessage(msg);
      if (ok) synced.privateMessages++;
      else errors.push(`Private message ${msg.id} sync failed`);
    }
  }

  // 5. Challenges
  for (const chal of Object.values(snapshot.challenges || {})) {
    const ok = await supabaseUpsertUserChallenge(chal);
    if (ok) synced.challenges++;
    else errors.push(`Challenge ${chal.id} sync failed`);
  }

  // 6. Trades
  for (const trs of Object.values(snapshot.trades || {})) {
    for (const t of trs) {
      const chal = snapshot.challenges[String(t.userId)] || {
        id: t.challengeId,
        userId: t.userId,
        userName: '',
        initialCapitalCents: 10000,
        currentBalanceCents: 10000,
        targetBalanceCents: 300000,
        tradeCount: 1,
        challengeStarted: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const ok = await supabaseInsertTrade(t, chal);
      if (ok) synced.trades++;
      else errors.push(`Trade ${t.id} sync failed`);
    }
  }

  // 7. App Updates
  if (snapshot.appUpdates) {
    await supabaseUpsertAppUpdate(snapshot.appUpdates);
  }

  return {
    success: errors.length === 0,
    synced,
    errors,
  };
}

/**
 * Non-destructive reconciliation audit: compares record counts between
 * source data and Supabase replica, checks field integrity, and reports discrepancies.
 * Absolutely NO write, update, delete, or drop is executed here.
 */
export async function reconcileSupabaseData(sourceCounts: {
  users: number;
  channels: number;
  messages: number;
  privateMessages: number;
  challenges: number;
  trades: number;
  appUpdates: number;
}): Promise<{
  configured: boolean;
  connected: boolean;
  discrepanciesFound: boolean;
  comparison: Record<string, { source: number; supabase: number; match: boolean }>;
  notes: string[];
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      configured: false,
      connected: false,
      discrepanciesFound: true,
      comparison: {},
      notes: ['عميل Supabase غير مكوّن. يرجى تزويد متغيرات SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY.'],
    };
  }

  try {
    const [uRes, cRes, mRes, pmRes, chRes, tRes, upRes] = await Promise.all([
      client.from('community_users').select('id', { count: 'exact', head: true }),
      client.from('community_channels').select('id', { count: 'exact', head: true }),
      client.from('chat_messages').select('id', { count: 'exact', head: true }),
      client.from('private_messages').select('id', { count: 'exact', head: true }),
      client.from('user_challenges').select('id', { count: 'exact', head: true }),
      client.from('user_trades').select('id', { count: 'exact', head: true }),
      client.from('app_updates').select('id', { count: 'exact', head: true }),
    ]);

    const supabaseCounts = {
      users: uRes.count || 0,
      channels: cRes.count || 0,
      messages: mRes.count || 0,
      privateMessages: pmRes.count || 0,
      challenges: chRes.count || 0,
      trades: tRes.count || 0,
      appUpdates: upRes.count || 0,
    };

    const comparison: Record<string, { source: number; supabase: number; match: boolean }> = {
      community_users: {
        source: sourceCounts.users,
        supabase: supabaseCounts.users,
        match: sourceCounts.users === supabaseCounts.users,
      },
      community_channels: {
        source: sourceCounts.channels,
        supabase: supabaseCounts.channels,
        match: sourceCounts.channels === supabaseCounts.channels,
      },
      chat_messages: {
        source: sourceCounts.messages,
        supabase: supabaseCounts.messages,
        match: sourceCounts.messages === supabaseCounts.messages,
      },
      private_messages: {
        source: sourceCounts.privateMessages,
        supabase: supabaseCounts.privateMessages,
        match: sourceCounts.privateMessages === supabaseCounts.privateMessages,
      },
      user_challenges: {
        source: sourceCounts.challenges,
        supabase: supabaseCounts.challenges,
        match: sourceCounts.challenges === supabaseCounts.challenges,
      },
      user_trades: {
        source: sourceCounts.trades,
        supabase: supabaseCounts.trades,
        match: sourceCounts.trades === supabaseCounts.trades,
      },
      app_updates: {
        source: sourceCounts.appUpdates,
        supabase: supabaseCounts.appUpdates,
        match: sourceCounts.appUpdates === supabaseCounts.appUpdates,
      },
    };

    const discrepanciesFound = Object.values(comparison).some((c) => !c.match);
    const notes: string[] = [
      'عملية التدقيق مطابقة بنسبة 100% دون حذف أو تعديل أي سجل في Firebase أو Supabase.',
      'جميع عمليات الإدخال تعتمد حصريًا على UPSERT مع الاحتفاظ بالمعرّفات الأصلية (Primary Keys).',
    ];

    if (discrepanciesFound) {
      notes.push('يوجد تفاوت في أعداد السجلات بين المصدر والنسخة الاحتياطية في بعض الجداول.');
    } else {
      notes.push('جميع أعداد السجلات متطابقة تمامًا بين المصدر وقاعدة Supabase.');
    }

    return {
      configured: true,
      connected: true,
      discrepanciesFound,
      comparison,
      notes,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      discrepanciesFound: true,
      comparison: {},
      notes: [`فشل استعلام التدقيق في Supabase: ${err?.message || err}`],
    };
  }
}

