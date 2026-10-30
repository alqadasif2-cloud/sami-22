-- ============================================================================
-- SAMI TRADING CHALLENGE & CHAT - SUPABASE SECONDARY REPLICA & FALLBACK SCHEMA
-- Database: PostgreSQL (Supabase)
-- Target: Zero-downtime fallback when Firestore 429 quota is reached
-- ============================================================================

-- 1. USERS TABLE (community_users)
CREATE TABLE IF NOT EXISTS community_users (
  id BIGINT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  username_lower TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'moderator', 'user', 'guest')),
  avatar_url TEXT,
  warnings_count INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username_lower ON community_users(username_lower);
CREATE INDEX IF NOT EXISTS idx_users_role ON community_users(role);

-- 2. CHANNELS TABLE (community_channels)
CREATE TABLE IF NOT EXISTS community_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_open_public BOOLEAN NOT NULL DEFAULT true,
  password TEXT,
  image_url TEXT,
  storage_path TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'visible', 'hidden')),
  allowed_member_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  member_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_member_count INT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_channels_visibility ON community_channels(visibility);

-- 3. CHANNEL MESSAGES TABLE (chat_messages)
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'user',
  sender_avatar_url TEXT,
  text TEXT,
  image_url TEXT,
  storage_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  file_url TEXT,
  audio_url TEXT,
  audio_duration INT,
  reply_to_id TEXT,
  reply_to_text TEXT,
  reply_to_sender_name TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  timestamp BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_timestamp ON chat_messages(channel_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);

-- 4. PRIVATE MESSAGES TABLE (private_messages)
CREATE TABLE IF NOT EXISTS private_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  participant_id BIGINT,
  participant_name TEXT,
  participant_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  sender_id BIGINT NOT NULL,
  receiver_id BIGINT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'user',
  sender_avatar_url TEXT,
  text TEXT,
  image_url TEXT,
  storage_path TEXT,
  audio_url TEXT,
  audio_duration INT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  reply_to_id TEXT,
  reply_to_sender_name TEXT,
  reply_to_text TEXT,
  reply_to_is_deleted BOOLEAN NOT NULL DEFAULT false,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  timestamp BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(conversation_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender_receiver ON private_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_receiver ON private_messages(receiver_id);

-- 5. TRADING CHALLENGES (user_challenges)
CREATE TABLE IF NOT EXISTS user_challenges (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  user_name TEXT,
  initial_capital_cents BIGINT NOT NULL DEFAULT 10000,
  current_balance_cents BIGINT NOT NULL DEFAULT 10000,
  target_balance_cents BIGINT NOT NULL DEFAULT 300000,
  trade_count INT NOT NULL DEFAULT 0,
  challenge_started BOOLEAN NOT NULL DEFAULT false,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);

-- 6. TRADES (user_trades)
CREATE TABLE IF NOT EXISTS user_trades (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  trade_number INT NOT NULL,
  result_cents BIGINT NOT NULL,
  old_balance_cents BIGINT NOT NULL,
  new_balance_cents BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('WIN', 'LOSS')),
  attachment_path TEXT,
  timestamp BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_trades_user_number ON user_trades(user_id, trade_number ASC);
CREATE INDEX IF NOT EXISTS idx_user_trades_challenge ON user_trades(challenge_id);

-- 7. APP UPDATES (app_updates)
CREATE TABLE IF NOT EXISTS app_updates (
  id TEXT PRIMARY KEY,
  version_name TEXT NOT NULL,
  version_code INT NOT NULL,
  download_url TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  min_supported_version_code INT,
  published_by TEXT,
  updated_at BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT true
);

-- Seed initial channels if empty
INSERT INTO community_channels (id, name, description, is_private, is_open_public, visibility, allowed_member_ids, member_ids, created_at)
VALUES 
  ('general_trading', '💬 دردشة عامة - دفعة 3000$', 'القناة العامة لتبادل الأفكار والنقاشات بين جميع المشتركين.', false, true, 'public', '[]'::jsonb, '[1]'::jsonb, 1735689600000),
  ('signals_vip', '👑 قناة Sami VIP الخاصة', 'قناة التوصيات والصفقات المتقدمة الخاصة بالأعضاء المصرح لهم فقط.', true, false, 'hidden', '[1]'::jsonb, '[1]'::jsonb, 1735689600000)
ON CONFLICT (id) DO NOTHING;
