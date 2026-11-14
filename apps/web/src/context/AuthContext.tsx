import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";

interface AuthContextValue {
  authenticated: boolean;
  email: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMe()
      .then((res) => {
        setAuthenticated(res.authenticated);
        setEmail(res.email);
      })
      .catch(() => {
        setAuthenticated(false);
        setEmail(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (userEmail: string, password: string) => {
    const res = await api.login({ email: userEmail, password });
    setAuthenticated(res.authenticated);
    setEmail(res.email);
  };

  const logout = async () => {
    await api.logout();
    setAuthenticated(false);
    setEmail(null);
  };

  return (
    <AuthContext.Provider
      value={{ authenticated, email, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
