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
        const response = await _doAuthFetch(input, init, token);

        // If server rejected the token (key rotation / expiration), force-refresh
        // the token once and retry. This covers the ~5 min window during Google
        // key rotation where old tokens are rejected.
        if (response.status === 401 && auth.currentUser) {
          console.warn('[AuthInterceptor] 401 recebido — forçando refresh do token e retentando...');
          try {
            const freshToken = await auth.currentUser.getIdToken(true);
            return await _doAuthFetch(input, init, freshToken);
          } catch (retryErr) {
            console.warn('[AuthInterceptor] Retry com token fresco falhou:', retryErr);
            return response; // Return original 401 if retry also fails
          }
        }

        return response;
      } catch (err) {
        console.warn('[AuthInterceptor] Failed to get token:', err);
      }
    }

    return originalFetch(input, init);
  };

  /** Helper: executes the fetch with the given Bearer token */
  function _doAuthFetch(input: RequestInfo | URL, init: RequestInit | undefined, token: string): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);

    // When body is FormData, don't pass headers object so browser can set
    // Content-Type: multipart/form-data with correct boundary automatically
    const isFormData = init?.body instanceof FormData;
    if (isFormData) {
      const headersObj: Record<string, string> = {};
      headers.forEach((value, key) => { headersObj[key] = value; });
      delete headersObj['content-type'];
      delete headersObj['Content-Type'];
      return originalFetch(input, { ...init, headers: headersObj });
    }
    return originalFetch(input, { ...init, headers });
  }

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
