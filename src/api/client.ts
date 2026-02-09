import axios, { AxiosError } from 'axios';

// Replace these with your backend base URL and auth keys
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com';
const API_KEY = import.meta.env.VITE_API_KEY || 'sample-api-key';
const AUTH_HEADER = import.meta.env.VITE_AUTH_HEADER || 'X-API-Key';

// Log API configuration on startup
console.log('🔧 API Configuration:', {
  BASE_URL,
  API_KEY: API_KEY ? '***' : 'Not set',
  AUTH_HEADER,
});

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    [AUTH_HEADER]: API_KEY,
  },
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('🚀 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Attach token after login (sample key - replace with your backend token key name)
const TOKEN_HEADER = import.meta.env.VITE_TOKEN_HEADER || 'Authorization';

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common[TOKEN_HEADER] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common[TOKEN_HEADER];
  }
}

export function getAuthToken(): string | null {
  // Check for access_token first (new format), then fallback to token (legacy)
  return localStorage.getItem('access_token') || localStorage.getItem('token');
}

// Client-side redirect to /login (avoids 404 when hosted SPA has no server route for /login)
type NavigateFn = (path: string) => void;
let logoutNavigate: NavigateFn | null = null;
export function registerLogoutNavigate(nav: NavigateFn | null) {
  logoutNavigate = nav;
}
export function redirectToLogin() {
  if (typeof window === 'undefined') return;
  if (logoutNavigate) logoutNavigate('/login');
  else window.location.href = '/login';
}

// Response interceptor for debugging and 401 handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'N/A',
      responseData: error.response?.data,
    });
    
    // On 401 Unauthorized, clear all tokens and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token');
      setAuthToken(null);
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        redirectToLogin();
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper: interpret status codes (you can extend per your backend)
export function getStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Bad request. Please check your input.';
    case 401:
      return 'Unauthorized. Please log in again.';
    case 403:
      return 'Access forbidden.';
    case 404:
      return 'Resource not found.';
    case 409:
      return 'Conflict (e.g. already exists).';
    case 422:
      return 'Validation error.';
    case 500:
      return 'Server error. Try again later.';
    default:
      return status >= 500 ? 'Server error.' : 'Something went wrong.';
  }
}

export function isAxiosError(e: unknown): e is AxiosError<{ message?: string; api_status?: string; data?: unknown }> {
  return axios.isAxiosError(e);
}
