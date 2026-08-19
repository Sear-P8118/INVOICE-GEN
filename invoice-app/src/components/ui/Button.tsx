'use client';

import { ButtonHTMLAttributes } from 'react';

// iOS button roles: a filled tinted button, a soft tinted-background button,
// a plain text button, and the destructive red variants of each.
type Variant = 'primary' | 'secondary' | 'plain' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
  /** 50px tall — the iOS "prominent" size for the main action on a screen. */
  large?: boolean;
}

const styles: Record<Variant, string> = {
  primary: 'bg-[var(--tint2)] text-white active:opacity-80',
  secondary: 'bg-fill text-[var(--tint)] active:opacity-70',
  plain: 'text-[var(--tint)] active:opacity-50',
  danger: 'bg-neg text-white active:opacity-80',
};

export default function Button({
  variant = 'primary',
  full,
  large,
  className = '',
  ...props
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[12px] px-4 font-semibold tracking-[-0.01em] transition-opacity disabled:opacity-35 ${
        large ? 'min-h-[50px] text-[17px]' : 'min-h-[44px] text-[16px]'
      } ${styles[variant]} ${full ? 'w-full' : ''} ${className}`}
      {...props}
    />
  );
}
