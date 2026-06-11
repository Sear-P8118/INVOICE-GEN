export const ALLOWED_EMAILS = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export interface BusinessConfig {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  gradient: string;
  accent: string;
  invoicePrefix: string;
}

export const BUSINESSES: BusinessConfig[] = [
  {
    id: 'car-battery-perth',
    name: 'Car Battery Perth',
    tagline: 'Mobile battery replacement',
    icon: '🚗',
    gradient: 'from-red-500 to-rose-700',
    accent: 'bg-rose-600',
    invoicePrefix: 'CBP',
  },
  {
    id: 'battery-factory-direct',
    name: 'Battery Factory Direct',
    tagline: 'Wholesale battery supply',
    icon: '⚡',
    gradient: 'from-blue-500 to-indigo-700',
    accent: 'bg-indigo-600',
    invoicePrefix: 'BFD',
  },
  {
    id: 'fremantle-batteries',
    name: 'Fremantle Batteries',
    tagline: 'Local battery specialists',
    icon: '🔋',
    gradient: 'from-emerald-500 to-teal-700',
    accent: 'bg-teal-600',
    invoicePrefix: 'FRB',
  },
];

export function getBusinessConfig(id: string): BusinessConfig | undefined {
  return BUSINESSES.find((b) => b.id === id);
}

export const GST_RATE = 0.1;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}
