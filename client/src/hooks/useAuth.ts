import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, isAuthenticated } from '../services/auth';

export function useAuth() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState<boolean>(() => isAuthenticated());

  const handleLogin = useCallback(() => {
    setLoggedIn(true);
    navigate('/dashboard');
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    setLoggedIn(false);
    navigate('/');
  }, [navigate]);

  return { loggedIn, handleLogin, handleLogout };
}