import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminConfigured, adminDb } from '@/lib/firebaseAdmin';
import { getBusinessConfig, formatCurrency } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function localToday(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function daysOverdue(dueDate: string): number {
  const [y, m, d] = dueDate.split('-').map(Number);
  const [ty, tm, td] = localToday().split('-').map(Number);
  const diff = Math.floor((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86_400_000);
  return diff > 0 ? diff : 0;
}

interface Row {
  businessId: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  dueDate: string;
}

export async function GET(req: Request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  if (!adminConfigured()) return NextResponse.json({ skipped: 'firebase-admin not configured' });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ skipped: 'resend not configured' });

  const today = localToday();
  const snap = await adminDb().collection('invoices').where('status', 'in', ['Pending', 'Overdue']).get();

  const rows: Row[] = [];
  snap.forEach((doc) => {
    const i = doc.data() as Row & { status: string };
    if (i.status === 'Overdue' || (i.dueDate && i.dueDate < today)) {
      rows.push({ businessId: i.businessId, invoiceNumber: i.invoiceNumber, customerName: i.customerName, total: i.total, dueDate: i.dueDate });
    }
  });

  if (rows.length === 0) return NextResponse.json({ ok: true, overdue: 0 });

  // Group by business
  const byBiz = new Map<string, Row[]>();
  for (const r of rows) {
    if (!byBiz.has(r.businessId)) byBiz.set(r.businessId, []);
    byBiz.get(r.businessId)!.push(r);
  }

  let total = 0;
  const sections = [...byBiz.entries()]
    .map(([bizId, list]) => {
      const name = getBusinessConfig(bizId)?.name || bizId;
      const items = list
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .map((r) => {
          total += r.total;
          const od = daysOverdue(r.dueDate);
          return `<tr>
            <td style="padding:6px 10px">${r.invoiceNumber}</td>
            <td style="padding:6px 10px">${r.customerName}</td>
            <td style="padding:6px 10px;text-align:right">${formatCurrency(r.total)}</td>
            <td style="padding:6px 10px;color:#dc2626">${od} day${od === 1 ? '' : 's'}</td>
          </tr>`;
        })
        .join('');
      return `<h3 style="margin:18px 0 6px">${name} — ${list.length} overdue</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <tr style="text-align:left;color:#64748b">
            <th style="padding:6px 10px">Invoice</th><th style="padding:6px 10px">Customer</th>
            <th style="padding:6px 10px;text-align:right">Amount</th><th style="padding:6px 10px">Overdue</th>
          </tr>${items}
        </table>`;
    })
    .join('');

  const owner =
    process.env.OWNER_EMAIL || (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '').split(',')[0].trim();
  const from = `Invoice App <${process.env.RESEND_FROM_ADDRESS || 'onboarding@resend.dev'}>`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from,
    to: owner,
    subject: `${rows.length} overdue invoice${rows.length === 1 ? '' : 's'} — ${formatCurrency(total)} outstanding`,
    html: `<div style="font-family:Arial,sans-serif;color:#0f172a">
      <p>Good morning. These invoices are overdue and may need a follow-up:</p>
      ${sections}
      <p style="margin-top:18px;font-weight:bold">Total outstanding: ${formatCurrency(total)}</p>
    </div>`,
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true, overdue: rows.length, emailed: owner });
}
