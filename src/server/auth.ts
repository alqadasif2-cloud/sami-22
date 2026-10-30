import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export interface UserPayload {
  id: number;
  username: string;
  displayName: string;
  role: 'owner' | 'moderator' | 'user' | 'guest';
  avatarUrl?: string | null;
  isGuest?: boolean;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'sami_trading_secret_key_prod_2026_secure_key_32chars';

export const authSessionCache = new Map<number, { user: UserPayload; cachedAt: number }>();
export const AUTH_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function clearAuthSessionCache(userId?: number) {
  if (userId) {
    authSessionCache.delete(userId);
  } else {
    authSessionCache.clear();
  }
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function generateToken(user: {
  id: number;
  username: string;
  displayName: string;
  role: string;
  avatarUrl?: string | null;
  isGuest?: boolean;
}): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: UserPayload = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role as any,
    avatarUrl: user.avatarUrl || null,
    isGuest: !!user.isGuest,
    iat: now,
    exp: now + 7 * 24 * 3600, // 7 days expiration
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

export function verifyToken(token: string): UserPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSig) {
    return null;
  }

  try {
    const payloadStr = base64UrlDecode(payloadB64);
    const payload: UserPayload = JSON.parse(payloadStr);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['x-auth-token']) {
    token = String(req.headers['x-auth-token']);
  } else if (req.query && req.query.token) {
    token = String(req.query.token);
  }

  if (token) {
    const user = verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Also support x-sami-session header (URL-encoded or raw JSON), ?session= query param, or _ownerSession body fallback
  const rawSessionInput =
    req.headers['x-sami-session'] ||
    (req.query && req.query.session ? String(req.query.session) : undefined) ||
    (req.body && typeof req.body === 'object' ? req.body._ownerSession : undefined);

  if (rawSessionInput) {
    try {
      let parsed: any = rawSessionInput;
      if (typeof rawSessionInput === 'string') {
        const trimmed = rawSessionInput.trim();
        const decoded = trimmed.startsWith('%7B') || trimmed.includes('%22')
          ? decodeURIComponent(trimmed)
          : trimmed;
        parsed = JSON.parse(decoded);
      }
      if (parsed && parsed.id) {
        const numericId = Number(parsed.id);
        const isGuestAccount =
          parsed.isGuest === true ||
          parsed.role === 'guest' ||
          numericId > 9000000 ||
          String(parsed.username || '').startsWith('guest_');

        if (isGuestAccount && numericId > 0) {
          req.user = {
            id: numericId,
            username: String(parsed.username || `guest_${numericId}`),
            displayName: String(parsed.displayName || 'ضيف'),
            role: 'guest', // strictly locked to guest - zero privilege escalation
            avatarUrl: null,
            isGuest: true,
          };
          return next();
        }

        // 0. Check in-memory auth session cache first (ZERO Firestore reads on API calls!)
        const sessionCached = authSessionCache.get(numericId);
        if (
          sessionCached &&
          Date.now() - sessionCached.cachedAt < AUTH_CACHE_TTL_MS &&
          sessionCached.user.username.toLowerCase() === String(parsed.username || '').toLowerCase()
        ) {
          req.user = sessionCached.user;
          return next();
        }

        const { getUserById, projectId, databaseId, isFirestoreRestBackoffActive, setFirestoreRestBackoff } =
          await import('./db.ts');

        let dbUser = await getUserById(numericId);

        if (!dbUser && numericId > 0 && !isFirestoreRestBackoffActive()) {
          try {
            const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/community_users/${encodeURIComponent(String(numericId))}`;
            const resp = await fetch(url);
            if (resp.status === 429) {
              setFirestoreRestBackoff();
            } else if (resp.ok) {
              const docJson: any = await resp.json();
              const f = docJson?.fields;
              if (f) {
                const uname = f.username?.stringValue || '';
                const rawRole = f.role?.stringValue || 'user';
                dbUser = {
                  id: numericId,
                  username: uname,
                  displayName: f.displayName?.stringValue || uname || 'متداول',
                  passwordHash: '',
                  salt: '',
                  role: numericId === 1 ? 'owner' : rawRole === 'moderator' ? 'moderator' : 'user',
                  avatarUrl: f.avatarUrl?.stringValue || null,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };
              }
            }
          } catch {}
        }

        if (dbUser && dbUser.username.toLowerCase() === String(parsed.username || '').toLowerCase()) {
          const authenticatedUser: UserPayload = {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.displayName,
            role: dbUser.role, // strictly verified from database!
            avatarUrl: dbUser.avatarUrl || null,
            isGuest: false,
          };
          authSessionCache.set(dbUser.id, { user: authenticatedUser, cachedAt: Date.now() });
          req.user = authenticatedUser;
          return next();
        }
      }
    } catch {}
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'يرجى تسجيل الدخول للوصول إلى هذا المحتوى' });
    return;
  }
  next();
}

export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'يرجى تسجيل الدخول' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'ليس لديك الصلاحيات الكافية للقيام بهذا الإجراء' });
      return;
    }
    next();
  };
}
