const BASE_URL = 'https://focusnow-production-e6e0.up.railway.app/api';

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('focusnow_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  console.log("ПОЛНЫЙ URL ЗАПРОСА:", `${BASE_URL}${endpoint}`);
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('focusnow_token');
    localStorage.removeItem('focusnow_user_name');
    window.location.href = '/';
    throw new Error('Сессия истекла. Войди снова.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ??
      `Ошибка ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}