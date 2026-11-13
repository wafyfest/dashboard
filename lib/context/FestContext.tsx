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
  timeTick: number;
  refreshKey: number;
  triggerRefresh: () => void;
  isSupabaseConnected: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  refreshSessionAndSync: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const FestContext = createContext<FestContextType | undefined>(undefined);

function isStudentRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  return p === '/student' || p.startsWith('/student/') || p === '/student-login';
}

function readStudentSessionFromStorage(): { afflNo: number } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('arts_fest_student_session');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.id || parsed.cic_no)) {
      const afflNo =
        parsed.college_affl_no !== undefined &&
        parsed.college_affl_no !== null &&
        parsed.college_affl_no !== ''
          ? Number(parsed.college_affl_no)
          : 0;
      return { afflNo: Number.isFinite(afflNo) ? afflNo : 0 };
    }
  } catch {
    // Ignore malformed student session
  }
  return null;
}

export function FestProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRoleState] = useState<UserRole>('student');
  const [currentCollegeAfflNo, setCurrentCollegeAfflNoState] = useState<number>(0);
  const [currentCollegeId, setCurrentCollegeIdState] = useState<string>('');
  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(false);

  // Hydrate role/college/auth state from localStorage after mount to avoid SSR hydration mismatches.
  useEffect(() => {
    try {
      const studentRoute = isStudentRoute();
      const studentSessionRaw = localStorage.getItem('arts_fest_student_session');
      const savedRole = localStorage.getItem('arts_fest_active_role');
      const savedAffl = localStorage.getItem('arts_fest_active_affl_no');

      if (studentRoute && studentSessionRaw) {
        setCurrentRoleState('student');
      } else if (savedRole) {
        setCurrentRoleState(savedRole as UserRole);
      }

      if (studentRoute) {
        const studentSession = readStudentSessionFromStorage();
        if (studentSession) {
          setCurrentCollegeAfflNoState(studentSession.afflNo);
          setCurrentCollegeIdState(studentSession.afflNo > 0 ? `col-${studentSession.afflNo}` : '');
        } else if (savedAffl) {
          setCurrentCollegeAfflNoState(Number(savedAffl));
          setCurrentCollegeIdState(`col-${savedAffl}`);
        }
      } else if (savedAffl) {
        setCurrentCollegeAfflNoState(Number(savedAffl));
        setCurrentCollegeIdState(`col-${savedAffl}`);
      }

      if (studentSessionRaw || savedRole) {
        setIsAuthenticatedState(true);
      }
    } catch {}
  }, []);

  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [festSettings, setFestSettings] = useState<FestSettings>(() => festService.getFestSettings());
  const [timeTick, setTimeTick] = useState<number>(() => Date.now());
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');

  const isAuthenticatedRef = React.useRef<boolean>(false);
  const currentCollegeAfflNoRef = React.useRef<number>(currentCollegeAfflNo);
  const setIsAuthenticated = (auth: boolean) => {
    isAuthenticatedRef.current = auth;
    setIsAuthenticatedState(auth);
  };

  useEffect(() => {
    currentCollegeAfflNoRef.current = currentCollegeAfflNo;
  }, [currentCollegeAfflNo]);

  // 1. Live Heartbeat (every 10s): automatically updates countdowns, deadline tiers (Normal -> Fine -> Super Fine -> Locked) without page reload
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 2. Cross-tab BroadcastChannel & Storage Event Listeners for Instant Multi-Window Synchronization
  useEffect(() => {
    const applyFreshSettings = () => {
      const fresh = festService.getFestSettings();
      setFestSettings(fresh);
      setRefreshKey(prev => prev + 1);
    };

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('wsf_settings_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'SETTINGS_UPDATED') {
            applyFreshSettings();
          }
        };
      } catch {}
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'festSettings' || e.key === 'fest_settings') {
        applyFreshSettings();
      }
    };

    const handleCustomEvent = () => {
      applyFreshSettings();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
      window.addEventListener('wsf_settings_updated', handleCustomEvent);
    }

    return () => {
      if (bc) bc.close();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('wsf_settings_updated', handleCustomEvent);
      }
    };
  }, []);

  // 3. Fallback background sync (every 15s) so that if Supabase Realtime WebSockets drop/reset (net::ERR_CONNECTION_RESET),
  // settings and deadlines are guaranteed to stay up-to-date across all clients within 15 seconds
  useEffect(() => {
    const pollTimer = setInterval(() => {
      const scopedAffl = currentCollegeAfflNoRef.current || undefined;
      festService.syncWithSupabase(scopedAffl, false).then(connected => {
        if (connected) {
          const fresh = festService.getFestSettings();
          setFestSettings(fresh);
          setRefreshKey(prev => prev + 1);
        }
      });
    }, 15000);

    return () => clearInterval(pollTimer);
  }, []);

  const resolveUserAndSync = React.useCallback(async (
    supabaseClient: NonNullable<ReturnType<typeof createClient>>,
    user: AuthUser,
    forceSync: boolean,
    updateRefresh: boolean = true
  ): Promise<boolean> => {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (accessToken && supabaseClient.realtime?.setAuth) {
      supabaseClient.realtime.setAuth(accessToken);
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, college_affl_no')
      .eq('id', user.id)
      .maybeSingle();

    let role = profile?.role as UserRole | undefined;
    let afflNo: number | null | undefined = profile?.college_affl_no;

    if ((!role || !afflNo) && user.email) {
      const { data: matchedCollege } = await supabaseClient
        .from('colleges')
        .select('affl_no')
        .eq('email', user.email.trim().toLowerCase())
        .maybeSingle();
      if (matchedCollege?.affl_no) {
        afflNo = matchedCollege.affl_no;
        if (!role) role = 'college';
      }
    }

    if (role === 'admin' || role === 'convenor' || role === 'stage_controller' || role === 'result_entry') {
      setCurrentRoleState(role);
      currentCollegeAfflNoRef.current = 0;
      const connected = await festService.syncWithSupabase(undefined, forceSync);
      setIsSupabaseConnected(connected);
      setFestSettings(festService.getFestSettings());
      if (updateRefresh) setRefreshKey(prev => prev + 1);
      setIsAuthenticated(true);
      return true;
    }

    if (role === 'college' && afflNo) {
      setCurrentRoleState('college');
      setCurrentCollegeAfflNoState(afflNo);
      setCurrentCollegeIdState(`col-${afflNo}`);
      currentCollegeAfflNoRef.current = afflNo;
      const connected = await festService.syncWithSupabase(afflNo, forceSync);
      setIsSupabaseConnected(connected);
      setFestSettings(festService.getFestSettings());
      if (updateRefresh) setRefreshKey(prev => prev + 1);
      setIsAuthenticated(true);
      return true;
    }

    console.warn('[FestContext] User profile missing or college affiliation not assigned');
    setIsAuthenticated(false);
    return false;
  }, []);

  const refreshSessionAndSync = React.useCallback(async (): Promise<boolean> => {
    if (isStudentRoute()) {
      const studentSession = readStudentSessionFromStorage();
      if (studentSession) {
        const sAffl = studentSession.afflNo;
        setCurrentRoleState('student');
        setCurrentCollegeAfflNoState(sAffl);
        setCurrentCollegeIdState(sAffl > 0 ? `col-${sAffl}` : '');
        currentCollegeAfflNoRef.current = sAffl;
        setIsAuthenticated(true);
        const connected = await festService.syncWithSupabase(sAffl > 0 ? sAffl : undefined, true);
        setIsSupabaseConnected(connected);
        setFestSettings(festService.getFestSettings());
        setRefreshKey(prev => prev + 1);
        setIsLoadingAuth(false);
        return true;
      }
    }

    const supabaseClient = createClient();
    if (supabaseClient) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.access_token && supabaseClient.realtime?.setAuth) {
        supabaseClient.realtime.setAuth(session.access_token);
      }
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const ok = await resolveUserAndSync(supabaseClient, user, true, true);
        setIsLoadingAuth(false);
        return ok;
      }
    }

    const studentSession = readStudentSessionFromStorage();
    if (studentSession) {
      const sAffl = studentSession.afflNo;
      setCurrentRoleState('student');
      setCurrentCollegeAfflNoState(sAffl);
      setCurrentCollegeIdState(sAffl > 0 ? `col-${sAffl}` : '');
      currentCollegeAfflNoRef.current = sAffl;
      setIsAuthenticated(true);
      const connected = await festService.syncWithSupabase(sAffl > 0 ? sAffl : undefined, true);
      setIsSupabaseConnected(connected);
      setFestSettings(festService.getFestSettings());
      setRefreshKey(prev => prev + 1);
      setIsLoadingAuth(false);
      return true;
    }

    setIsLoadingAuth(false);
    return false;
  }, [resolveUserAndSync]);

  useEffect(() => {
    // Subscribe to live Realtime updates via WebSockets
    const unsubscribeRealtime = festService.subscribeToRealtimeChanges(
      () => {
        triggerRefresh();
      },
      () => currentCollegeAfflNoRef.current || undefined
    );

    const supabase = createClient();
    if (!supabase) {
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      return () => { unsubscribeRealtime(); };
    }

    let authSubscription: { unsubscribe: () => void } | null = null;

    // Load initial authenticated user session
    const initialStudentSession = isStudentRoute() ? readStudentSessionFromStorage() : null;
    if (initialStudentSession) {
      const sAffl = initialStudentSession.afflNo;
      setCurrentRoleState('student');
      setCurrentCollegeAfflNoState(sAffl);
      setCurrentCollegeIdState(sAffl > 0 ? `col-${sAffl}` : '');
      currentCollegeAfflNoRef.current = sAffl;
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      festService.syncWithSupabase(sAffl > 0 ? sAffl : undefined, false).then(connected => {
        setIsSupabaseConnected(connected);
        if (connected) {
          setFestSettings(festService.getFestSettings());
          setRefreshKey(prev => prev + 1);
        }
      });
    } else {
      supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: AuthUser | null } }) => {
        if (user) {
          await resolveUserAndSync(supabase, user, true, true);
        } else {
          // Check for active student session
          let hasStudentSession = false;
          const studentSession = readStudentSessionFromStorage();
          if (studentSession) {
            const sAffl = studentSession.afflNo;
            setCurrentRoleState('student');
            setCurrentCollegeAfflNoState(sAffl);
            setCurrentCollegeIdState(sAffl > 0 ? `col-${sAffl}` : '');
            currentCollegeAfflNoRef.current = sAffl;
            setIsAuthenticated(true);
            hasStudentSession = true;
            // Fast background sync without blocking UI
            festService.syncWithSupabase(sAffl > 0 ? sAffl : undefined, false).then(connected => {
              setIsSupabaseConnected(connected);
              if (connected) {
                setFestSettings(festService.getFestSettings());
                setRefreshKey(prev => prev + 1);
              }
            });
          }

          if (!hasStudentSession) {
            setIsAuthenticated(false);
            const connected = await festService.syncWithSupabase(undefined, false);
            setIsSupabaseConnected(connected);
            if (connected) {
              setFestSettings(festService.getFestSettings());
              setRefreshKey(prev => prev + 1);
            }
          }
        }
        setIsLoadingAuth(false);
      });
    }

    // Subscribe to Supabase Auth State Changes (login, logout, token refresh, window focus)
    const { data } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (isStudentRoute() && readStudentSessionFromStorage()) {
        return;
      }
      if (event === 'SIGNED_OUT') {
        const studentSession = readStudentSessionFromStorage();
        if (!studentSession) {
          setIsAuthenticated(false);
          setCurrentRoleState('student');
          setCurrentCollegeAfflNoState(0);
          setCurrentCollegeIdState('');
          currentCollegeAfflNoRef.current = 0;
        } else {
          const sAffl = studentSession.afflNo;
          setCurrentRoleState('student');
          setCurrentCollegeAfflNoState(sAffl);
          setCurrentCollegeIdState(sAffl > 0 ? `col-${sAffl}` : '');
          currentCollegeAfflNoRef.current = sAffl;
          setIsAuthenticated(true);
        }
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const isFreshLogin = !isAuthenticatedRef.current;
        if (isFreshLogin) {
          setIsLoadingAuth(true);
        }
        await resolveUserAndSync(supabase, session.user, isFreshLogin, isFreshLogin);
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
    const signingOutStudent = isStudentRoute() || currentRole === 'student';
    if (!signingOutStudent) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        if (supabase) {
          await supabase.auth.signOut();
        }
      } catch {
        // Proceed even if Supabase signout fails
      }
    }
    try {
      await fetch('/api/auth/student-logout', { method: 'POST' });
    } catch {
      // Proceed even if server cookie clear fails
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('arts_fest_active_role');
      localStorage.removeItem('arts_fest_active_affl_no');
      localStorage.removeItem('arts_fest_student_session');
      document.cookie = 'arts_fest_active_role=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'arts_fest_active_affl_no=; path=/; max-age=0; SameSite=Lax';
    }
    setCurrentRoleState('student');
    setCurrentCollegeAfflNoState(0);
    setCurrentCollegeIdState('');
    currentCollegeAfflNoRef.current = 0;
    setIsAuthenticated(false);
    festService.clearSessionCache();
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
        timeTick,
        refreshKey,
        triggerRefresh,
        isSupabaseConnected,
        isAuthenticated,
        isLoadingAuth,
        theme,
        setTheme,
        toggleTheme,
        refreshSessionAndSync,
        signOut,
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
