import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppMode = 'junior' | 'standard' | 'classic';

interface ThemeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isFirstLaunch: boolean;
  completeOnboarding: () => void;
  isOffline: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [mode, setModeState] = useState<AppMode>(() => {
    return (localStorage.getItem('app-mode') as AppMode) || 'standard';
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [isFirstLaunch, setIsFirstLaunch] = useState(() => {
    return !localStorage.getItem('onboarding-complete');
  });

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem('app-mode', newMode);
    document.documentElement.setAttribute('data-theme', newMode);
  };

  const completeOnboarding = () => {
    setIsFirstLaunch(false);
    localStorage.setItem('onboarding-complete', 'true');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, isFirstLaunch, completeOnboarding, isOffline }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};
