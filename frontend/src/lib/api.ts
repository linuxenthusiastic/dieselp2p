const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';
const TOKEN_KEY = 'dieselp2p.token';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string | null) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = opts.token === undefined ? tokenStore.get() : opts.token;
  const res = await fetch(`${API_URL}/api${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* sin cuerpo */
  }
  if (!res.ok) {
    const err = (json ?? {}) as { error?: string; details?: unknown };
    throw new ApiError(res.status, err.error ?? `Error ${res.status}`, err.details);
  }
  return json as T;
}

export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body });
export const apiPatch = <T>(path: string, body?: unknown) => api<T>(path, { method: 'PATCH', body });
