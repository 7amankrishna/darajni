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
import { supabase } from "../lib/supabase";
import { AccountStatus, Profile, ProfileInput } from "../types";

interface AuthResult {
  error?: string;
  message?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  adminUsers: Profile[];
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (fullName: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<string | null>;
  updateProfile: (input: ProfileInput) => Promise<string | null>;
  refreshAdminUsers: () => Promise<string | null>;
  moderateUser: (
    userId: string,
    status: AccountStatus,
    message: string,
  ) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapProfile(row: Record<string, unknown>, fallbackEmail = ""): Profile {
  return {
    id: String(row.id),
    email: String(row.email || fallbackEmail),
    fullName: String(row.full_name || "Customer"),
    role: row.role === "admin" ? "admin" : "user",
    phone: String(row.phone || ""),
    addressLine1: String(row.address_line_1 || ""),
    addressLine2: String(row.address_line_2 || ""),
    city: String(row.city || ""),
    state: String(row.state || ""),
    postalCode: String(row.postal_code || ""),
    accountStatus: (row.account_status as AccountStatus) || "active",
    moderationMessage: row.moderation_message ? String(row.moderation_message) : null,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

const profileColumns =
  "id, email, full_name, role, phone, address_line_1, address_line_2, city, state, postal_code, account_status, moderation_message, created_at, updated_at";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [adminUsers, setAdminUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfileForUser = useCallback(async (authUser: User) => {
    if (!supabase) return "Supabase is not configured.";
    const { data, error } = await supabase
      .from("profiles")
      .select(profileColumns)
      .eq("id", authUser.id)
      .maybeSingle();
    if (error) return error.message;
    if (!data) return "Your profile record could not be found.";
    setProfile(mapProfile(data, authUser.email || ""));
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return "Please sign in.";
    return loadProfileForUser(user);
  }, [loadProfileForUser, user]);

  const refreshAdminUsers = useCallback(async () => {
    if (!supabase) return "Supabase is not configured.";
    const { data, error } = await supabase
      .from("profiles")
      .select(profileColumns)
      .order("created_at", { ascending: false });
    if (error) return error.message;
    setAdminUsers((data || []).map((row) => mapProfile(row)));
    return null;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const authUser = data.session?.user || null;
      setUser(authUser);
      if (authUser) await loadProfileForUser(authUser);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user || null;
      setUser(authUser);
      if (authUser) {
        void loadProfileForUser(authUser);
      } else {
        setProfile(null);
        setAdminUsers([]);
      }
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfileForUser]);

  useEffect(() => {
    if (profile?.role === "admin") void refreshAdminUsers();
    else setAdminUsers([]);
  }, [profile?.role, refreshAdminUsers]);

  useEffect(() => {
    if (!user) return;
    const refreshOnFocus = () => void loadProfileForUser(user);
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [loadProfileForUser, user]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "This application has not been deployed with Supabase." };
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return error ? { error: error.message } : {};
  }, []);

  const signUp = useCallback(
    async (fullName: string, email: string, password: string): Promise<AuthResult> => {
      if (!supabase) return { error: "This application has not been deployed with Supabase." };
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
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
    if (supabase) await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback(
    async (input: ProfileInput) => {
      if (!supabase || !user) return "Please sign in.";
      if (profile?.accountStatus === "blocked") return "This account is blocked.";
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: input.fullName.trim(),
          phone: input.phone.trim(),
          address_line_1: input.addressLine1.trim(),
          address_line_2: input.addressLine2.trim(),
          city: input.city.trim(),
          state: input.state.trim(),
          postal_code: input.postalCode.trim(),
        })
        .eq("id", user.id)
        .select("id")
        .maybeSingle();
      if (error) return error.message;
      if (!data) return "Your account is not permitted to update profile details.";
      return loadProfileForUser(user);
    },
    [loadProfileForUser, profile?.accountStatus, user],
  );

  const moderateUser = useCallback(
    async (userId: string, status: AccountStatus, message: string) => {
      if (!supabase || profile?.role !== "admin") return "Administrator access is required.";
      if (userId === user?.id) return "You cannot moderate your own administrator account.";
      if (status !== "active" && !message.trim()) {
        return "Add a private message explaining this moderation action.";
      }
      const { data, error } = await supabase
        .from("profiles")
        .update({
          account_status: status,
          moderation_message: status === "active" ? null : message.trim(),
          moderated_at: new Date().toISOString(),
          moderated_by: user?.id,
        })
        .eq("id", userId)
        .eq("role", "user")
        .select("id")
        .maybeSingle();
      if (error) return error.message;
      if (!data) return "No customer account was updated.";
      return refreshAdminUsers();
    },
    [profile?.role, refreshAdminUsers, user?.id],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      adminUsers,
      loading,
      isAdmin: profile?.role === "admin",
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
      refreshAdminUsers,
      moderateUser,
    }),
    [
      adminUsers,
      loading,
      moderateUser,
      profile,
      refreshAdminUsers,
      refreshProfile,
      signIn,
      signOut,
      signUp,
      updateProfile,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
