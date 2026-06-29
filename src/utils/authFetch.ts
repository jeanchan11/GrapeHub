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
  console.log('[AuthInterceptor] Global fetch interceptor initialized and active.');

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

    // Only intercept API calls (not external URLs, not public routes)
    const isApiCall = url.startsWith('/api/') || url.includes('/api/');
    const isPublicRoute = /\/(api\/public\/|api\/nps\/submit|api\/health)/.test(url);

    if (isApiCall && !isPublicRoute) {
      const userExists = !!auth.currentUser;
      console.log(`[AuthInterceptor] Intercepted fetch to API: "${url}". User exists in auth state: ${userExists}`);

      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          console.log(`[AuthInterceptor] Token retrieved successfully. Injecting Authorization header.`);
          const response = await _doAuthFetch(input, init, token);

          // If server rejected the token (key rotation / expiration), force-refresh
          // the token once and retry. This covers the ~5 min window during Google
          // key rotation where old tokens are rejected.
          if (response.status === 401 && auth.currentUser) {
            console.warn('[AuthInterceptor] Received 401 Unauthorized — forcing token refresh and retrying...');
            try {
              const freshToken = await auth.currentUser.getIdToken(true);
              return await _doAuthFetch(input, init, freshToken);
            } catch (retryErr) {
              console.error('[AuthInterceptor] Retry with fresh token failed:', retryErr);
              return response; // Return original 401 if retry also fails
            }
          }

          return response;
        } catch (err) {
          console.error('[AuthInterceptor] Failed to get Firebase token:', err);
        }
      } else {
        console.warn(`[AuthInterceptor] User is not authenticated in Firebase Auth. Skipping token injection for API: "${url}"`);
      }
    }

    return originalFetch(input, init);
  };

  /** Helper: executes the fetch with the given Bearer token, using plain headers object for maximum compatibility */
  function _doAuthFetch(input: RequestInfo | URL, init: RequestInit | undefined, token: string): Promise<Response> {
    const headersObj: Record<string, string> = {};

    // Copy existing headers
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headersObj[key] = value;
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          headersObj[key] = value;
        });
      } else {
        Object.assign(headersObj, init.headers);
      }
    }

    // Set Authorization header
    headersObj['Authorization'] = `Bearer ${token}`;

    // For FormData, let the browser set the Content-Type with correct boundary automatically
    const isFormData = init?.body instanceof FormData;
    if (isFormData) {
      // Case-insensitive deletion of content-type
      for (const key of Object.keys(headersObj)) {
        if (key.toLowerCase() === 'content-type') {
          delete headersObj[key];
        }
      }
    }

    return originalFetch(input, { ...init, headers: headersObj });
  }
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
