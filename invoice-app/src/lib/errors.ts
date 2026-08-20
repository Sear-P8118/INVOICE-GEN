// Turns a Firestore error into a message the user can act on.
export function describeSaveError(e: unknown): string {
  const err = e as { code?: string; message?: string };
  switch (err?.code) {
    case 'permission-denied':
      // Nearly always a sign-in problem rather than a rules problem, so lead
      // with the fix the user can actually action.
      return 'The database refused this save. Sign out and sign back in with your email address, then try again. If it keeps happening, your email needs adding to the Firestore rules.';
    case 'unavailable':
    case 'failed-precondition':
    case 'deadline-exceeded':
      return 'Can’t reach the database right now. Check your internet connection and try again.';
    default:
      return `Could not save: ${err?.code || err?.message || 'unknown error'}.`;
  }
}
