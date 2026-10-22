import { useState } from 'react';

export function useAuth() {
  const [user] = useState<any>({
    uid: localStorage.getItem('userId') || 'guest_' + Math.random().toString(36).substring(2, 9),
    isAnonymous: true,
  });
  const [loading] = useState(false);

  const refreshUser = () => {};

  return { user, loading, refreshUser };
}
