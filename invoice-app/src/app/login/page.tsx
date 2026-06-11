'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Field';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      await signIn(email.trim(), password);
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
          type="email"
          placeholder="Email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border-slate-700 bg-slate-800 text-white placeholder-slate-500"
        />
        <Input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border-slate-700 bg-slate-800 text-white placeholder-slate-500"
        />
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}
        <Button type="submit" full disabled={busy} className="bg-amber-500 text-slate-900 active:bg-amber-400">
          {busy ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </div>
  );
}
