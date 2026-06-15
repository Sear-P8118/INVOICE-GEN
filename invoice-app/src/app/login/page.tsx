'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Field';
import Button from '@/components/ui/Button';

// Friendly usernames that map to a real sign-in email, so you can type a short
// name instead of the full email. The password is still your real password.
const USERNAME_ALIASES: Record<string, string> = {
  sami: 'popalholding24@outlook.com',
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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-900 px-6 py-10">
      <Image src="/icons/icon-192.png" alt="" width={88} height={88} className="rounded-2xl shadow-lg" priority />
      <h1 className="mt-5 text-2xl font-bold text-white">Battery Invoices</h1>
      <p className="mt-1 text-sm text-slate-400">Private access only</p>

      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm space-y-4">
        <Input
          label=""
          type="text"
          placeholder="Email or username"
          autoComplete="username"
          autoCapitalize="none"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
          className="border-slate-700 bg-slate-800 text-white placeholder-slate-500"
        />
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-3 pr-12 text-base text-white placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 active:bg-slate-700"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <Button type="submit" full disabled={busy} className="bg-amber-500 text-slate-900 active:bg-amber-400">
          {busy ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </div>
  );
}
