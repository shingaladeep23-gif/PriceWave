import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService, userService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const profile = await userService.getProfile();
          localStorage.setItem('userId', profile.id);
          setUser(profile);
        } catch (error) {
          console.error("Auth initialization failed", error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    localStorage.setItem('token', data.access_token);
    const profile = await userService.getProfile();
    localStorage.setItem('userId', profile.id);
    setUser(profile);
    return profile;
  };

  const loginWithGoogle = async (credential) => {
    const data = await authService.googleLogin(credential);
    localStorage.setItem('token', data.access_token);
    const profile = await userService.getProfile();
    localStorage.setItem('userId', profile.id);
    setUser(profile);
    return profile;
  };

  const register = async (userData) => {
    return await authService.register(userData);
  };

  const refreshProfile = async () => {
    try {
      const profile = await userService.getProfile();
      setUser(profile);
    } catch { }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, register, logout, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
