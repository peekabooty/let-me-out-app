import axios, { isAxiosError } from 'axios';

import type { User } from '@repo/types';
import { useAuthStore } from '../store/auth.store';
import type { SessionUser } from '../store/auth.store';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/me')
    ) {
      useAuthStore.getState().clearSession();
      globalThis.location.replace('/login');
    }

    return Promise.reject(error);
  }
);

export async function fetchMe(): Promise<SessionUser> {
  const response = await apiClient.get<SessionUser>('/auth/me');
  return response.data;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export async function login(credentials: LoginCredentials): Promise<void> {
  await apiClient.post<{ success: boolean }>('/auth/login', credentials);
}

export async function listUsers(): Promise<User[]> {
  const response = await apiClient.get<User[]>('/users');
  return response.data;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role: User['role'];
}

export async function createUser(payload: CreateUserPayload): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/users', payload);
  return response.data;
}

export interface UpdateUserPayload {
  name?: string;
  role?: User['role'];
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<void> {
  await apiClient.patch(`/users/${id}`, payload);
}

export async function deactivateUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
