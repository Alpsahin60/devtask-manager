import axios from 'axios';
import {
  ApiResponse,
  AuthResponse,
  Task,
  Sprint,
  SprintStatus,
  ActiveSprintResponse,
  StandupEntry,
  RetroItem,
  RetroGrouped,
} from '@/types';

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

  // Recruiter-facing one-click login for the seeded showcase account.
  // No payload required; the backend looks up the user with isDemo = true.
  demoLogin: () => api.post<ApiResponse<AuthResponse>>('/auth/demo-login'),

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

// ─── Scrum API ────────────────────────────────────────────────────────────────

export interface CreateSprintPayload {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}

export interface UpdateSprintPayload {
  name?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status?: SprintStatus;
  reviewNotes?: string;
}

export interface UpsertStandupPayload {
  date: string;
  yesterday?: string;
  today?: string;
  blockers?: string;
}

export interface CreateRetroItemPayload {
  category: 'mad' | 'sad' | 'glad';
  content: string;
}

export const sprintsApi = {
  getAll: (filters?: { status?: SprintStatus }) =>
    api.get<ApiResponse<Sprint[]>>('/sprints', { params: filters }),

  getActive: () =>
    api.get<ApiResponse<ActiveSprintResponse | null>>('/sprints/active'),

  getById: (id: string) =>
    api.get<ApiResponse<Sprint>>(`/sprints/${id}`),

  create: (data: CreateSprintPayload) =>
    api.post<ApiResponse<Sprint>>('/sprints', data),

  update: (id: string, data: UpdateSprintPayload) =>
    api.patch<ApiResponse<Sprint>>(`/sprints/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/sprints/${id}`),
};

export const standupsApi = {
  list: (sprintId: string) =>
    api.get<ApiResponse<StandupEntry[]>>(`/sprints/${sprintId}/standups`),

  upsert: (sprintId: string, data: UpsertStandupPayload) =>
    api.put<ApiResponse<StandupEntry>>(`/sprints/${sprintId}/standups`, data),
};

export const retroApi = {
  list: (sprintId: string) =>
    api.get<ApiResponse<RetroGrouped>>(`/sprints/${sprintId}/retro`),

  create: (sprintId: string, data: CreateRetroItemPayload) =>
    api.post<ApiResponse<RetroItem>>(`/sprints/${sprintId}/retro`, data),

  delete: (sprintId: string, itemId: string) =>
    api.delete<ApiResponse<null>>(`/sprints/${sprintId}/retro/${itemId}`),
};

export default api;
