/**
 * localStorage versioning — prevents stale/corrupt data across deployments.
 *
 * Increment CURRENT_VERSION when a breaking change is made to any stored
 * schema (panel layouts, macros, viewport format, template shapes, etc.).
 *
 * On version mismatch, all dnd_* keys EXCEPT dnd_access_token are cleared.
 */

const VERSION_KEY = "dnd_storage_version";

/** Bump this when stored data format changes in a backward-incompatible way. */
export const CURRENT_VERSION = 1;

/**
 * Ensure stored version matches CURRENT_VERSION.
 * Call once at app bootstrap.
 *
 * @returns true if a migration occurred (data was cleared).
 */
export function ensureStorageVersion(): boolean {
  const stored = localStorage.getItem(VERSION_KEY);
  const storedVersion = stored ? Number(stored) : 0;

  if (storedVersion === CURRENT_VERSION) return false;

  // Preserve auth token across migrations
  const token = localStorage.getItem("dnd_access_token");

  // Clear all dnd_* keys except the auth token
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("dnd_") && key !== "dnd_access_token") {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  // Restore token and set new version
  if (token) localStorage.setItem("dnd_access_token", token);
  localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));

  return true;
}
