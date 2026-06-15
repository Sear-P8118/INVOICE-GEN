'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface Props {
  title: string;
  back?: string | boolean; // href, or true for router.back()
  right?: ReactNode;
}

export default function TopBar({ title, back, right }: Props) {
  const router = useRouter();
  return (
    <header
      className="sticky top-0 z-30 border-b border-slate-200 bg-white"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex min-h-14 max-w-2xl items-center gap-1 px-3 lg:max-w-4xl lg:px-5">
        {back && (
          <button
            onClick={() => (typeof back === 'string' ? router.push(back) : router.back())}
            className="-ml-1 rounded-lg p-1.5 text-slate-700 active:bg-slate-100"
            aria-label="Back"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className="flex-1 truncate px-1 text-lg font-bold text-slate-900">{title}</h1>
        {right}
      </div>
    </header>
  );
}
