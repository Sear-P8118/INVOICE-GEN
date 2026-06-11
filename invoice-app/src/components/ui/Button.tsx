'use client';

import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const styles: Record<Variant, string> = {
  primary: 'bg-slate-900 text-white active:bg-slate-700',
  secondary: 'bg-slate-100 text-slate-900 active:bg-slate-200',
  danger: 'bg-red-600 text-white active:bg-red-700',
  ghost: 'bg-transparent text-slate-600 active:bg-slate-100',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
}

export default function Button({ variant = 'primary', full, className = '', ...props }: Props) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-40 ${styles[variant]} ${full ? 'w-full' : ''} ${className}`}
      {...props}
    />
  );
}
