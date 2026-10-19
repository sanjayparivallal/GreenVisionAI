import axios from 'axios';
import toast from 'react-hot-toast';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use((config) => {
  if (import.meta.env.DEV) {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
  }
  const token = localStorage.getItem('gv_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const onTokenRefreshed = (newToken: string) => {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// Centralized Response Interceptor with Auto Token Refresh
apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      toast.error('Unable to connect. Check your internet connection.');
      return Promise.reject(error);
    }

    const status = error.response.status;
    const detail = error.response.data?.detail || error.response.data?.message;

    // ── Token Auto-Refresh & Auth Error Handling ─────────────────────────
    if (status === 401) {
      const isAuthRoute =
        window.location.pathname === '/login' ||
        window.location.pathname.startsWith('/signup') ||
        originalRequest?.url?.includes('/auth/login') ||
        originalRequest?.url?.includes('/auth/signup');
      const isInitCheck = originalRequest?.url?.includes('/auth/me');
      const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');

      // 1. Explicit login or signup failure (e.g., incorrect credentials)
      if (isAuthRoute) {
        toast.error(detail || 'Invalid email or password. Please check your credentials.');
        return Promise.reject(error);
      }

      // 2. Silent init check failure on app startup
      if (isInitCheck) {
        return Promise.reject(error);
      }

      // 3. Attempt silent refresh for expired access tokens
      if (!isRefreshEndpoint && !originalRequest._retry) {
        const refreshToken = localStorage.getItem('gv_refresh_token');

        if (refreshToken) {
          if (isRefreshing) {
            return new Promise((resolve) => {
              addRefreshSubscriber((newToken: string) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                resolve(apiClient(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const res = await axios.post('/api/auth/refresh', { refreshToken });
            const { accessToken, refreshToken: newRefresh } = res.data;

            localStorage.setItem('gv_access_token', accessToken);
            if (newRefresh) localStorage.setItem('gv_refresh_token', newRefresh);

            apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;

            onTokenRefreshed(accessToken);
            isRefreshing = false;

            return apiClient(originalRequest);
          } catch {
            isRefreshing = false;
            localStorage.removeItem('gv_access_token');
            localStorage.removeItem('gv_refresh_token');
            localStorage.removeItem('gv_user');
            toast.error('Session expired. Please log in again.');
            window.location.href = '/login';
            return Promise.reject(error);
          }
        }
      }

      // 4. Fallback for unauthenticated requests
      localStorage.removeItem('gv_access_token');
      localStorage.removeItem('gv_refresh_token');
      localStorage.removeItem('gv_user');
      toast.error(detail || 'Session expired. Please log in again.');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // ── Other Error Status Handlers ──────────────────────────────────────────
    switch (status) {
      case 400:
        toast.error(detail || 'Bad request. Please check your input.');
        break;

      case 403:
        toast.error(detail || "You don't have permission to perform this action.");
        break;

      case 404:
        toast.error(detail || "That resource couldn't be found.");
        break;

      case 422:
        if (typeof detail === 'string') {
          toast.error(detail);
        } else if (Array.isArray(detail)) {
          const msg = detail.map((err: any) => `${err.loc?.join('.') || 'Field'}: ${err.msg}`).join(', ');
          toast.error(msg || 'Invalid data submitted.');
        } else {
          toast.error('Validation error on input data.');
        }
        break;

      case 500:
      default:
        toast.error(detail || 'Something went wrong on our end. Please try again.');
        break;
    }

    return Promise.reject(error);
  }
);
