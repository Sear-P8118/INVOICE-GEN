import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Server-side Firestore access for scheduled jobs (cron), using a service
// account. This bypasses the per-user security rules, so it is only ever used
// from protected server routes — never the client.

export function adminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
  );
}

let _db: Firestore | null = null;

export function adminDb(): Firestore {
  if (_db) return _db;
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Private keys are stored with literal "\n"; turn them back into newlines.
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      });
  _db = getFirestore(app);
  return _db;
}
