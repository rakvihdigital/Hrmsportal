// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    const userRole = localStorage.getItem('user_role');
    const userName = localStorage.getItem('user_name');
    const userEmail = localStorage.getItem('user_email');

    if (userId) {
      setUser({
        id: userId,
        role: userRole,
        name: userName,
        email: userEmail
      });
    }
    setLoading(false);
  }, []);

  return { user, loading };
}