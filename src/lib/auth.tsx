import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./pricing";

type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  business_name: string;
  phone: string;
  gstin: string;
  city: string;
};

type AuthState = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: Profile | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const ROLE_RANK: Record<AppRole, number> = { admin: 1, dealer: 2, retailer: 3 };

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function loadUserData(uid: string | undefined) {
    if (!uid) {
      setRole(null);
      setProfile(null);
      return;
    }
    const [{ data: roles }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    ]);
    const best = (roles ?? [])
      .map((r) => r.role as AppRole)
      .sort((a, b) => ROLE_RANK[a] - ROLE_RANK[b])[0];
    setRole(best ?? "retailer");
    setProfile((prof as Profile | null) ?? null);
  }

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Defer DB calls out of the auth callback.
        setTimeout(() => {
          void loadUserData(s?.user.id);
          router.invalidate();
          if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
        }, 0);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadUserData(data.session?.user.id);
      if (active) setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthState = {
    ready,
    session,
    user: session?.user ?? null,
    role,
    profile,
    refresh: () => loadUserData(session?.user.id),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
