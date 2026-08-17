import type { ApiResponse, PaginatedApiResponse } from '@/lib/api';

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
}

export async function serverGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    next: { revalidate: 30 },
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`API ${response.status} ${path}`);
  }
  const body = (await response.json()) as ApiResponse<T>;
  return body.data;
}

export async function serverGetPaginated<T>(path: string): Promise<PaginatedApiResponse<T>> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    next: { revalidate: 30 },
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`API ${response.status} ${path}`);
  }
  return response.json() as Promise<PaginatedApiResponse<T>>;
}
