import { useCallback, useEffect, useState } from "react";
import type { User } from "../api/types";
import { apiRequest } from "../api/client";

const TOKEN_STORAGE_KEY = "dnd_access_token";

export interface UseAuthSessionReturn {
  token: string;
  user: User | null;
  isAuthenticated: boolean;
  login: (accessToken: string, user?: User) => void;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export function useAuthSession(): UseAuthSessionReturn {
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_STORAGE_KEY) ?? "",
  );
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((accessToken: string, u?: User) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    setToken(accessToken);
    if (u) setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    setUser(null);
  }, []);

  // Bootstrap on cold start (existing token in localStorage, no user yet)
  useEffect(() => {
    if (!token || user) return;
    void (async () => {
      try {
        const me = await apiRequest<User>("/api/auth/me", token);
        setUser(me);
      } catch {
        logout();
      }
    })();
  }, [token, user, logout]);

  return {
    token,
    user,
    isAuthenticated: !!user,
    login,
    logout,
    setUser,
  };
}
