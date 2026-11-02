const TOKEN_KEY = 'pf_token';
const CF_KEY = 'pf_cf_token';

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const tokenStore = {
  get: () => safe(() => localStorage.getItem(TOKEN_KEY), null),
  set: (t: string) => safe(() => localStorage.setItem(TOKEN_KEY, t), undefined),
  clear: () => safe(() => localStorage.removeItem(TOKEN_KEY), undefined),
};

/** El token de Caja Fuerte vive solo en la pestaña actual. */
export const cfTokenStore = {
  get: () => safe(() => sessionStorage.getItem(CF_KEY), null),
  set: (t: string) => safe(() => sessionStorage.setItem(CF_KEY, t), undefined),
  clear: () => safe(() => sessionStorage.removeItem(CF_KEY), undefined),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

/** Base de la API: VITE_API_URL (ej. https://api.midominio.com) o el mismo origen (proxy de Vite / backend sirviendo la web). */
export const API_BASE = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}/api`;

function buildUrl(path: string, query?: Query) {
  const qs = new URLSearchParams();
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  const q = qs.toString();
  return `${API_BASE}${path}${q ? `?${q}` : ''}`;
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (path.startsWith('/caja-fuerte')) {
    const cf = cfTokenStore.get();
    if (cf) headers['x-cf-token'] = cf;
  }
  const res = await fetch(buildUrl(path, query), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  const data = text ? safe(() => JSON.parse(text), text) : null;
  if (!res.ok) {
    const msg = (data && typeof data === 'object' && 'message' in data && (data as { message: string }).message) || `Error ${res.status}`;
    if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/caja-fuerte')) onUnauthorized?.();
    if (res.status === 401 && path.startsWith('/caja-fuerte')) cfTokenStore.clear();
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T,>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T,>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T,>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T,>(path: string, body?: unknown) => request<T>('DELETE', path, body),
  /** Descarga un archivo autenticado (CSV de caja, etc.) */
  async download(path: string, filename: string, query?: Query) {
    const headers: Record<string, string> = {};
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
    const cf = cfTokenStore.get();
    if (cf) headers['x-cf-token'] = cf;
    const res = await fetch(buildUrl(path, query), { headers });
    if (!res.ok) throw new ApiError(res.status, 'No se pudo descargar el archivo');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error inesperado');
