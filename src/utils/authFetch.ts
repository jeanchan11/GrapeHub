import { auth } from '../firebase';

/**
 * Global fetch interceptor that adds Firebase Auth token to all API requests.
 * Call setupAuthInterceptor() once at app startup to patch window.fetch globally.
 * 
 * This approach avoids modifying 50+ component files — all fetch('/api/...')
 * calls will automatically include the Authorization header.
 */

const originalFetch = window.fetch.bind(window);

export function setupAuthInterceptor(): void {
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

    // Only intercept API calls (not external URLs, not public routes)
    const isApiCall = url.startsWith('/api/') || url.includes('/api/');
    const isPublicRoute = /\/(api\/public\/|api\/nps\/submit|api\/health)/.test(url);

    if (isApiCall && !isPublicRoute && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        const headers = new Headers(init?.headers);
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        return originalFetch(input, { ...init, headers });
      } catch (err) {
        console.warn('[AuthInterceptor] Failed to get token:', err);
      }
    }

    return originalFetch(input, init);
  };

  console.log('[Auth] Global fetch interceptor installed.');
}

/**
 * Returns auth headers for use in non-fetch contexts.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};

  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}
