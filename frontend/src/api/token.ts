/** Safe auth token accessor. Returns empty string when not set (e.g. SSR). */
export function getAuthToken(): string {
  try {
    return localStorage.getItem("dnd_access_token") ?? "";
  } catch {
    return "";
  }
}
