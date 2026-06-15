import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';

export const isFirebaseConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

// Lazily initialised so the Next.js build (which has no env vars and no
// browser) never touches Firebase. Everything runs client-side at runtime.

function app(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

let _auth: Auth | undefined;
export function auth(): Auth {
  if (!_auth) _auth = getAuth(app());
  return _auth;
}

let _db: Firestore | undefined;
export function db(): Firestore {
  if (!_db) {
    // Offline persistence so the app keeps working with poor mobile signal
    _db = initializeFirestore(app(), {
      // Drop undefined fields instead of throwing 'invalid-argument' on write.
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }
  return _db;
}
