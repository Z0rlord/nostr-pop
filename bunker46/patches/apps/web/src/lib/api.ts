import { useAuthStore } from '../stores/auth.js';

const BASE_URL = '/api';

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const auth = useAuthStore();
  const refreshToken = auth.refreshToken;
  if (!refreshToken) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
        if (!data.accessToken) return false;
        auth.setTokens(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

class ApiClient {
  private getHeaders(hasBody = false): HeadersInit {
    const auth = useAuthStore();
    const headers: HeadersInit = {};
    if (hasBody) headers['Content-Type'] = 'application/json';
    if (auth.accessToken) headers['Authorization'] = `Bearer ${auth.accessToken}`;
    return headers;
  }

  private async request(
    path: string,
    init: RequestInit,
    hasBody: boolean,
    retried = false,
  ): Promise<Response> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: this.getHeaders(hasBody),
    });
    if (res.status === 401 && !retried && (await refreshAccessToken())) {
      return this.request(path, init, hasBody, true);
    }
    return res;
  }

  async get<T>(path: string): Promise<T> {
    const res = await this.request(path, {}, false);
    if (!res.ok) throw await this.handleError(res);
    return res.json();
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.request(
      path,
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      !!body,
    );
    if (!res.ok) throw await this.handleError(res);
    return res.json();
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await this.request(path, { method: 'PUT', body: JSON.stringify(body) }, true);
    if (!res.ok) throw await this.handleError(res);
    return res.json();
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await this.request(path, { method: 'PATCH', body: JSON.stringify(body) }, true);
    if (!res.ok) throw await this.handleError(res);
    return res.json();
  }

  async delete(path: string): Promise<void> {
    const res = await this.request(path, { method: 'DELETE' }, false);
    if (!res.ok) throw await this.handleError(res);
  }

  private async handleError(res: Response) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    return new Error(body.message || `Request failed: ${res.status}`);
  }
}

export const api = new ApiClient();
