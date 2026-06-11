import { Business } from '@/types';

export const ALLOWED_EMAILS = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export type RGB = [number, number, number];

export interface BusinessConfig {
  id: string;
  name: string;
  tagline: string;
  invoicePrefix: string;
  logo: {
    src: string;
    width: number; // natural px, used to keep aspect ratio
    height: number;
    /** Background the logo artwork sits on, so it can be shown full-bleed. */
    bg: string; // css colour
  };
  ui: {
    /** Tailwind gradient classes for headers / cards. */
    gradient: string;
    /** Tailwind bg class for primary action buttons. */
    accent: string;
    /** Tailwind text class for accent text. */
    accentText: string;
  };
  pdf: {
    /** 'band' = full-width coloured header band; 'plain' = white header with logo block. */
    headerStyle: 'band' | 'plain';
    band: RGB; // band fill (band style) / logo block colour (plain style)
    bandText: RGB;
    accent: RGB; // rules, doc title (plain style), totals
    tableHeadFill: RGB;
    tableHeadText: RGB;
    /** Put the logo on a white rounded chip inside the band (for logos with white backgrounds). */
    logoChip?: boolean;
    footerNote: string;
  };
  /** Sensible starting values for the editable business settings. */
  defaults?: Partial<Business>;
}

export const BUSINESSES: BusinessConfig[] = [
  {
    id: 'car-battery-perth',
    name: 'Car Battery Perth',
    tagline: '24/7 mobile battery replacement',
    invoicePrefix: 'CBP',
    logo: { src: '/logos/cbp.png', width: 800, height: 533, bg: '#ffffff' },
    ui: {
      gradient: 'from-[#1E3A5F] to-[#142840]',
      accent: 'bg-[#FF6B35] active:bg-[#e85d2a]',
      accentText: 'text-[#FF6B35]',
    },
    pdf: {
      headerStyle: 'band',
      band: [30, 58, 95], // navy #1E3A5F
      bandText: [255, 255, 255],
      accent: [255, 107, 53], // orange #FF6B35
      tableHeadFill: [30, 58, 95],
      tableHeadText: [255, 255, 255],
      logoChip: true,
      footerNote: 'Car Battery Perth 24/7 · Mobile battery replacement, Perth-wide',
    },
    defaults: { phone: '(08) 9456 4378', paymentTermsDays: 7 },
  },
  {
    id: 'battery-factory-direct',
    name: 'Battery Factory Direct',
    tagline: 'Car · Truck · Marine · Industrial',
    invoicePrefix: 'BFD',
    logo: { src: '/logos/bfd.png', width: 900, height: 426, bg: '#0b0b0c' },
    ui: {
      gradient: 'from-zinc-900 via-zinc-800 to-zinc-900',
      accent: 'bg-red-600 active:bg-red-700',
      accentText: 'text-red-500',
    },
    pdf: {
      headerStyle: 'band',
      band: [11, 11, 12], // near black
      bandText: [255, 255, 255],
      accent: [220, 38, 38], // red
      tableHeadFill: [24, 24, 27],
      tableHeadText: [255, 255, 255],
      footerNote: 'Battery Factory Direct · Car · Truck · Marine · Industrial',
    },
    defaults: { paymentTermsDays: 14 },
  },
  {
    id: 'fremantle-batteries',
    name: 'Fremantle Batteries',
    tagline: 'Local battery specialists',
    invoicePrefix: 'FRB',
    logo: { src: '/logos/fremantle.png', width: 900, height: 531, bg: '#ec1c24' },
    ui: {
      gradient: 'from-[#e11b22] to-[#b3151b]',
      accent: 'bg-[#e11b22] active:bg-[#c4181e]',
      accentText: 'text-[#e11b22]',
    },
    pdf: {
      headerStyle: 'plain',
      band: [236, 28, 36], // logo block red
      bandText: [255, 255, 255],
      accent: [225, 27, 34],
      tableHeadFill: [225, 27, 34],
      tableHeadText: [255, 255, 255],
      footerNote: 'Fremantle Batteries · Thank you for your business',
    },
    defaults: {
      phone: '0433 483 777',
      address: '190C Carrington St, Hilton WA 6163',
      accountName: 'Fremantle Batteries',
      bsb: '036-224',
      accountNumber: '574315',
      paymentTermsDays: 7,
    },
  },
];

export function getBusinessConfig(id: string): BusinessConfig | undefined {
  return BUSINESSES.find((b) => b.id === id);
}

export const GST_RATE = 0.1;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}
