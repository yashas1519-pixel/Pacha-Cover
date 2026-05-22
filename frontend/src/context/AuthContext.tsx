import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface GoogleUser {
  name: string;
  given_name?: string;
  email: string;
  picture?: string;
}

interface AuthContextType {
  user: GoogleUser | null;
  token: string | null;
  login: (googleUser: GoogleUser, credential: string) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(() => {
    try {
      const saved = localStorage.getItem('pacha_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pacha_token') || null);

  const login = (googleUser: GoogleUser, credential: string) => {
    setUser(googleUser);
    setToken(credential);
    localStorage.setItem('pacha_user', JSON.stringify(googleUser));
    localStorage.setItem('pacha_token', credential);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pacha_user');
    localStorage.removeItem('pacha_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
