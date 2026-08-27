import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as authService from '../services/auth/authService';
import * as profileService from '../services/profile/profileService';
import type { User } from '../types';

interface AuthContextValue {
  session: Session | null;
  profile: User | null;
  loading: boolean;
  profileError: string | null;
  signUp: (params: authService.SignUpParams) => Promise<void>;
  signIn: (params: authService.SignInParams) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      setProfileError(null);
      const fetched = await profileService.fetchProfile(userId);
      setProfile(fetched);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not load your profile.');
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    authService.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => isMounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: subscription } = authService.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        await loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(async (params: authService.SignUpParams) => {
    await authService.signUp(params);
  }, []);

  const signIn = useCallback(async (params: authService.SignInParams) => {
    await authService.signIn(params);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session) {
      await loadProfile(session.user.id);
    }
  }, [session, loadProfile]);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      profileError,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, profileError, signUp, signIn, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
