'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * iOS "inset grouped" list: an optional small-caps header, a white rounded card,
 * and hairline separators that start where the text starts.
 */
export function List({
  header,
  footer,
  children,
  className = '',
}: {
  header?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {header && (
        <h2 className="mb-2 px-4 text-[13px] font-normal uppercase tracking-[0.06em] text-label2">
          {header}
        </h2>
      )}
      <div className="hairline overflow-hidden rounded-[14px] bg-surface">{children}</div>
      {footer && <p className="mt-2 px-4 text-[13px] leading-snug text-label2">{footer}</p>}
    </section>
  );
}

interface RowProps {
  /** Coloured rounded icon tile on the left, the way Settings rows look. */
  icon?: ReactNode;
  iconColor?: string; // any CSS colour
  /** Required unless you pass `children` for a custom cell layout. */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Right-hand detail text (grey), shown before the chevron. */
  value?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Force the chevron on/off; by default it shows for links and buttons. */
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  children?: ReactNode; // free-form cell content instead of title/subtitle
}

export function Row({
  icon,
  iconColor = 'var(--tint)',
  title,
  subtitle,
  value,
  href,
  onClick,
  chevron,
  destructive,
  disabled,
  children,
}: RowProps) {
  const interactive = Boolean(href || onClick);
  const showChevron = chevron ?? interactive;

  const inner = (
    <>
      {icon && (
        <span
          className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[7px] text-white"
          style={{ backgroundColor: iconColor }}
        >
          {icon}
        </span>
      )}
      {children ?? (
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[17px] leading-tight ${destructive ? 'text-neg' : 'text-label'}`}
          >
            {title}
          </span>
          {subtitle && (
            <span className="mt-0.5 block truncate text-[13px] leading-tight text-label2">
              {subtitle}
            </span>
          )}
        </span>
      )}
      {value && <span className="shrink-0 text-[17px] text-label2">{value}</span>}
      {showChevron && <ChevronRight size={18} className="-mr-1 shrink-0 text-label3" strokeWidth={2.5} />}
    </>
  );

  const cls = `flex w-full items-center gap-3 px-4 py-3 text-left ${
    interactive ? 'pressable' : ''
  } ${disabled ? 'opacity-40' : ''}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={cls}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

/** Centred empty state for a list that has nothing in it yet. */
export function Empty({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="text-label3">{icon}</span>
      <p className="mt-3 text-[17px] font-semibold text-label2">{title}</p>
      {hint && <p className="mt-1 max-w-[16rem] text-[14px] leading-snug text-label3">{hint}</p>}
    </div>
  );
}
