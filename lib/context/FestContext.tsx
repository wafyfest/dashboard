'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const FestContext = createContext<FestContextType | undefined>(undefined);

export function FestProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRoleState] = useState<UserRole>('admin');
  const [currentCollegeId, setCurrentCollegeIdState] = useState<string>('col-11');
  const [currentCollegeAfflNo, setCurrentCollegeAfflNoState] = useState<number>(11);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [festSettings, setFestSettings] = useState<FestSettings>(() => festService.getFestSettings());
  const [currentProfile, setCurrentProfile] = useState<Profile>(() => festService.getProfileByRole('admin'));
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Sync with live Supabase if available
    festService.syncWithSupabase().then(connected => {
      setIsSupabaseConnected(connected);
      if (connected) {
        setFestSettings(festService.getFestSettings());
      }
    });

    // Check localStorage for saved role
    if (typeof window !== 'undefined') {
      const savedRole = localStorage.getItem('arts_fest_active_role') as UserRole;
      if (savedRole && ['admin', 'college', 'student', 'stage_controller', 'result_entry'].includes(savedRole)) {
        setCurrentRoleState(savedRole);
      }
      const savedAffl = localStorage.getItem('arts_fest_active_affl_no');
      if (savedAffl) {
        const affl = parseInt(savedAffl);
        if (!isNaN(affl)) {
          setCurrentCollegeAfflNoState(affl);
        }
      }

      // Check localStorage for saved theme
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('arts_fest_active_role', role);
    }
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
        theme,
        setTheme,
        toggleTheme
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
