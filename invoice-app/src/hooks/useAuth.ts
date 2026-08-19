'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { ALLOWED_EMAILS } from '@/lib/constants';

// Quick logins that bypassed Firebase entirely. Deliberately empty now: a local
// session can't read or write anything (Firestore refuses it), so it only ever
// looked like a working login. Sign in with a real email instead.
const LOCAL_ACCOUNTS: Record<string, string> = {};
const LOCAL_SESSION_KEY = 'invoice-local-user';

type AppUser = User | { email: string };

function readLocalSession(): AppUser | null {
  if (typeof window === 'undefined') return null;
  const username = localStorage.getItem(LOCAL_SESSION_KEY);
  return username ? { email: username } : null;
}

function isAllowed(email: string | null): boolean {
  if (!email) return false;
  // If no allowlist is configured, fall back to Firebase Auth alone.
  if (ALLOWED_EMAILS.length === 0) return true;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  // With no Firebase config there is nothing to wait for.
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    const localUser = readLocalSession();
    if (localUser) {
      setUser(localUser);
      setLoading(false);
      return;
    }
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth(), (u) => {
      if (u && !isAllowed(u.email)) {
        fbSignOut(auth());
        setUser(null);
      } else {
        setUser(u);
      }
      setLoading(false);
    });
  }, []);

  const signInLocal = useCallback((username: string, password: string): boolean => {
    const key = username.trim().toLowerCase();
    if (LOCAL_ACCOUNTS[key] !== password) return false;
    localStorage.setItem(LOCAL_SESSION_KEY, key);
    setUser({ email: key });
    return true;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not configured yet — see the README setup steps.');
    }
    if (!isAllowed(email)) {
      throw new Error('This email is not authorised to use this app.');
    }
    try {
      await signInWithEmailAndPassword(auth(), email, password);
    } catch {
      throw new Error('Incorrect email or password.');
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    setUser(null);
    if (isFirebaseConfigured) fbSignOut(auth());
  }, []);

  // A quick-login session never authenticates with Firebase, so every read and
  // write is refused with permission-denied. Screens use this to say so plainly
  // instead of sitting there empty.
  const isLocalSession = user !== null && !('uid' in user);

  return { user, loading, isLocalSession, signIn, signInLocal, signOut };
}
