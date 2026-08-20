'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';

// Friendly usernames that map to a real sign-in email, so you can type a short
// name instead of the full email. The password is still your real password.
const USERNAME_ALIASES: Record<string, string> = {
  sami: 'popalholding24@outlook.com',
  sear: 'popalholding24@outlook.com',
  cbp: 'carbatteryperth@gmail.com',
  carbattery: 'carbatteryperth@gmail.com',
};

function resolveLogin(input: string): string {
  const v = input.trim();
  return USERNAME_ALIASES[v.toLowerCase()] || v;
}

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/home');
  }, [user, loading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(resolveLogin(login), password);
      // Re-arm the birthday screen so a fresh login shows it again (within the window).
      try {
        sessionStorage.removeItem('bdayShown');
      } catch {
        /* ignore */
      }
      router.replace('/home');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={84}
        height={84}
        className="rounded-[19px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        priority
      />
      <h1 className="title-md mt-5 text-label">Battery Invoices</h1>
      <p className="mt-1 text-[15px] text-label2">Private access only</p>

      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm space-y-4">
        <div className="hairline overflow-hidden rounded-[14px] bg-surface">
          <input
            type="text"
            placeholder="Email or username"
            autoComplete="username"
            autoCapitalize="none"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            className="w-full bg-transparent px-4 py-3.5 text-[17px] text-label placeholder-label3 outline-none"
          />
          <div className="relative flex items-center">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-transparent px-4 py-3.5 pr-12 text-[17px] text-label placeholder-label3 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 p-1.5 text-label3 active:opacity-50"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </div>
        {error && (
          <p className="rounded-[12px] bg-neg/10 px-4 py-3 text-[15px] text-neg">{error}</p>
        )}
        <Button type="submit" full large disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </div>
  );
}
