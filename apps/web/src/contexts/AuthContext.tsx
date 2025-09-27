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
  isAuthenticated: boolean;
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

// Helper function to decode JWT and check expiry
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expiryTime;
  } catch {
    return true; // If we can't decode, assume expired
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [tokenCheckInterval, setTokenCheckInterval] = useState<NodeJS.Timeout | null>(null);

  // Function to check token expiry
  const checkTokenExpiry = () => {
    const token = localStorage.getItem('accessToken');
    if (token && isTokenExpired(token)) {
      console.log('Token expired, logging out...');
      logout('token-expired');
    }
  };

  useEffect(() => {
    // Check for stored auth token and validate with backend
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Check if token is expired before making API call
        if (isTokenExpired(token)) {
          console.log('Stored token is expired');
          logout('token-expired');
          setLoading(false);
          return;
        }

        try {
          // Validate token with backend
          const response = await authAPI.me();
          if (response.user) {
            setUser({
              id: response.user.id,
              email: response.user.email,
              name: response.user.name,
              role: response.tenant?.role,
              tenantId: response.tenant?.id,
              tenantRole: response.tenant?.role,
              permissions: response.tenant?.permissions || [],
            });

            // Start token expiry checking interval
            const interval = setInterval(checkTokenExpiry, 60000); // Check every minute
            setTokenCheckInterval(interval);
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

    // Cleanup interval on unmount
    return () => {
      if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
      }
    };
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

        // Start token expiry checking interval
        if (tokenCheckInterval) {
          clearInterval(tokenCheckInterval);
        }
        const interval = setInterval(checkTokenExpiry, 60000); // Check every minute
        setTokenCheckInterval(interval);

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

        // Start token expiry checking interval
        if (tokenCheckInterval) {
          clearInterval(tokenCheckInterval);
        }
        const interval = setInterval(checkTokenExpiry, 60000); // Check every minute
        setTokenCheckInterval(interval);

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

  const logout = async (reason?: string) => {
    try {
      // Only call API logout if we have a valid token
      const token = localStorage.getItem('accessToken');
      if (token && !isTokenExpired(token)) {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user state and tokens
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('tenantId');
      sessionStorage.clear();

      // Clear the interval
      if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
        setTokenCheckInterval(null);
      }

      // Navigate to login with reason if provided
      if (reason === 'token-expired') {
        navigate('/login?message=Session expired. Please login again.');
      } else {
        navigate('/login');
      }
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
          role: userResponse.tenant?.role,
          tenantId: userResponse.tenant?.id,
          tenantRole: userResponse.tenant?.role,
          permissions: userResponse.tenant?.permissions || [],
        });
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Refresh failed, log out the user
      await logout();
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, register, logout, updateUser, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};