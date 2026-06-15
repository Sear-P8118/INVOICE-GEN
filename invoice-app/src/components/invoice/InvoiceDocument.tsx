import {
  MapPin,
  Phone,
  Mail,
  Hash,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Business, Invoice, daysOverdue } from '@/types';
import { getBusinessConfig, formatCurrency } from '@/lib/constants';

// A4 at 96dpi
export const DOC_W = 794;
export const DOC_H = 1123;

const rgb = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;
const GST_RATE = 0.1;

function fmtDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function lineParts(qty: number, price: number, gstReg: boolean, inclusive: boolean) {
  const gross = (qty || 0) * (price || 0);
  if (!gstReg) return { unit: price, gst: 0, total: gross };
  if (inclusive) {
    const net = gross / (1 + GST_RATE);
    return { unit: price, gst: gross - net, total: gross };
  }
  return { unit: price, gst: gross * GST_RATE, total: gross + gross * GST_RATE };
}

function paidBalance(inv: Invoice) {
  if (inv.status === 'Paid') return { paid: inv.total, balance: 0 };
  return { paid: 0, balance: inv.total };
}

function docTitle(inv: Invoice) {
  if (inv.status === 'Quote') return 'QUOTE';
  return inv.gstRegistered ? 'TAX INVOICE' : 'INVOICE';
}

interface Props {
  invoice: Invoice;
  business: Business;
}

const page: React.CSSProperties = {
  width: DOC_W,
  height: DOC_H,
  background: '#ffffff',
  color: '#0f172a',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  position: 'relative',
  overflow: 'hidden',
  boxSizing: 'border-box',
};

export default function InvoiceDocument({ invoice, business }: Props) {
  const cfg = getBusinessConfig(invoice.businessId);
  if (!cfg) return null;
  if (cfg.pdf.template === 'bfd') return <BFD invoice={invoice} business={business} />;
  if (cfg.pdf.template === 'fremantle') return <Fremantle invoice={invoice} business={business} />;
  return <CBP invoice={invoice} business={business} />;
}

function ContactRow({ icon: Icon, text, color }: { icon: typeof Phone; text: string; color: string }) {
  if (!text) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155' }}>
      <Icon size={14} color={color} strokeWidth={2.4} />
      <span>{text}</span>
    </div>
  );
}

function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        background: color,
        color: '#fff',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.6,
        padding: '3px 12px',
        borderRadius: 999,
      }}
    >
      {label.toUpperCase()}
    </span>
  );
}

function statusColor(status: string) {
  switch (status) {
    case 'Paid':
      return '#10b981';
    case 'Overdue':
      return '#dc2626';
    case 'Pending':
      return '#f59e0b';
    case 'Quote':
      return '#2563eb';
    default:
      return '#64748b';
  }
}

// ====================== CAR BATTERY PERTH ======================

