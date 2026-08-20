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

// This app used to allow "quick logins" (sear/sami) that skipped Firebase.
// They were a trap: the app looked signed in, but Firestore refused every read
// and write because there was no Firebase user behind the request. The logins
// are gone, and any session one left behind is cleared on load so nobody stays
// stuck in that state.
const LEGACY_SESSION_KEY = 'invoice-local-user';

function clearLegacySession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* private mode / storage disabled — nothing to clear */
  }
}

function isAllowed(email: string | null): boolean {
  if (!email) return false;
  // If no allowlist is configured, fall back to Firebase Auth alone.
  if (ALLOWED_EMAILS.length === 0) return true;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  // With no Firebase config there is nothing to wait for.
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    clearLegacySession();
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
    clearLegacySession();
    setUser(null);
    if (isFirebaseConfigured) fbSignOut(auth());
  }, []);

  return { user, loading, signIn, signOut };
}
