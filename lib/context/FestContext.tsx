'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@supabase/supabase-js';
import { UserRole, FestSettings } from '../types/fest';
import { festService } from '../services/festService';
import { createClient } from '@/lib/supabase/client';

interface FestContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentCollegeId: string;
  setCurrentCollegeId: (id: string) => void;
  currentCollegeAfflNo: number;
  setCurrentCollegeAfflNo: (afflNo: number) => void;
  festSettings: FestSettings;
  refreshKey: number;
  triggerRefresh: () => void;
  isSupabaseConnected: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  signOut: () => Promise<void>;
}

const FestContext = createContext<FestContextType | undefined>(undefined);

export function FestProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRoleState] = useState<UserRole>('college');
  const [currentCollegeId, setCurrentCollegeIdState] = useState<string>('col-11');
  const [currentCollegeAfflNo, setCurrentCollegeAfflNoState] = useState<number>(11);
  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [festSettings, setFestSettings] = useState<FestSettings>(() => festService.getFestSettings());
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');

  const isAuthenticatedRef = React.useRef<boolean>(false);
  const setIsAuthenticated = (auth: boolean) => {
    isAuthenticatedRef.current = auth;
    setIsAuthenticatedState(auth);
  };

  useEffect(() => {
    // Subscribe to live Realtime updates via WebSockets
    const unsubscribeRealtime = festService.subscribeToRealtimeChanges(() => {
      triggerRefresh();
    });

    const supabase = createClient();
    if (!supabase) {
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      return () => { unsubscribeRealtime(); };
    }

    let authSubscription: { unsubscribe: () => void } | null = null;

    // Load initial authenticated user session
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: AuthUser | null } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, college_affl_no')
          .eq('id', user.id)
          .maybeSingle();

        const role = profile?.role as UserRole | undefined;
        const afflNo = profile?.college_affl_no;

        if (role === 'admin') {
          setCurrentRoleState('admin');
          const connected = await festService.syncWithSupabase(undefined, true);
          setIsSupabaseConnected(connected);
          if (connected) {
            setFestSettings(festService.getFestSettings());
            setRefreshKey(prev => prev + 1);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } else if (role === 'college' && afflNo) {
          setCurrentRoleState('college');
          setCurrentCollegeAfflNoState(afflNo);
          setCurrentCollegeIdState(`col-${afflNo}`);
          const connected = await festService.syncWithSupabase(afflNo, true);
          setIsSupabaseConnected(connected);
          if (connected) {
            setFestSettings(festService.getFestSettings());
            setRefreshKey(prev => prev + 1);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } else {
          console.warn('[FestContext] User profile missing or college affiliation not assigned');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
        const connected = await festService.syncWithSupabase(undefined, false);
        setIsSupabaseConnected(connected);
      }
      setIsLoadingAuth(false);
    });

    // Subscribe to Supabase Auth State Changes (login, logout, token refresh, window focus)
    const { data } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setCurrentRoleState('college');
        setCurrentCollegeAfflNoState(11);
        setCurrentCollegeIdState('col-11');
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const isFreshLogin = !isAuthenticatedRef.current;
        if (isFreshLogin) {
          setIsLoadingAuth(true);
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, college_affl_no')
          .eq('id', session.user.id)
          .maybeSingle();

        const role = profile?.role as UserRole | undefined;
        const afflNo = profile?.college_affl_no;

        if (role === 'admin') {
          setCurrentRoleState('admin');
          const connected = await festService.syncWithSupabase(undefined, isFreshLogin);
          setIsSupabaseConnected(connected);
          if (connected) {
            setFestSettings(festService.getFestSettings());
            if (isFreshLogin) setRefreshKey(prev => prev + 1);
            setIsAuthenticated(true);
          } else {
            if (isFreshLogin) setIsAuthenticated(false);
          }
        } else if (role === 'college' && afflNo) {
          setCurrentRoleState('college');
          setCurrentCollegeAfflNoState(afflNo);
          setCurrentCollegeIdState(`col-${afflNo}`);
          const connected = await festService.syncWithSupabase(afflNo, isFreshLogin);
          setIsSupabaseConnected(connected);
          if (connected) {
            setFestSettings(festService.getFestSettings());
            if (isFreshLogin) setRefreshKey(prev => prev + 1);
            setIsAuthenticated(true);
          } else {
            if (isFreshLogin) setIsAuthenticated(false);
          }
        } else {
          console.warn('[FestContext] User profile missing or college affiliation not assigned');
          setIsAuthenticated(false);
        }
        if (isFreshLogin) {
          setIsLoadingAuth(false);
        }
      }
    });

    if (data?.subscription) {
      authSubscription = data.subscription;
    }

    // Theme init
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('arts_fest_theme') as 'light' | 'dark' | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
        applyThemeClass(savedTheme);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initial = prefersDark ? 'dark' : 'light';
        setThemeState(initial);
        applyThemeClass(initial);
      }
    }

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      unsubscribeRealtime();
    };
  }, []);

  const applyThemeClass = (t: 'light' | 'dark') => {
    if (typeof document !== 'undefined') {
      if (t === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    applyThemeClass(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('arts_fest_theme', newTheme);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  useEffect(() => {
    setFestSettings(festService.getFestSettings());
  }, [currentRole, refreshKey]);

  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('arts_fest_active_role', role);
      document.cookie = `arts_fest_active_role=${role}; path=/; max-age=86400; SameSite=Lax`;
    }
  };

  const signOut = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Proceed even if Supabase signout fails
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('arts_fest_active_role');
      localStorage.removeItem('arts_fest_active_affl_no');
      document.cookie = 'arts_fest_active_role=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'arts_fest_active_affl_no=; path=/; max-age=0; SameSite=Lax';
    }
    setIsAuthenticated(false);
  };

  const setCurrentCollegeId = (colId: string) => {
    setCurrentCollegeIdState(colId);
    const col = festService.getCollege(colId);
    if (col) {
      setCurrentCollegeAfflNo(col.affl_no);
    }
  };

  const setCurrentCollegeAfflNo = (afflNo: number) => {
    setCurrentCollegeAfflNoState(afflNo);
    setCurrentCollegeIdState(`col-${afflNo}`);
    if (typeof window !== 'undefined') {
      localStorage.setItem('arts_fest_active_affl_no', afflNo.toString());
      document.cookie = `arts_fest_active_affl_no=${afflNo}; path=/; max-age=86400; SameSite=Lax`;
    }
  };

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setFestSettings(festService.getFestSettings());
  };

  return (
    <FestContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        currentCollegeId,
        setCurrentCollegeId,
        currentCollegeAfflNo,
        setCurrentCollegeAfflNo,
        festSettings,
        refreshKey,
        triggerRefresh,
        isSupabaseConnected,
        isAuthenticated,
        isLoadingAuth,
        theme,
        setTheme,
        toggleTheme,
        signOut
      }}
    >
      {children}
    </FestContext.Provider>
  );
}

export function useFest() {
  const context = useContext(FestContext);
  if (!context) {
    throw new Error('useFest must be used within a FestProvider');
  }
  return context;
}
