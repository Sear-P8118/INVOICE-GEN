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
    /** Which PDF template renderer to use. */
    template: 'cbp' | 'bfd' | 'fremantle';
    /** true = listed prices already include GST; false = GST is added on top. */
    gstInclusive: boolean;
    band: RGB; // primary brand fill (headers / bars)
    bandText: RGB;
    accent: RGB; // rules, doc title, totals
    tableHeadFill: RGB;
    tableHeadText: RGB;
    /** Put the logo on a white rounded chip inside dark headers. */
    logoChip?: boolean;
    /** Short bullet terms shown in the footer. */
    terms: string[];
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
    logo: { src: '/logos/cbp.png', width: 1000, height: 702, bg: '#ffffff' },
    ui: {
      gradient: 'from-[#1E3A5F] to-[#142840]',
      accent: 'bg-[#FF6B35] active:bg-[#e85d2a]',
      accentText: 'text-[#FF6B35]',
    },
    pdf: {
      template: 'cbp',
      gstInclusive: false, // prices are ex-GST; GST added on top
      band: [30, 58, 95], // navy #1E3A5F
      bandText: [255, 255, 255],
      accent: [255, 107, 53], // orange #FF6B35
      tableHeadFill: [30, 58, 95],
      tableHeadText: [255, 255, 255],
      logoChip: true,
      terms: [
        'Payment due within 7 days of the invoice date.',
        'Goods remain the property of Car Battery Perth 24/7 until paid in full.',
        '12-month warranty on all batteries supplied.',
      ],
      footerNote: 'Thank you for your business.',
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
      template: 'bfd',
      gstInclusive: true, // listed prices include GST
      band: [17, 17, 19], // near black
      bandText: [255, 255, 255],
      accent: [220, 38, 38], // red
      tableHeadFill: [24, 24, 27],
      tableHeadText: [255, 255, 255],
      terms: [
        'Payment due on receipt unless otherwise agreed.',
        'Goods remain the property of Battery Factory Direct until paid in full.',
        'Warranty applies as stated on this invoice.',
      ],
      footerNote: 'Thank you for choosing Battery Factory Direct.',
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
      template: 'fremantle',
      gstInclusive: true, // prices include GST ("Included")
      band: [237, 28, 36], // brand red
      bandText: [255, 255, 255],
      accent: [237, 28, 36],
      tableHeadFill: [237, 28, 36],
      tableHeadText: [255, 255, 255],
      terms: [
        'Payment due within 7 days.',
        'All prices are inclusive of GST unless otherwise stated.',
        'Please retain this invoice for your records.',
      ],
      footerNote: 'Thank you for your business.',
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
