# Battery Invoices — Private PWA

A private, mobile-first invoicing app for three businesses in one place:

- 🚗 **Car Battery Perth**
- ⚡ **Battery Factory Direct**
- 🔋 **Fremantle Batteries**

Open the app → tap a business icon → create and send invoices for that business. Each business has its own customers, invoice numbering, settings, bank details and GST status.

**Features:** create / edit / duplicate / delete invoices · customer database · auto invoice numbers · GST toggle (Tax Invoice vs Invoice) · clean PDF generation on-device · share or download PDFs from your phone · statuses (Draft / Pending / Paid / Overdue, with automatic overdue detection) · search by customer, date or invoice number · dashboard with unpaid total and paid-this-month · installable PWA with app icon · works offline (Firestore cache) · 100% free tier, no paid APIs.

---

## Setup — step by step

### 1. Create a Firebase project (free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with a Google account.
2. Click **Add project**, name it (e.g. `battery-invoices`), disable Google Analytics (not needed), and create it.

### 2. Turn on Authentication (your 2 users)

1. In the Firebase console, open **Build → Authentication → Get started**.
2. On the **Sign-in method** tab, enable **Email/Password** (just the first toggle).
3. Go to the **Users** tab and click **Add user** twice — create the two accounts that are allowed in (e.g. you and your partner/staff member). Use strong passwords.
4. Optional but recommended: on the **Settings** tab of Authentication, under **User actions**, untick "Enable create (sign-up)" so nobody else can ever register.

### 3. Create the Firestore database

1. Open **Build → Firestore Database → Create database**.
2. Choose a region close to you (e.g. `australia-southeast1` / `australia-southeast2`) — note: Australian regions may show a "billing required" notice; if so pick `asia-southeast1` (Singapore), which is free-tier eligible and fast from Perth.
3. Start in **production mode**.
4. Go to the **Rules** tab, paste in the contents of [`firestore.rules`](./firestore.rules) from this repo, **replace the two example emails with your real ones**, then click **Publish**.

### 4. Register the web app and get your keys

1. In **Project settings** (gear icon) → **General** → **Your apps**, click the **`</>` (Web)** icon.
2. Nickname it `invoice-app`, don't tick hosting, click **Register app**.
3. Firebase shows a `firebaseConfig` object — keep this page open, you'll copy values from it next.

### 5. Configure the app

```bash
git clone <this repo>
cd invoice-app
npm install
cp .env.local.example .env.local
```

Open `.env.local` and fill in each value from the `firebaseConfig` shown in step 4, plus your two allowed emails:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=battery-invoices.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=battery-invoices
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=battery-invoices.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123
NEXT_PUBLIC_ALLOWED_EMAILS=you@example.com,partner@example.com
```

### 6. Run it locally

```bash
npm run dev
```

Open http://localhost:3000, sign in with one of your two accounts, tap a business, then go to **Settings** and fill in that business's ABN, phone, email, address, bank details and the **GST registered** toggle. Repeat for each of the three businesses.

### 7. Deploy free on Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com), sign up free with GitHub, and click **Add New → Project**, import the repo.
3. Before deploying, expand **Environment Variables** and add every variable from your `.env.local` (same names, same values).
4. Click **Deploy**. You'll get a URL like `https://battery-invoices.vercel.app`.
5. Back in Firebase: **Authentication → Settings → Authorized domains → Add domain** and add your `*.vercel.app` domain (localhost is already allowed).

> Netlify or Firebase Hosting also work — anything that hosts a Next.js app. Vercel's free Hobby tier is the easiest.

### 8. Install it on your phone

**iPhone (Safari):** open your Vercel URL → tap the **Share** button → **Add to Home Screen**. The battery icon appears like a normal app.

**Android (Chrome):** open the URL → tap **⋮** → **Add to Home screen** (or accept the install banner).

It opens full-screen with no browser bar, and invoice data is cached for offline viewing.

---

## Daily use

1. Tap the app icon → tap the business you're invoicing from.
2. **New Invoice** → pick a customer (or add one on the spot) → add line items → Save.
3. On the invoice screen tap **Share PDF** — the phone's share sheet opens so you can text, email, WhatsApp or AirDrop the PDF straight to the customer. Then set the status to **Sent**.
4. When they pay, open it and tap **Paid**.
5. The dashboard always shows what's unpaid and what you've been paid this month.

### GST behaviour

Per business, in **Settings → GST registered**:

- **On:** line item prices are treated as GST-exclusive, a 10% GST line is added, and the PDF is headed **TAX INVOICE** (ATO requirement for GST-registered businesses).
- **Off:** no GST is shown, the PDF is headed **INVOICE**, with a "No GST has been charged" note.

Each invoice snapshots the GST setting when created, so old invoices don't change if you flip the toggle later.

---

## Free-tier notes

- **Firebase Spark plan (free):** 50k Firestore reads / 20k writes per day and 1 GiB storage — thousands of invoices won't come close.
- **Vercel Hobby (free):** more than enough for a private 2-user app.
- PDFs are generated **on the phone** with jsPDF — no server, no API, no cost.
- No other services are used.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Firebase Auth + Firestore (with offline persistence) · jsPDF + autotable · installable PWA (manifest + service worker).
