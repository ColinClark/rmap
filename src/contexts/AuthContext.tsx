import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  permissions: string[];
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
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
    // Check for stored auth token
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // In production, validate token with backend
          const mockUser: User = {
            id: '1',
            email: 'user@example.com',
            name: 'John Doe',
            role: 'admin',
            permissions: [
              'retail_media',
              'google_ads',
              'meta_ads',
              'linkedin_ads',
              'analytics',
              'admin'
            ],
          };
          setUser(mockUser);
        } catch (error) {
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // In production, call backend API
      // For demo, simulate login
      if (email && password) {
        const mockUser: User = {
          id: '1',
          email,
          name: email.split('@')[0],
          role: email.includes('admin') ? 'admin' : 'user',
          permissions: [
            'retail_media',
            'google_ads',
            'meta_ads',
            'linkedin_ads',
            'analytics'
          ],
        };
        
        localStorage.setItem('authToken', 'mock-jwt-token');
        setUser(mockUser);
        navigate('/dashboard');
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      // In production, call backend API
      const mockUser: User = {
        id: Date.now().toString(),
        email,
        name,
        role: 'user',
        permissions: ['retail_media', 'analytics'],
      };
      
      localStorage.setItem('authToken', 'mock-jwt-token');
      setUser(mockUser);
      navigate('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    navigate('/login');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};