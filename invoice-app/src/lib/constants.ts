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
    /** The business's colour as a raw hex value. Drives --tint: nav bar, tab
     *  bar, links, chevrons — the app's "voice". */
    tint: string;
    /** Optional second colour for the main action buttons (--tint2). Only Car
     *  Battery Perth uses it: blue app, orange buttons. Defaults to `tint`. */
    tint2?: string;
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
      tint: '#1E5FA8', // brand blue — a blue-and-white app
      tint2: '#FF6B35', // brand orange, for the action buttons
    },
    pdf: {
      template: 'cbp',
      gstInclusive: true, // entered prices already include GST — never add 10% on top
      band: [30, 58, 95], // navy #1E3A5F
      bandText: [255, 255, 255],
      accent: [255, 107, 53], // orange #FF6B35
      tableHeadFill: [30, 58, 95],
      tableHeadText: [255, 255, 255],
      logoChip: true,
      terms: [
        'Payment due within 14 days of the invoice date, or by the date agreed.',
        'Goods remain the property of Car Battery Perth until paid in full.',
        '12-month warranty on all batteries supplied.',
      ],
      footerNote: 'Thank you for your business.',
    },
    defaults: {
      abn: '34 418 191 459',
      phone: '(08) 9456 4378',
      email: 'carbatteryperth@gmail.com',
      address: 'Servicing All Perth Metro · Bannister Rd, Canning Vale',
      accountName: 'Car Battery Perth',
      reviewUrl: 'https://g.page/r/CVRyN1uqdu4zEBM/review',
      bsb: '036-224',
      accountNumber: '574315',
      gstRegistered: true,
      nextInvoiceNumber: 1300,
      paymentTermsDays: 14,
    },
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
      tint: '#DC2626', // brand red
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
        'Payment due within 14 days of the invoice date, or by the date agreed.',
        'Goods remain the property of Battery Factory Direct until paid in full.',
        'Warranty applies as stated on this invoice.',
      ],
      footerNote: 'Thank you for choosing Battery Factory Direct.',
    },
    defaults: {
      abn: '62 524 870 529',
      phone: '(08) 9451 4048',
      email: 'admin@batteryfactorydirect.com.au',
      address: 'Unit 11/95 Kelvin Rd, Maddington',
      accountName: 'Battery Factory Direct',
      reviewUrl: 'https://g.page/r/CdjVYtLHyZYlEBM/review',
      bsb: '036-224',
      accountNumber: '574315',
      gstRegistered: true,
      nextInvoiceNumber: 1300,
      paymentTermsDays: 14,
    },
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
      tint: '#E11B22',
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
        'Payment due within 14 days of the invoice date, or by the date agreed.',
        'All prices are inclusive of GST unless otherwise stated.',
        'Please retain this invoice for your records.',
      ],
      footerNote: 'Thank you for your business.',
    },
    defaults: {
      abn: '62 524 870 529',
      phone: '(08) 9456 4378',
      email: 'carbatteryperth@gmail.com',
      address: '190C Carrington St, Hilton',
      accountName: 'Fremantle Batteries',
      // Shares Car Battery Perth's Google listing.
      reviewUrl: 'https://g.page/r/CVRyN1uqdu4zEBM/review',
      bsb: '036-224',
      accountNumber: '574315',
      gstRegistered: true,
      nextInvoiceNumber: 1300,
      paymentTermsDays: 14,
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
