import { useEffect, useState } from "react";
import { getToken, me as apiMe, setToken } from "../api";
import type { AuthUser } from "../types";

/** 인증 상태 관리 — 토큰 검증/로그인/로그아웃. */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }
    apiMe()
      .then(setUser)
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  function onAuthed(token: string, u: AuthUser) {
    setToken(token);
    setUser(u);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return { user, ready, onAuthed, logout };
}
