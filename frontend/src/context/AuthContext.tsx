import React, { createContext, useState, useEffect } from 'react';
import { User, UserRole, AuthTokens } from '../types';
import { authApi } from '../api/auth';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserRole | null>;
  signupResident: (data: any) => Promise<boolean>;
  signupAdmin: (data: any) => Promise<boolean>;
  updateProfile: (data: { name?: string; phone?: string; address?: string; profile_image?: string }) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('gv_access_token');
      const savedUser = localStorage.getItem('gv_user');

      if (savedToken && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setTokens({
            accessToken: savedToken,
            refreshToken: localStorage.getItem('gv_refresh_token') || '',
          });
          // Verify with backend — if token is invalid, interceptor clears storage
          const data = await authApi.getMe();
          if (data) {
            setUser(data);
            localStorage.setItem('gv_user', JSON.stringify(data));
          }
        } catch {
          // Token invalid — interceptor already cleared localStorage and will redirect
          setUser(null);
          setTokens(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<UserRole | null> => {
    try {
      const data = await authApi.login(email, password);
      const { user: userData, tokens: tokenData } = data;

      setUser(userData);
      setTokens(tokenData);

      localStorage.setItem('gv_access_token', tokenData.accessToken);
      localStorage.setItem('gv_refresh_token', tokenData.refreshToken);
      localStorage.setItem('gv_user', JSON.stringify(userData));

      toast.success(`Welcome back, ${userData.name}!`);
      return userData.role as UserRole;
    } catch (e) {
      return null;
    }
  };

  const signupResident = async (dataInput: any): Promise<boolean> => {
    try {
      const data = await authApi.signupResident(dataInput);
      const { user: userData, tokens: tokenData } = data;

      setUser(userData);
      setTokens(tokenData);

      localStorage.setItem('gv_access_token', tokenData.accessToken);
      localStorage.setItem('gv_refresh_token', tokenData.refreshToken);
      localStorage.setItem('gv_user', JSON.stringify(userData));

      toast.success('Resident account created successfully!');
      return true;
    } catch (e) {
      return false;
    }
  };

  const signupAdmin = async (dataInput: any): Promise<boolean> => {
    try {
      const data = await authApi.signupAdmin(dataInput);
      const { user: userData, tokens: tokenData } = data;

      setUser(userData);
      setTokens(tokenData);

      localStorage.setItem('gv_access_token', tokenData.accessToken);
      localStorage.setItem('gv_refresh_token', tokenData.refreshToken);
      localStorage.setItem('gv_user', JSON.stringify(userData));

      toast.success('Municipal Admin account created successfully!');
      return true;
    } catch (e) {
      return false;
    }
  };

  const updateProfile = async (data: {
    name?: string;
    phone?: string;
    address?: string;
    profile_image?: string;
  }): Promise<boolean> => {
    try {
      const updatedUser = await authApi.updateProfile(data);
      setUser(updatedUser);
      localStorage.setItem('gv_user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully!');
      return true;
    } catch (e) {
      toast.error('Failed to update profile.');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('gv_access_token');
    localStorage.removeItem('gv_refresh_token');
    localStorage.removeItem('gv_user');
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        tokens,
        isAuthenticated: !!user,
        isLoading,
        login,
        signupResident,
        signupAdmin,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
