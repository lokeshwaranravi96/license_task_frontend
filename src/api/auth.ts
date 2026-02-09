import { api, setAuthToken, getStatusMessage, isAxiosError } from './client';

export interface LoginRequest {
  email_id: string;
  password: string;
}

export interface LoginSuccess {
  access_token?: string;
  refresh_token?: string;
  token?: string; // Legacy support
  user?: { id: string; email_id: string; [key: string]: unknown };
  [key: string]: unknown;
}

export async function login(credentials: LoginRequest): Promise<{ success: true; status: number; data: LoginSuccess } | { success: false; status?: number; message: string }> {
  try {
    console.log("🔐 Login attempt with credentials:", credentials);
    const response = await api.post<LoginSuccess>('/auth/login', credentials);
    const { data, status } = response;
    console.log("✅ Login successful:", status, "response data:", JSON.stringify(data));

    // Extract token from various possible response shapes (direct or nested under data)
    const raw = data as Record<string, unknown>;
    const nested = raw?.data as Record<string, unknown> | undefined;

    const accessToken =
      (raw.access_token as string) ??
      (raw.token as string) ??
      (raw.accessToken as string) ??
      (nested?.access_token as string) ??
      (nested?.token as string) ??
      (nested?.accessToken as string) ??
      "";

    const refreshToken =
      (raw.refresh_token as string) ??
      (raw.refreshToken as string) ??
      (nested?.refresh_token as string) ??
      (nested?.refreshToken as string) ??
      "";

    let tokenToStore = accessToken.trim();
    if (!tokenToStore && (raw || nested)) {
      // Fallback: find any string in response that looks like a JWT (e.g. "xxx.yyy.zzz")
      const findJwt = (obj: Record<string, unknown>): string => {
        if (!obj) return "";
        for (const v of Object.values(obj)) {
          if (typeof v === "string" && v.includes(".") && v.length > 20) return v;
          if (v && typeof v === "object" && !Array.isArray(v)) {
            const found = findJwt(v as Record<string, unknown>);
            if (found) return found;
          }
        }
        return "";
      };
      tokenToStore = findJwt(raw) || findJwt(nested || {});
    }
    if (tokenToStore) {
      localStorage.setItem('access_token', tokenToStore);
      setAuthToken(tokenToStore);
      console.log("✅ Token stored in localStorage and set on API client");
    } else {
      console.warn("⚠️ No token found in response. Keys received:", Object.keys(raw || {}), nested ? Object.keys(nested) : "no nested data");
    }

    if (refreshToken && typeof refreshToken === 'string' && refreshToken.trim()) {
      localStorage.setItem('refresh_token', refreshToken.trim());
    }

    // Return success with status so UI can navigate on 200
    return { success: true, status, data };
  } catch (e) {
    console.error("❌ Login error:", e);
    if (isAxiosError(e)) {
      // Network error (no response from server)
      if (!e.response) {
        const baseURL = api.defaults.baseURL || 'unknown';
        const url = `${baseURL}/auth/login`;
        return { 
          success: false, 
          message: `Cannot connect to server at ${url}. Please check if the backend is running and accessible. Error: ${e.message}` 
        };
      }
      
      // Server responded with error status
      const status = e.response.status;
      const msg = (e.response.data as { message?: string })?.message || getStatusMessage(status);
      return { success: false, status, message: msg };
    }
    return { success: false, message: `Network or unknown error: ${e instanceof Error ? e.message : 'Unknown error'}` };
  }
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token'); // Legacy cleanup
  setAuthToken(null);
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
