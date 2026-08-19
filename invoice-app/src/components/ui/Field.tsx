'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

/**
 * iOS grouped-form fields. A field is a cell in a white rounded card: the label
 * sits on the left in grey, the value is typed on the right. Wrap a group of
 * them in <FieldGroup> to get the hairline separators.
 *
 * Inputs are 17px — anything smaller makes iOS Safari zoom on focus.
 */

export function FieldGroup({
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
        <h2 className="mb-2 px-4 text-[13px] uppercase tracking-[0.06em] text-label2">{header}</h2>
      )}
      <div className="hairline overflow-hidden rounded-[14px] bg-surface">{children}</div>
      {footer && <p className="mt-2 px-4 text-[13px] leading-snug text-label2">{footer}</p>}
    </section>
  );
}

const cell = 'flex min-h-[46px] w-full items-center gap-3 bg-surface px-4';
const control =
  'min-w-0 flex-1 bg-transparent py-3 text-[17px] text-label placeholder-label3 outline-none';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Right-align the typed value, as iOS does for short values. */
  alignRight?: boolean;
}

export function Input({ label, alignRight, className = '', ...props }: InputProps) {
  return (
    <label className={cell}>
      {label && <span className="w-[7.5rem] shrink-0 text-[17px] text-label">{label}</span>}
      <input
        className={`${control} ${alignRight || label ? 'text-right' : ''} ${className}`}
        {...props}
      />
    </label>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <label className="block bg-surface px-4 py-3">
      {label && <span className="mb-1 block text-[13px] text-label2">{label}</span>}
      <textarea
        className={`w-full resize-none bg-transparent text-[17px] text-label placeholder-label3 outline-none ${className}`}
        {...props}
      />
    </label>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className = '', children, ...props }: SelectProps) {
  return (
    <label className={cell}>
      {label && <span className="shrink-0 text-[17px] text-label">{label}</span>}
      <select
        className={`${control} appearance-none text-right text-[var(--tint)] ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

/** Stand-alone label for form sections that aren't inside a FieldGroup. */
export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-2 block px-4 text-[13px] uppercase tracking-[0.06em] text-label2">{children}</span>;
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** iOS switch in a list cell. */
export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center gap-3 bg-surface px-4 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] leading-tight text-label">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[13px] leading-snug text-label2">{description}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-pos' : 'bg-[#e9e9ea]'
        }`}
      >
        <span
          className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-200 ${
            checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
          }`}
        />
      </button>
    </div>
  );
}
