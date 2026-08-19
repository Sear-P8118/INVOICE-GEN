'use client';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * iOS segmented control: a grey track with a white sliding thumb. Use it for a
 * small set of mutually exclusive views — never for actions.
 */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div className={`relative flex rounded-[9px] bg-fill p-[2px] ${className}`}>
      <span
        className="absolute inset-y-[2px] rounded-[7px] bg-white shadow-[0_3px_8px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(calc(${index} * 100%))`,
          left: 2,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative z-10 flex-1 truncate rounded-[7px] py-[6px] text-[13px] font-semibold transition-colors ${
            o.value === value ? 'text-label' : 'text-label2'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
