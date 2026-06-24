import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { Profile } from "../types";

interface AuthResult {
  error?: string;
  message?: string;
}

interface AuthContextValue {
  user: User | { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (fullName: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

interface DemoAccount {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: "user" | "admin";
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const DEMO_ACCOUNTS_KEY = "darjana_demo_accounts";
const DEMO_SESSION_KEY = "darjana_demo_session";
const defaultAdmin: DemoAccount = {
  id: "demo-admin",
  email: "admin@darjana.local",
  password: "admin123",
  fullName: "Darjana Admin",
  role: "admin",
};

function getDemoAccounts(): DemoAccount[] {
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_ACCOUNTS_KEY) || "[]") as DemoAccount[];
    return saved.some((account) => account.email === defaultAdmin.email)
      ? saved
      : [defaultAdmin, ...saved];
  } catch {
    return [defaultAdmin];
  }
}

function toProfile(account: DemoAccount): Profile {
  return {
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSupabaseProfile = useCallback(async (authUser: User) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("id", authUser.id)
      .maybeSingle();

    setProfile({
      id: authUser.id,
      email: data?.email || authUser.email || "",
      fullName:
        data?.full_name ||
        String(authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Customer"),
      role: data?.role === "admin" ? "admin" : "user",
      createdAt: data?.created_at,
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const sessionId = localStorage.getItem(DEMO_SESSION_KEY);
      const account = getDemoAccounts().find((item) => item.id === sessionId) || null;
      setUser(account ? { id: account.id, email: account.email } : null);
      setProfile(account ? toProfile(account) : null);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const authUser = data.session?.user || null;
      setUser(authUser);
      if (authUser) await loadSupabaseProfile(authUser);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user || null;
      setUser(authUser);
      if (authUser) {
        void loadSupabaseProfile(authUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadSupabaseProfile]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!supabase) {
      const account = getDemoAccounts().find(
        (item) => item.email.toLowerCase() === normalizedEmail && item.password === password,
      );
      if (!account) return { error: "Email or password is incorrect." };
      localStorage.setItem(DEMO_SESSION_KEY, account.id);
      setUser({ id: account.id, email: account.email });
      setProfile(toProfile(account));
      return {};
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    return error ? { error: error.message } : {};
  }, []);

  const signUp = useCallback(
    async (fullName: string, email: string, password: string): Promise<AuthResult> => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!supabase) {
        const accounts = getDemoAccounts();
        if (accounts.some((item) => item.email.toLowerCase() === normalizedEmail)) {
          return { error: "An account with this email already exists." };
        }
        const account: DemoAccount = {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          password,
          fullName: fullName.trim(),
          role: "user",
        };
        const updated = [...accounts, account];
        localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(updated));
        localStorage.setItem(DEMO_SESSION_KEY, account.id);
        setUser({ id: account.id, email: account.email });
        setProfile(toProfile(account));
        return {};
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) return { error: error.message };
      return data.session
        ? {}
        : { message: "Check your email to confirm your account, then sign in." };
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      setProfile(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      isDemoMode: !isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [loading, profile, signIn, signOut, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
