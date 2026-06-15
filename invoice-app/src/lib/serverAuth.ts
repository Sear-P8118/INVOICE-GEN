import { createRemoteJWKSet, jwtVerify } from 'jose';

// Verifies a Firebase ID token server-side WITHOUT needing a service account:
// Firebase ID tokens are signed by Google, so we check the signature against
// Google's public keys and confirm the project + allowed-email claims.

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';

const ALLOWED_EMAILS = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export interface VerifiedUser {
  email: string;
}

/** Returns the verified user, or null if the token is missing/invalid/not allowed. */
export async function verifyFirebaseUser(token?: string | null): Promise<VerifiedUser | null> {
  if (!token || !PROJECT_ID) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    const email = String(payload.email || '').toLowerCase();
    if (!email) return null;
    if (ALLOWED_EMAILS.length && !ALLOWED_EMAILS.includes(email)) return null;
    return { email };
  } catch {
    return null;
  }
}
