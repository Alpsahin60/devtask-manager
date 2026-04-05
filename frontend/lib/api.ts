import axios from 'axios';
import { ApiResponse, AuthResponse, Task } from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api',
  withCredentials: true, // sends httpOnly cookies automatically
});

// ─── Token Management ─────────────────────────────────────────────────────────

// Access token is kept in memory (not localStorage) for XSS protection
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// These endpoints must never trigger a token refresh retry — doing so causes infinite loops
const NO_RETRY_URLS = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/me'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl: string = originalRequest?.url ?? '';

    const shouldRetry =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !NO_RETRY_URLS.some((url) => requestUrl.includes(url));

    if (shouldRetry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post<ApiResponse<{ accessToken: string }>>(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        if (data.data?.accessToken) {
          setAccessToken(data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch {
        setAccessToken(null);
        if (typeof window !== 'undefined' &&
            !window.location.pathname.startsWith('/login') &&
            !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', { name, email, password }),

  login: (email: string, password: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password }),

  logout: () => api.post<ApiResponse<null>>('/auth/logout'),

  me: () => api.get<ApiResponse<{ user: import('@/types').User }>>('/auth/me'),
};

// ─── Tasks API ────────────────────────────────────────────────────────────────

export const tasksApi = {
  getAll: (filters?: { status?: string; priority?: string }) =>
    api.get<ApiResponse<Task[]>>('/tasks', { params: filters }),

  getById: (id: string) =>
    api.get<ApiResponse<Task>>(`/tasks/${id}`),

  create: (data: Partial<Task>) =>
    api.post<ApiResponse<Task>>('/tasks', data),

  update: (id: string, data: Partial<Task>) =>
    api.patch<ApiResponse<Task>>(`/tasks/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/tasks/${id}`),
};

export default api;
