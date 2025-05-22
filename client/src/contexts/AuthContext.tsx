import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';

// User object type definition 
interface User {
  id: number;
  username?: string;
  email: string;
  fullName?: string;
  role: 'doctor' | 'patient' | 'admin';
}

// Authentication context interface
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Create context with a default value
const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook for easy context consumption
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Authentication provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get('/api/user', { withCredentials: true });
        setUser(response.data);
      } catch (err) {
        // User is not logged in, this is not an error
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await axios.post('/api/login', { email, password }, { withCredentials: true });
      setUser(response.data);
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Invalid email or password');
      } else {
        setError('An error occurred during login. Please try again.');
      }
      throw err;
    }
  };

  // Register function
  const register = async (data: any) => {
    try {
      setError(null);
      const response = await axios.post('/api/register', data, { withCredentials: true });
      setUser(response.data);
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Registration failed');
      } else {
        setError('An error occurred during registration. Please try again.');
      }
      throw err;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.post('/api/logout', {}, { withCredentials: true });
      setUser(null);
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Logout failed');
      } else {
        setError('An error occurred during logout. Please try again.');
      }
      throw err;
    }
  };

  // Clear error state
  const clearError = () => {
    setError(null);
  };

  // Provide the authentication context
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;