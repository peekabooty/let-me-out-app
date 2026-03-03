import axios, { isAxiosError } from 'axios';
import type {
  User,
  AbsenceType,
  Absence,
  Observation,
  Attachment,
  Notification,
  AbsenceStatus,
} from '@repo/types';
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

export async function cancelAbsence(absenceId: string): Promise<void> {
  await apiClient.post(`/absences/${absenceId}/cancel`);
}

export async function listObservations(absenceId: string): Promise<Observation[]> {
  const response = await apiClient.get<Observation[]>(`/absences/${absenceId}/observations`);
  return response.data;
}

export interface CreateObservationPayload {
  content: string;
}

export async function createObservation(
  absenceId: string,
  payload: CreateObservationPayload
): Promise<{ id: string }> {
  const response = await apiClient.post<{ id: string }>(
    `/absences/${absenceId}/observations`,
    payload
  );
  return response.data;
}

export async function listAttachments(observationId: string): Promise<Attachment[]> {
  const response = await apiClient.get<Attachment[]>(`/observations/${observationId}/attachments`);
  return response.data;
}

export async function uploadAttachment(observationId: string, file: File): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<{ id: string }>(
    `/observations/${observationId}/attachments`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

export function getAttachmentDownloadUrl(attachmentId: string): string {
  return `${apiClient.defaults.baseURL}/observations/attachments/${attachmentId}/download`;
}

export async function listNotifications(): Promise<Notification[]> {
  const response = await apiClient.get<Notification[]>('/notifications');
  return response.data;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await apiClient.patch(`/notifications/${notificationId}/read`);
}

export interface CalendarAbsence {
  id: string;
  userId: string;
  userName: string;
  absenceTypeId: string;
  absenceTypeName: string;
  startAt: string;
  endAt: string;
  duration: number;
  status: AbsenceStatus | null;
  isOwn: boolean;
  teamColor: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listCalendarAbsences(): Promise<CalendarAbsence[]> {
  const response = await apiClient.get<CalendarAbsence[]>('/absences/calendar');
  return response.data;
}

export interface AbsenceTypeBalance {
  absenceTypeId: string;
  absenceTypeName: string;
  unit: 'hours' | 'days';
  maxPerYear: number;
  consumed: number;
  remaining: number;
}

export interface UpcomingAbsence {
  id: string;
  absenceTypeName: string;
  startAt: string;
  endAt: string;
  duration: number;
  status: AbsenceStatus | null;
}

export interface PendingValidation {
  id: string;
  userName: string;
  absenceTypeName: string;
  startAt: string;
  endAt: string;
  duration: number;
  createdAt: string;
}

export interface DashboardData {
  balances: AbsenceTypeBalance[];
  upcomingAbsences: UpcomingAbsence[];
  pendingValidations: PendingValidation[];
}

export async function fetchDashboard(): Promise<DashboardData> {
  const response = await apiClient.get<DashboardData>('/dashboard');
  return response.data;
}
