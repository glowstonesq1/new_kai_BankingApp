# KidBank 🏦

A full-stack kids' banking web app that teaches children about money management through saving, investing in stocks, fixed deposits, recurring deposits, payments, and savings goals.

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Supabase (Auth + PostgreSQL + Edge Functions)
- **Charts**: Recharts
- **QR Scanner**: html5-qrcode
- **State**: Zustand
- **Routing**: React Router v6

## Roles

- **Admin** – Full control: manage kids, deposit/withdraw, control stock market, publish news
- **Kid** – Their own dashboard: view balance, invest in stocks/FD/RD, scan QR to pay, set savings goals

## Quick Setup

### 1. Supabase Project

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/migrations/001_initial_schema.sql`
3. Create your admin user:
   - Go to **Authentication → Users → Add User**
   - Email: `admin@kidbank.app`, Password: your choice
   - Note the UUID shown
   - In SQL Editor run:
     ```sql
     INSERT INTO public.users (id, username, display_name, role)
     VALUES ('<YOUR_UUID>', 'admin', 'KidBank Admin', 'admin')
     ON CONFLICT (id) DO UPDATE SET role = 'admin';
     ```

### 2. Environment Variables

```bash
cp .env.example .env
```

Fill in your Supabase URL and anon key from **Settings → API**:

```env
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`

### 4. Deploy to Vercel

```bash
npm run build
# Push to GitHub, connect repo to Vercel
# Add environment variables in Vercel dashboard
```

## Edge Functions (Optional)

Deploy to automate stock price ticks and investment maturity:

```bash
supabase functions deploy price-tick
supabase functions deploy mature-investments
```

Schedule via Supabase dashboard → **Database → Extensions → pg_cron**:

```sql
-- Price tick every 10 minutes
SELECT cron.schedule('price-tick', '*/10 * * * *',
  $$SELECT net.http_post(
    url := 'https://yourproject.supabase.co/functions/v1/price-tick',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )$$
);

-- Mature investments daily at midnight
SELECT cron.schedule('mature-investments', '0 0 * * *',
  $$SELECT net.http_post(
    url := 'https://yourproject.supabase.co/functions/v1/mature-investments',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )$$
);
```

## Creating Kid Accounts

Login as admin → Kids tab → "New Kid" button.

Kids log in at `/login` using their **username** (not email) and password.

## Database Schema

See `supabase/migrations/001_initial_schema.sql` for the full schema including:
- Row Level Security policies
- Auto-user-creation trigger
- 6 seeded fictional stocks
- Cleanup function for old transactions

## Stocks (Fictional)

| Company | Ticker | Theme |
|---------|--------|-------|
| SolarWave Energy | SWE | Renewable energy |
| MunchBox Foods | MBF | Snack foods |
| ZipRide Motors | ZRM | Electric scooters |
| CloudNest Tech | CNT | Kids cloud storage |
| GreenGrow Farms | GGF | Urban farming |
| PixelPlay Games | PPG | Mobile gaming |
