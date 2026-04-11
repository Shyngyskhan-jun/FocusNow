import { apiFetch } from './api';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { storage } from './storage';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  name: string;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!data?.token) throw new Error('Сервер не вернул токен');

  storage.set(STORAGE_KEYS.TOKEN, data.token);
  storage.set(STORAGE_KEYS.USER_NAME, data.name ?? payload.email);

  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!data?.token) throw new Error('Сервер не вернул токен');

  storage.set(STORAGE_KEYS.TOKEN, data.token);
  storage.set(STORAGE_KEYS.USER_NAME, data.name ?? payload.email);

  return data;
}

export function logout(): void {
  storage.remove(STORAGE_KEYS.TOKEN);
  storage.remove(STORAGE_KEYS.USER_NAME);
}

export function isAuthenticated(): boolean {
  return !!storage.get(STORAGE_KEYS.TOKEN);
}