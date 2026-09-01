"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api-client";
import type { SelfUser } from "@/lib/dto";

type SessionValue = {
  user: SelfUser | null;
  setUser: (user: SelfUser | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  initialUser,
  children,
}: {
  initialUser: SelfUser | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<SelfUser | null>(initialUser);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.get<{ user: SelfUser }>("/api/auth/me");
      setUser(user);
    } catch {
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, refresh, logout }),
    [user, refresh, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
