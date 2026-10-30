/**
 * Firebase Cloud Messaging and Native Bridge service for Sami App
 */

export function syncUserSessionToNative(userId: number, displayName: string): void {
  try {
    const bridge =
      (window as any).SamiBridge ||
      (window as any).AndroidBridge ||
      (window as any).Android;

    if (bridge && typeof bridge.syncUserSession === 'function') {
      try {
        bridge.syncUserSession(userId, displayName);
      } catch {
        bridge.syncUserSession(String(userId), displayName);
      }
    }

    // Also register on web backend if FCM token is available in local storage or bridge
    const token =
      (bridge && typeof bridge.getFcmToken === 'function' && bridge.getFcmToken()) ||
      localStorage.getItem('sami_fcm_token');

    if (token) {
      fetch('/api/fcm/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          userId,
          username: displayName,
          platform: bridge ? 'android' : 'web',
        }),
      }).catch(() => {});
    }
  } catch (err) {
    console.debug('[FCM Bridge] Error syncing to native:', err);
  }
}

export async function unregisterUserFcmToken(userId: number): Promise<void> {
  try {
    const bridge =
      (window as any).SamiBridge ||
      (window as any).AndroidBridge ||
      (window as any).Android;

    if (bridge) {
      if (typeof bridge.unregisterFcmToken === 'function') {
        try {
          bridge.unregisterFcmToken(String(userId));
        } catch {}
      }
      if (typeof bridge.onLogout === 'function') {
        try {
          bridge.onLogout();
        } catch {}
      }
    }

    const token = localStorage.getItem('sami_fcm_token');
    await fetch('/api/fcm/unregister', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, token: token || undefined }),
    }).catch(() => {});
  } catch (err) {
    console.debug('[FCM Bridge] Error unregistering FCM token:', err);
  }
}
