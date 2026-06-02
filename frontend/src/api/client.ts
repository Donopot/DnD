/** API client — parameterized fetch wrapper with AbortController timeout. */

export const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function authHeaders(token: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const DEFAULT_TIMEOUT_MS = 12_000;

export async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Le serveur ne répond pas. Réessaie dans quelques secondes.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(body.detail ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
