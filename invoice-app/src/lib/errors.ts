// Turns a Firestore error into a message the user can act on.
export function describeSaveError(e: unknown): string {
  const err = e as { code?: string; message?: string };
  switch (err?.code) {
    case 'permission-denied':
      return 'The database blocked this save. Your sign-in email needs adding to the Firestore security rules (Firebase console → Firestore → Rules), then re-publish.';
    case 'unavailable':
    case 'failed-precondition':
    case 'deadline-exceeded':
      return 'Can’t reach the database right now. Check your internet connection and try again.';
    default:
      return `Could not save: ${err?.code || err?.message || 'unknown error'}.`;
  }
}
