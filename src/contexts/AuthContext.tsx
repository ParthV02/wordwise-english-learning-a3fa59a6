import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface UserData {
  name: string;
  email: string;
  password: string;
  avatar: string;
  wordsLearned: number;
  pronunciationAccuracy: number;
  weeklyQuizScore: number;
  wordsDueToday: number;
  currentStreak: number;
  longestStreak: number;
  wordBank: any[];
  quizHistory: any[];
  pronunciationLogs: any[];
  newsHistory: any[];
  joinDate: string;
  cefr: string;
}

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  login: (email: string, password: string) => string | null;
  register: (name: string, email: string, password: string) => string | null;
  loginWithGoogle: () => Promise<string | null>;
  completeGoogleSignIn: () => Promise<string | null>;
  requestPasswordReset: (email: string) => { error: string | null; code: string | null };
  verifyPasswordResetCode: (email: string, code: string) => string | null;
  resetPassword: (email: string, newPassword: string) => string | null;
  logout: () => void;
  updateUser: (updates: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function getAllUsers(): UserData[] {
  try {
    return JSON.parse(localStorage.getItem("wordwise_users") || "[]");
  } catch { return []; }
}

function saveAllUsers(users: UserData[]) {
  localStorage.setItem("wordwise_users", JSON.stringify(users));
}

interface PasswordResetRequest {
  email: string;
  code: string;
  expiresAt: number;
  verified: boolean;
}

function getAllPasswordResetRequests(): PasswordResetRequest[] {
  try {
    return JSON.parse(localStorage.getItem("wordwise_password_resets") || "[]");
  } catch {
    return [];
  }
}

function saveAllPasswordResetRequests(requests: PasswordResetRequest[]) {
  localStorage.setItem("wordwise_password_resets", JSON.stringify(requests));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const getAppBaseUrl = () => {
    const configured = import.meta.env.VITE_APP_URL as string | undefined;
    return configured?.trim() || window.location.origin;
  };

  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("wordwise_token");
    const u = localStorage.getItem("wordwise_user");
    if (t && u) {
      try {
        setToken(t);
        setUser(JSON.parse(u));
      } catch {
        localStorage.removeItem("wordwise_token");
        localStorage.removeItem("wordwise_user");
      }
    }
  }, []);

  const applyAuthState = (authUser: UserData, authToken: string) => {
    localStorage.setItem("wordwise_token", authToken);
    localStorage.setItem("wordwise_user", JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
  };

  const login = (email: string, password: string): string | null => {
    const users = getAllUsers();
    const found = users.find(u => u.email === email);
    if (!found) return "Invalid email or password";
    if (found.password !== password) return "Invalid email or password";
    const newToken = btoa(email + Date.now());
    localStorage.setItem("wordwise_token", newToken);
    localStorage.setItem("wordwise_user", JSON.stringify(found));
    setToken(newToken);
    setUser(found);
    return null;
  };

  const register = (name: string, email: string, password: string): string | null => {
    const users = getAllUsers();
    if (users.find(u => u.email === email)) return "Email is already registered";
    const newUser: UserData = {
      name, email, password,
      avatar: name.charAt(0).toUpperCase(),
      wordsLearned: 0,
      pronunciationAccuracy: 0,
      weeklyQuizScore: 0,
      wordsDueToday: 0,
      currentStreak: 0,
      longestStreak: 0,
      wordBank: [],
      quizHistory: [],
      pronunciationLogs: [],
      newsHistory: [],
      joinDate: new Date().toISOString().split("T")[0],
      cefr: "A2",
    };
    users.push(newUser);
    saveAllUsers(users);
    const newToken = btoa(email + Date.now());
    localStorage.setItem("wordwise_token", newToken);
    localStorage.setItem("wordwise_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return null;
  };

  const loginWithGoogle = async (): Promise<string | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.";
    }

    const redirectTo = `${getAppBaseUrl()}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error) {
      if (error.message.includes("requested path is invalid")) {
        return `OAuth redirect is invalid. Add ${redirectTo} in Supabase Authentication URL Configuration.`;
      }
      return error.message;
    }
    if (!data?.url) return "Could not start Google sign-in. Please try again.";
    window.location.assign(data.url);
    return null;
  };

  const completeGoogleSignIn = async (): Promise<string | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.";
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) return error.message;
    if (!data.session?.user) return "Google sign-in session not found. Try again.";

    const sessionUser = data.session.user;
    const email = sessionUser.email || "";
    if (!email) return "Google account email is missing.";

    const users = getAllUsers();
    let existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!existing) {
      const displayName =
        (sessionUser.user_metadata?.full_name as string | undefined) ||
        (sessionUser.user_metadata?.name as string | undefined) ||
        email.split("@")[0];

      existing = {
        name: displayName,
        email,
        password: "",
        avatar: displayName.charAt(0).toUpperCase(),
        wordsLearned: 0,
        pronunciationAccuracy: 0,
        weeklyQuizScore: 0,
        wordsDueToday: 0,
        currentStreak: 0,
        longestStreak: 0,
        wordBank: [],
        quizHistory: [],
        pronunciationLogs: [],
        newsHistory: [],
        joinDate: new Date().toISOString().split("T")[0],
        cefr: "A2",
      };
      users.push(existing);
      saveAllUsers(users);
    }

    applyAuthState(existing, data.session.access_token);
    return null;
  };

  const requestPasswordReset = (email: string): { error: string | null; code: string | null } => {
    const normalizedEmail = email.trim().toLowerCase();
    const users = getAllUsers();
    const foundUser = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!foundUser) return { error: "No account found with this email", code: null };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const requests = getAllPasswordResetRequests().filter(
      (request) => request.email.toLowerCase() !== normalizedEmail,
    );
    requests.push({ email: foundUser.email, code, expiresAt, verified: false });
    saveAllPasswordResetRequests(requests);
    return { error: null, code };
  };

  const verifyPasswordResetCode = (email: string, code: string): string | null => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();
    const requests = getAllPasswordResetRequests();
    const request = requests.find((item) => item.email.toLowerCase() === normalizedEmail);
    if (!request) return "Please request a verification code first";
    if (Date.now() > request.expiresAt) return "Verification code expired. Request a new one";
    if (request.code !== normalizedCode) return "Invalid verification code";

    request.verified = true;
    saveAllPasswordResetRequests(requests);
    return null;
  };

  const resetPassword = (email: string, newPassword: string): string | null => {
    const normalizedEmail = email.trim().toLowerCase();
    const requests = getAllPasswordResetRequests();
    const request = requests.find((item) => item.email.toLowerCase() === normalizedEmail);
    if (!request) return "Please request a verification code first";
    if (Date.now() > request.expiresAt) return "Verification code expired. Request a new one";
    if (!request.verified) return "Please verify the code before resetting password";

    const users = getAllUsers();
    const userIndex = users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);
    if (userIndex < 0) return "No account found with this email";

    users[userIndex] = { ...users[userIndex], password: newPassword };
    saveAllUsers(users);

    const cleanedRequests = requests.filter((item) => item.email.toLowerCase() !== normalizedEmail);
    saveAllPasswordResetRequests(cleanedRequests);

    return null;
  };

  const logout = () => {
    localStorage.removeItem("wordwise_token");
    localStorage.removeItem("wordwise_user");
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates: Partial<UserData>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem("wordwise_user", JSON.stringify(updated));
    const users = getAllUsers();
    const idx = users.findIndex(u => u.email === updated.email);
    if (idx >= 0) { users[idx] = updated; saveAllUsers(users); }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        loginWithGoogle,
        completeGoogleSignIn,
        requestPasswordReset,
        verifyPasswordResetCode,
        resetPassword,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
