'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@supabase/supabase-js';
import { UserRole, Profile, College, FestSettings } from '../types/fest';
import { festService } from '../services/festService';

interface FestContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentProfile: Profile;
  currentCollegeId: string;
  setCurrentCollegeId: (id: string) => void;
  currentCollegeAfflNo: number;
  setCurrentCollegeAfflNo: (afflNo: number) => void;
  festSettings: FestSettings;
  refreshKey: number;
  triggerRefresh: () => void;
  resetDatabase: () => void;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [festSettings, setFestSettings] = useState<FestSettings>(() => festService.getFestSettings());
  const [currentProfile, setCurrentProfile] = useState<Profile>(() => festService.getProfileByRole('college'));
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Sync with live Supabase if available (college scoped if college role)
    const scopeAffl = currentRole === 'college' ? currentCollegeAfflNo : undefined;
    festService.syncWithSupabase(scopeAffl).then(connected => {
      setIsSupabaseConnected(connected);
      if (connected) {
        setFestSettings(festService.getFestSettings());
        setRefreshKey(prev => prev + 1);
      }
    });

    // Subscribe to live Realtime updates via WebSockets (eliminates polling)
    const unsubscribeRealtime = festService.subscribeToRealtimeChanges(() => {
      triggerRefresh();
    });

    // ── Strict Supabase Auth Session Check ──────────────────────────────────
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      if (!supabase) {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      // Load initial authenticated user session
      supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: AuthUser | null } }) => {
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, college_affl_no')
            .eq('id', user.id)
            .maybeSingle();

          const role = (profile?.role as UserRole) || (user.user_metadata?.role as UserRole) || 'college';
          const afflNo = profile?.college_affl_no || user.user_metadata?.college_affl_no;

          setCurrentRoleState(role);
          setIsAuthenticated(true);
          if (afflNo) {
            setCurrentCollegeAfflNoState(afflNo);
            setCurrentCollegeIdState(`col-${afflNo}`);
          }
        } else {
          setIsAuthenticated(false);
        }
        setIsLoadingAuth(false);
      });

      // Subscribe to Supabase Auth State Changes (login, logout, token refresh)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
        if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setCurrentRoleState('college');
          setCurrentCollegeAfflNoState(11);
          setCurrentCollegeIdState('col-11');
        }
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, college_affl_no')
            .eq('id', session.user.id)
            .maybeSingle();

          const role = (profile?.role as UserRole) || (session.user.user_metadata?.role as UserRole) || 'college';
          const afflNo = profile?.college_affl_no || session.user.user_metadata?.college_affl_no;

          setCurrentRoleState(role);
          setIsAuthenticated(true);
          if (afflNo) {
            setCurrentCollegeAfflNoState(afflNo);
            setCurrentCollegeIdState(`col-${afflNo}`);
          }
        }
      });

      return () => { subscription.unsubscribe(); };
    });
    // ── End auth session check ─────────────────────────────────────────────

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
    setCurrentProfile(festService.getProfileByRole(currentRole));
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

  const resetDatabase = () => {
    festService.resetToDefaults();
    triggerRefresh();
  };

  return (
    <FestContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        currentProfile,
        currentCollegeId,
        setCurrentCollegeId,
        currentCollegeAfflNo,
        setCurrentCollegeAfflNo,
        festSettings,
        refreshKey,
        triggerRefresh,
        resetDatabase,
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
