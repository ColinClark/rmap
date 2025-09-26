import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  tenantId?: string;
  tenantRole?: string;
  permissions?: string[];
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  register: (email: string, password: string, name: string, tenantName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for stored auth token and validate with backend
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          // Validate token with backend
          const response = await authAPI.me();
          if (response.user) {
            setUser({
              id: response.user.id,
              email: response.user.email,
              name: response.user.name,
              role: response.user.role,
              tenantId: response.user.tenantId,
              tenantRole: response.user.tenantRole,
              permissions: response.user.permissions || [],
            });
          }
        } catch (error) {
          console.error('Auth validation failed:', error);
          // Token is invalid, clear it
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, tenantId?: string) => {
    try {
      const response = await authAPI.login(email, password, tenantId);

      if (response.user) {
        setUser({
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          role: response.user.role,
          tenantId: response.user.tenantId,
          tenantRole: response.user.tenantRole,
          permissions: response.user.permissions || [],
        });

        // Navigate to dashboard after successful login
        navigate('/dashboard');
      } else {
        throw new Error('Login failed - no user data received');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Invalid credentials');
    }
  };

  const register = async (email: string, password: string, name: string, tenantName?: string) => {
    try {
      const response = await authAPI.register(email, password, name, tenantName);

      if (response.user) {
        setUser({
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          role: response.user.role,
          tenantId: response.user.tenantId,
          tenantRole: response.user.tenantRole,
          permissions: response.user.permissions || [],
        });

        // Navigate to dashboard after successful registration
        navigate('/dashboard');
      } else {
        throw new Error('Registration failed - no user data received');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user state and navigate to login regardless of API call result
      setUser(null);
      navigate('/login');
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const refreshAuth = async () => {
    try {
      const response = await authAPI.refresh();
      // Token is automatically stored by the API client
      // Optionally refresh user data
      const userResponse = await authAPI.me();
      if (userResponse.user) {
        setUser({
          id: userResponse.user.id,
          email: userResponse.user.email,
          name: userResponse.user.name,
          role: userResponse.user.role,
          tenantId: userResponse.user.tenantId,
          tenantRole: userResponse.user.tenantRole,
          permissions: userResponse.user.permissions || [],
        });
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Refresh failed, log out the user
      await logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};