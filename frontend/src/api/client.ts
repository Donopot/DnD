/** API client — parameterized fetch wrapper with AbortController timeout. */

const configuredApiBase = import.meta.env.VITE_API_URL ?? "";

/**
 * En production Docker/Nginx, l'API doit rester relative.
 * Le frontend sert /api/* via nginx.conf vers dnd-backend.
 * VITE_API_URL ne doit servir qu'en développement Vite local.
 */
export const API_BASE = import.meta.env.PROD ? "" : configuredApiBase;

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
  // Respect an external AbortSignal if provided (e.g. from a hook managing its own lifecycle).
  // When an external signal is passed, skip our own timeout controller so the caller
  // retains full abort control.
  const externalSignal = options.signal;
  const controller = externalSignal ? null : new AbortController();
  const timeout = controller
    ? window.setTimeout(() => controller.abort(), timeoutMs)
    : null;
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: externalSignal ?? controller!.signal,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
        ...options.headers,
      },
    });
  } catch (error) {
    if (!externalSignal && error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Le serveur ne répond pas. Réessaie dans quelques secondes.");
    }
    throw error;
  } finally {
    if (timeout !== null) window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Request failed" }));

    if (Array.isArray(body.detail)) {
      const message = body.detail
        .map((item: { msg?: string; loc?: string[] }) => {
          const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "";
          return field ? `${field}: ${item.msg ?? "Erreur de validation"}` : item.msg ?? "Erreur de validation";
        })
        .join(" · ");

      throw new Error(message || "Erreur de validation");
    }

    if (typeof body.detail === "string") {
      throw new Error(body.detail);
    }

    throw new Error("Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
