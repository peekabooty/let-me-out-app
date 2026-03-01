import axios from 'axios';

import type { SessionUser } from '../store/auth.store';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  withCredentials: true,
});

export async function fetchMe(): Promise<SessionUser> {
  const response = await apiClient.get<SessionUser>('/auth/me');
  return response.data;
}
