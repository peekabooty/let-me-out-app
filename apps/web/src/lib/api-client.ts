import axios, { isAxiosError } from 'axios';
import type { User, AbsenceType, Absence } from '@repo/types';
import { ValidationDecision } from '@repo/types';

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

export async function listAbsenceTypes(onlyActive = false): Promise<AbsenceType[]> {
  const response = await apiClient.get<AbsenceType[]>('/absence-types', {
    params: onlyActive ? { onlyActive: 'true' } : undefined,
  });
  return response.data;
}

export interface CreateAbsenceTypePayload {
  name: string;
  unit: AbsenceType['unit'];
  maxPerYear: number;
  minDuration: number;
  maxDuration: number;
  requiresValidation: boolean;
  allowPastDates: boolean;
  minDaysInAdvance: number | null;
}

export async function createAbsenceType(
  payload: CreateAbsenceTypePayload
): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>('/absence-types', payload);
  return response.data;
}

export interface UpdateAbsenceTypePayload {
  name?: string;
  maxPerYear?: number;
  minDuration?: number;
  maxDuration?: number;
  requiresValidation?: boolean;
  allowPastDates?: boolean;
  minDaysInAdvance?: number | null;
}

export async function updateAbsenceType(
  id: string,
  payload: UpdateAbsenceTypePayload
): Promise<void> {
  await apiClient.patch(`/absence-types/${id}`, payload);
}

export async function deactivateAbsenceType(id: string): Promise<void> {
  await apiClient.delete(`/absence-types/${id}`);
}

export interface CreateAbsencePayload {
  absenceTypeId: string;
  startAt: string;
  endAt: string;
  validatorIds?: string[];
}

export async function createAbsence(payload: CreateAbsencePayload): Promise<Absence> {
  const response = await apiClient.post<Absence>('/absences', payload);
  return response.data;
}

export interface ValidateAbsencePayload {
  decision: ValidationDecision;
}

export async function validateAbsence(
  absenceId: string,
  decision: ValidationDecision
): Promise<void> {
  await apiClient.post(`/absences/${absenceId}/validate`, { decision });
}

export async function reconsiderAbsence(absenceId: string): Promise<void> {
  await apiClient.post(`/absences/${absenceId}/reconsider`);
}

export async function discardAbsence(absenceId: string): Promise<void> {
  await apiClient.post(`/absences/${absenceId}/discard`);
}
