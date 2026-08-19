'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface Props {
  title: string;
  back?: string | boolean; // href, or true for router.back()
  /** Text next to the back chevron, iOS-style (defaults to "Back"). */
  backLabel?: string;
  right?: ReactNode;
  /** Also render the iOS large title underneath the bar. */
  large?: boolean;
  /** Secondary line under the large title. */
  subtitle?: string;
}

/**
 * iOS navigation bar: frosted material, a compact centred title, and an optional
 * large title below it for top-level screens.
 */
export default function TopBar({ title, back, backLabel = 'Back', right, large, subtitle }: Props) {
  const router = useRouter();
  // On a large-title screen the compact title fades in once the big one has
  // scrolled away — the iOS behaviour, and it stops the bar looking empty.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!large) return;
    const onScroll = () => setScrolled(window.scrollY > 42);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [large]);

  const showCompactTitle = !large || scrolled;

  return (
    <>
      <header className="material sticky top-0 z-30 border-b-[0.5px] border-hair pt-safe">
        <div className="mx-auto flex min-h-11 max-w-2xl items-center px-2 lg:max-w-4xl lg:px-4">
          <div className="flex flex-1 basis-0 justify-start">
            {back && (
              <button
                onClick={() => (typeof back === 'string' ? router.push(back) : router.back())}
                className="-ml-1 flex items-center gap-0.5 rounded-lg py-1.5 pl-1 pr-2 text-[17px] text-[var(--tint)] active:opacity-50"
              >
                <ChevronLeft size={24} strokeWidth={2.4} className="-mr-1" />
                <span className="max-w-[8rem] truncate">{backLabel}</span>
              </button>
            )}
          </div>
          <h1
            className={`truncate px-2 text-[17px] font-semibold tracking-[-0.01em] text-label transition-opacity duration-200 ${
              showCompactTitle ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {title}
          </h1>
          <div className="flex flex-1 basis-0 items-center justify-end gap-1">{right}</div>
        </div>
      </header>

      {large && (
        <div className="mx-auto max-w-2xl px-4 pb-1 pt-2 lg:max-w-4xl lg:px-6">
          <h1 className="title-lg text-label">{title}</h1>
          {subtitle && <p className="mt-1 text-[15px] text-label2">{subtitle}</p>}
        </div>
      )}
    </>
  );
}

/** Round translucent button for the nav bar's right slot. */
export function NavButton({
  onClick,
  href,
  label,
  children,
}: {
  onClick?: () => void;
  href?: string;
  label: string;
  children: ReactNode;
}) {
  const cls =
    'flex h-8 w-8 items-center justify-center rounded-full bg-fill text-[var(--tint)] active:opacity-50';
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cls}>
      {children}
    </button>
  );
}
