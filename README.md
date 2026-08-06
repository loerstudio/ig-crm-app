# IG Lead Manager

Dead-simple CRM for tracking Instagram outreach and AI UGC leads.

## Features

- **3 Lead States**: TO CONTACT → FOLLOW UP → CLIENT
- **Dashboard**: Live counts for each status
- **Manual Add**: Quick form to add leads
- **CSV Import**: Bulk import from spreadsheet
- **Mobile-Friendly**: Perfect on phone and desktop
- **Instant Setup**: No database required

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`

## How to Use

### Add a Lead
1. Click "➕ Add Lead"
2. Enter: Brand name, Instagram username, Website (optional)
3. Click "Add"

### Import from CSV
1. Click "📥 Import CSV"
2. Upload file with columns: `brand_name`, `instagram_username`, `website`
3. Leads auto-import as "TO CONTACT"

### Track Status
- **TO CONTACT** → Click "Contacted ✅" → moves to FOLLOW UP
- **FOLLOW UP** → Click "Replied ✅" → moves to CLIENT (or "Forget ✕" to delete)
- **CLIENT** → Click "Delete" to remove

## Data Storage

Data saved in `.data/leads.json` (auto-created).

To reset: Delete `.data/` folder and restart.

## Deploy to Vercel

```bash
npm run build
vercel deploy
```

Data persists in `.data/` folder on Vercel filesystem.

## Stack

- Next.js 16
- React 19
- Tailwind CSS
- PapaParse (CSV)
- No database needed

Done.