function CBP({ invoice, business }: Props) {
  const cfg = getBusinessConfig(invoice.businessId)!;
  const navy = rgb(cfg.pdf.band);
  const orange = rgb(cfg.pdf.accent);
  const gstReg = invoice.gstRegistered;
  const showDue = invoice.status === 'Pending' || invoice.status === 'Overdue';
  const od = invoice.status === 'Overdue' ? daysOverdue(invoice.dueDate) : 0;

  const details: [string, string][] = [
    [invoice.status === 'Quote' ? 'QUOTE NO.' : 'INVOICE NO.', invoice.invoiceNumber],
    [invoice.status === 'Paid' ? 'DATE PAID' : invoice.status === 'Quote' ? 'DATE' : 'ISSUE DATE', fmtDate(invoice.issueDate)],
  ];
  if (showDue) details.push(['DUE DATE', fmtDate(invoice.dueDate)]);

  return (
    <div style={page}>
      <div style={{ position: 'absolute', top: 150, right: -120, width: 360, height: 360, borderRadius: '50%', background: orange, opacity: 0.07 }} />
      <div style={{ position: 'absolute', bottom: 60, left: -160, width: 340, height: 340, borderRadius: '50%', background: navy, opacity: 0.05 }} />

      {/* Full-width brand banner */}
      <div style={{ position: 'relative', zIndex: 1, background: navy }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 36px' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 22px', display: 'inline-flex' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cfg.logo.src} alt={business.name} style={{ height: 80, display: 'block' }} />
          </div>
          <div style={{ textAlign: 'right', color: '#fff' }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 1.5 }}>{docTitle(invoice)}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{invoice.invoiceNumber}</div>
          </div>
        </div>
        <div style={{ height: 6, background: orange }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '24px 36px 36px' }}>
        {/* business contact + details card */}
        <div style={{ display: 'flex', gap: 18, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'grid', gap: 6, paddingTop: 4 }}>
            <ContactRow icon={MapPin} text={business.address} color={orange} />
            <ContactRow icon={Phone} text={business.phone} color={orange} />
            <ContactRow icon={Mail} text={business.email} color={orange} />
            <ContactRow icon={Hash} text={business.abn ? `ABN ${business.abn}` : ''} color={orange} />
          </div>

          <div style={{ width: 290 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              {details.map(([k, v], i) => (
                <div
                  key={k}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', fontSize: 12, borderTop: i ? '1px solid #f1f5f9' : 'none' }}
                >
                  <span style={{ color: '#64748b', fontWeight: 700 }}>{k}</span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <span style={{ color: '#64748b', fontWeight: 700, fontSize: 12 }}>
                  {invoice.status === 'Quote' ? 'TYPE' : 'STATUS'}
                </span>
                <StatusChip label={invoice.status} color={statusColor(invoice.status)} />
              </div>
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div style={{ marginTop: 26, maxWidth: 380 }}>
          <div style={{ display: 'inline-block', background: navy, color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, padding: '6px 14px', borderRadius: 6 }}>
            BILL TO
          </div>
          <div style={{ padding: '10px 4px 0' }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{invoice.customerName || '—'}</div>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 3, lineHeight: 1.6 }}>
              {invoice.customerAddress && <div>{invoice.customerAddress}</div>}
              {invoice.customerPhone && <div>{invoice.customerPhone}</div>}
              {invoice.customerEmail && <div>{invoice.customerEmail}</div>}
            </div>
          </div>
        </div>

        {od > 0 && (
          <div style={{ marginTop: 12, color: '#dc2626', fontWeight: 800, fontSize: 13 }}>
            {od} day{od === 1 ? '' : 's'} overdue
          </div>
        )}

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 18, fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: navy, color: '#fff' }}>
              {['#', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'GST', 'AMOUNT'].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i === 0 || i === 2 ? 'center' : i >= 3 ? 'right' : 'left',
                    padding: '9px 12px',
                    fontSize: 11,
                    letterSpacing: 0.5,
                    fontWeight: 800,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((it, i) => {
              const p = lineParts(it.quantity, it.unitPrice, gstReg, cfg.pdf.gstInclusive);
              return (
                <tr key={it.id} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                  <td style={{ textAlign: 'center', padding: '9px 12px', color: orange, fontWeight: 800 }}>
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  <td style={{ padding: '9px 12px' }}>{it.description}</td>
                  <td style={{ textAlign: 'center', padding: '9px 12px' }}>{it.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '9px 12px' }}>{formatCurrency(p.unit)}</td>
                  <td style={{ textAlign: 'right', padding: '9px 12px' }}>{gstReg ? formatCurrency(p.gst) : '—'}</td>
                  <td style={{ textAlign: 'right', padding: '9px 12px', fontWeight: 700 }}>{formatCurrency(p.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Payment + totals */}
        <div style={{ display: 'flex', gap: 18, marginTop: 22, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <PaymentBox business={business} invoice={invoice} accent={orange} title="PAYMENT METHOD" />
          </div>
          <div style={{ width: 300 }}>
            <TotalsRows invoice={invoice} gstReg={gstReg} />
            <div
              style={{
                marginTop: 8,
                background: `linear-gradient(135deg, ${navy}, ${rgb([20, 40, 64])})`,
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRight: `5px solid ${orange}`,
              }}
            >
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: 0.5 }}>
                {invoice.status === 'Paid' ? 'TOTAL PAID' : invoice.status === 'Quote' ? 'QUOTE TOTAL' : 'TOTAL DUE'}
              </span>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes / terms */}
        <div style={{ display: 'flex', gap: 24, marginTop: 30 }}>
          <NotesTerms title="NOTES" accent={orange} body={[invoice.notes || cfg.pdf.footerNote]} />
          <NotesTerms title="TERMS" accent={orange} body={cfg.pdf.terms} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <div style={{ height: 3, background: orange }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', color: orange, fontWeight: 800, fontSize: 13 }}>
          <CheckCircle2 size={16} /> {cfg.pdf.footerNote.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

// ====================== BATTERY FACTORY DIRECT ======================

function BFD({ invoice, business }: Props) {
  const cfg = getBusinessConfig(invoice.businessId)!;
  const red = rgb(cfg.pdf.accent);
  const gstReg = invoice.gstRegistered;
  const showDue = invoice.status === 'Pending' || invoice.status === 'Overdue';
  const { paid, balance } = paidBalance(invoice);

  const details: [string, string, boolean][] = [
    [invoice.status === 'Quote' ? 'Quote Number:' : 'Invoice Number:', invoice.invoiceNumber, true],
    [invoice.status === 'Paid' ? 'Date Paid:' : 'Issue Date:', fmtDate(invoice.issueDate), false],
  ];
  if (showDue) details.push(['Due Date:', fmtDate(invoice.dueDate), false]);

  return (
    <div style={page}>
      <div style={{ position: 'absolute', top: 150, right: -120, width: 350, height: 350, borderRadius: '50%', background: red, opacity: 0.06 }} />
      <div style={{ position: 'absolute', bottom: -130, left: -120, width: 340, height: 340, borderRadius: '50%', background: '#111113', opacity: 0.05 }} />

      {/* Full-width brand banner with full logo */}
      <div style={{ position: 'relative', zIndex: 1, background: '#0b0b0c' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 36px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cfg.logo.src} alt={business.name} style={{ height: 76, display: 'block' }} />
          <div style={{ textAlign: 'right', color: '#fff' }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 1 }}>{docTitle(invoice)}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{invoice.invoiceNumber}</div>
          </div>
        </div>
        <div style={{ height: 6, background: red }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '24px 40px 40px' }}>
        {/* business contact + details card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'grid', gap: 5, paddingTop: 4 }}>
            <ContactRow icon={MapPin} text={business.address} color={red} />
            <ContactRow icon={Phone} text={business.phone} color={red} />
            <ContactRow icon={Mail} text={business.email} color={red} />
            <ContactRow icon={Hash} text={business.abn ? `ABN ${business.abn}` : ''} color={red} />
          </div>

          <div style={{ width: 280 }}>
            <div style={{ background: '#111113', color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: 0.6, padding: '8px 14px', borderRadius: '8px 8px 0 0' }}>
              INVOICE DETAILS
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
              {details.map(([k, v, hot]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', fontSize: 12.5, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ fontWeight: 700, color: hot ? red : '#0f172a' }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', fontSize: 12.5 }}>
                <span style={{ color: '#64748b' }}>Status:</span>
                <span style={{ fontWeight: 800, color: statusColor(invoice.status) }}>{invoice.status.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div style={{ marginTop: 24 }}>
          <span style={{ background: red, color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 0.8, padding: '5px 12px', borderRadius: 4 }}>
            BILL TO
          </span>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{invoice.customerName || '—'}</div>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 3, lineHeight: 1.5 }}>
              {invoice.customerAddress && <div>{invoice.customerAddress}</div>}
              {invoice.customerPhone && <div>{invoice.customerPhone}</div>}
              {invoice.customerEmail && <div>{invoice.customerEmail}</div>}
            </div>
          </div>
        </div>

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20, fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#111113', color: '#fff' }}>
              {['DESCRIPTION', 'QTY', 'UNIT PRICE', 'GST', 'TOTAL'].map((h, i) => (
                <th key={h} style={{ textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right', padding: '10px 12px', fontSize: 11, fontWeight: 800, letterSpacing: 0.4 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((it) => {
              const p = lineParts(it.quantity, it.unitPrice, gstReg, cfg.pdf.gstInclusive);
              return (
                <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px' }}>{it.description}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{it.quantity}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCurrency(p.unit)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{gstReg ? formatCurrency(p.gst) : '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(p.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals + left info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
          <div style={{ fontSize: 12.5, color: '#475569' }}>
            <div>
              <b style={{ color: '#0f172a' }}>Payment Method:</b> {business.bsb || business.accountNumber ? 'Card / EFT' : 'Card'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <ShieldCheck size={14} color={red} />
              <b style={{ color: '#0f172a' }}>Warranty:</b> as stated on this invoice
            </div>
            {(business.bsb || business.accountNumber) && (
              <div style={{ marginTop: 10, lineHeight: 1.5 }}>
                {business.accountName && <div>Account: {business.accountName}</div>}
                {business.bsb && <div>BSB: {business.bsb}</div>}
                {business.accountNumber && <div>Acc: {business.accountNumber}</div>}
                <div>Ref: {invoice.invoiceNumber}</div>
              </div>
            )}
          </div>

          <div style={{ width: 290 }}>
            <TotalsRows invoice={invoice} gstReg={gstReg} />
            <div style={{ background: '#111113', color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderRadius: 8, marginTop: 6 }}>
              <span style={{ fontWeight: 800 }}>{invoice.status === 'Paid' ? 'Total Paid' : 'Total'}</span>
              <span style={{ fontWeight: 800, fontSize: 18 }}>{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.status !== 'Quote' && (
              <>
                <Row label="Amount Paid" value={formatCurrency(paid)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', marginTop: 4, borderTop: `2px solid ${red}`, color: red, fontWeight: 800 }}>
                  <span>Balance Due</span>
                  <span>{formatCurrency(balance)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>{cfg.pdf.footerNote}</div>
        <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 6 }}>{cfg.pdf.terms.join('   •   ')}</div>
      </div>
    </div>
  );
}

// ====================== FREMANTLE BATTERIES ======================

function Fremantle({ invoice, business }: Props) {
  const cfg = getBusinessConfig(invoice.businessId)!;
  const red = rgb(cfg.pdf.band);
  const gstReg = invoice.gstRegistered;
  const showDue = invoice.status === 'Pending' || invoice.status === 'Overdue';
  const { paid, balance } = paidBalance(invoice);

  const strip: [string, string][] = [
    [invoice.status === 'Quote' ? 'QUOTE NO.' : 'INVOICE NO.', invoice.invoiceNumber],
    [invoice.status === 'Paid' ? 'DATE PAID' : 'ISSUE DATE', fmtDate(invoice.issueDate)],
  ];
  if (showDue) strip.push(['DUE DATE', fmtDate(invoice.dueDate)]);
  strip.push(['STATUS', invoice.status.toUpperCase()]);

  return (
    <div style={page}>
      <div style={{ position: 'absolute', bottom: -130, right: -110, width: 360, height: 360, borderRadius: '50%', background: red, opacity: 0.06 }} />
      <div style={{ position: 'absolute', top: 220, left: -150, width: 300, height: 300, borderRadius: '50%', background: red, opacity: 0.04 }} />
      {/* Red band */}
      <div style={{ background: red, padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cfg.logo.src} alt="" style={{ height: 64 }} />
        <div style={{ textAlign: 'right', color: '#fff' }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1 }}>{docTitle(invoice)}</div>
          <div style={{ fontSize: 11, marginTop: 6, lineHeight: 1.6, opacity: 0.95 }}>
            {business.address && <div>{business.address}</div>}
            {business.phone && <div>{business.phone}</div>}
            {business.email && <div>{business.email}</div>}
            {business.abn && <div>ABN {business.abn}</div>}
          </div>
        </div>
      </div>

      <div style={{ padding: 40, position: 'relative', zIndex: 1 }}>
        {/* Detail strip */}
        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
          {strip.map(([k, v]) => (
            <div key={k} style={{ flex: 1 }}>
              <div style={{ color: red, fontWeight: 800, fontSize: 10.5, letterSpacing: 0.5 }}>{k}</div>
              <div style={{ fontWeight: 800, fontSize: 14, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Bill to + summary */}
        <div style={{ display: 'flex', gap: 30, marginTop: 22 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: red, fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>BILL TO</div>
            <div style={{ fontWeight: 800, fontSize: 15, marginTop: 6 }}>{invoice.customerName || '—'}</div>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 3, lineHeight: 1.5 }}>
              {invoice.customerPhone && <div>{invoice.customerPhone}</div>}
              {invoice.customerEmail && <div>{invoice.customerEmail}</div>}
              {invoice.customerAddress && <div>{invoice.customerAddress}</div>}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: red, fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>INVOICE SUMMARY</div>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 6, lineHeight: 1.7 }}>
              {invoice.status === 'Quote' ? (
                <>
                  <div>This is a quotation.</div>
                  <div>Valid for 14 days from the date above.</div>
                </>
              ) : (
                <>
                  <div>Sale status: {invoice.status}</div>
                  <div>{balance <= 0 ? 'Payment received in full' : `Amount paid: ${formatCurrency(paid)}`}</div>
                  <div>Balance outstanding: {formatCurrency(balance)}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 22, fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: red, color: '#fff' }}>
              {['DESCRIPTION', 'QTY', 'UNIT PRICE', 'GST', 'LINE TOTAL'].map((h, i) => (
                <th key={h} style={{ textAlign: i === 0 ? 'left' : i === 2 || i === 4 ? 'right' : 'center', padding: '10px 12px', fontSize: 11, fontWeight: 800, letterSpacing: 0.4 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((it) => {
              const p = lineParts(it.quantity, it.unitPrice, gstReg, cfg.pdf.gstInclusive);
              return (
                <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px' }}>{it.description}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{it.quantity}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCurrency(p.unit)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{gstReg ? 'Included' : '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(p.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* EFT + totals */}
        <div style={{ display: 'flex', gap: 18, marginTop: 22, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <PaymentBox business={business} invoice={invoice} accent={red} title="EFT PAYMENT DETAILS" />
          </div>
          <div style={{ width: 290 }}>
            <TotalsRows invoice={invoice} gstReg={gstReg} gstIncludedLabel />
            <div style={{ background: red, color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderRadius: 8, marginTop: 6 }}>
              <span style={{ fontWeight: 800 }}>{invoice.status === 'Paid' ? 'TOTAL PAID' : 'TOTAL DUE'}</span>
              <span style={{ fontWeight: 800, fontSize: 18 }}>{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.status !== 'Quote' && (
              <>
                <Row label="Amount Paid" value={formatCurrency(paid)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', color: red, fontWeight: 800 }}>
                  <span>Balance</span>
                  <span>{formatCurrency(balance)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>{cfg.pdf.footerNote}</div>
        <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 6 }}>{cfg.pdf.terms.join('   •   ')}</div>
      </div>
    </div>
  );
}

// ====================== shared bits ======================

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', fontSize: 12.5, color: '#475569' }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function TotalsRows({ invoice, gstReg, gstIncludedLabel }: { invoice: Invoice; gstReg: boolean; gstIncludedLabel?: boolean }) {
  return (
    <div>
      <Row label={gstReg ? 'Subtotal (ex GST)' : 'Subtotal'} value={formatCurrency(invoice.subtotal)} />
      {gstReg && <Row label="GST (10%)" value={gstIncludedLabel ? 'Included' : formatCurrency(invoice.gstAmount)} />}
    </div>
  );
}

function PaymentBox({ business, invoice, accent, title }: { business: Business; invoice: Invoice; accent: string; title: string }) {
  if (!business.bsb && !business.accountNumber && !business.accountName) return null;
  return (
    <div style={{ background: '#f1f5f9', borderLeft: `4px solid ${accent}`, borderRadius: 8, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800, fontSize: 12.5 }}>
        <CreditCard size={15} color={accent} /> {title}
      </div>
      <div style={{ fontSize: 12, color: '#475569', marginTop: 8, lineHeight: 1.7 }}>
        {business.accountName && <div>Account Name: {business.accountName}</div>}
        {business.bsb && <div>BSB: {business.bsb}</div>}
        {business.accountNumber && <div>Account Number: {business.accountNumber}</div>}
        <div style={{ fontWeight: 700 }}>Reference: {invoice.invoiceNumber}</div>
      </div>
    </div>
  );
}

function NotesTerms({ title, body, accent }: { title: string; body: string[]; accent: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ color: accent, fontWeight: 800, fontSize: 11.5, letterSpacing: 0.6 }}>{title}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>
        {body.map((t, i) => (
          <div key={i}>{title === 'TERMS' ? `• ${t}` : t}</div>
        ))}
      </div>
    </div>
  );
}
