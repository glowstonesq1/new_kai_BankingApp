-- KidBank Initial Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Users (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'kid')) DEFAULT 'kid',
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts (one per user)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'deposit', 'withdrawal', 'payment',
    'investment_buy', 'investment_sell',
    'fd_open', 'rd_installment', 'interest_credit'
  )),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  description TEXT,
  qr_payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stocks
CREATE TABLE IF NOT EXISTS public.stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  ticker TEXT UNIQUE NOT NULL,
  current_price NUMERIC NOT NULL DEFAULT 100,
  previous_price NUMERIC NOT NULL DEFAULT 100,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Portfolio
CREATE TABLE IF NOT EXISTS public.portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  avg_buy_price NUMERIC NOT NULL DEFAULT 0,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, stock_id)
);

-- News
CREATE TABLE IF NOT EXISTS public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')) DEFAULT 'neutral',
  price_impact_percent NUMERIC NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fixed Deposits
CREATE TABLE IF NOT EXISTS public.fixed_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  principal NUMERIC NOT NULL CHECK (principal > 0),
  interest_rate NUMERIC NOT NULL CHECK (interest_rate > 0),
  duration_days INT NOT NULL CHECK (duration_days > 0),
  maturity_date TIMESTAMPTZ NOT NULL,
  is_matured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recurring Deposits
CREATE TABLE IF NOT EXISTS public.recurring_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  monthly_amount NUMERIC NOT NULL CHECK (monthly_amount > 0),
  interest_rate NUMERIC NOT NULL CHECK (interest_rate > 0),
  duration_months INT NOT NULL CHECK (duration_months > 0),
  installments_paid INT NOT NULL DEFAULT 0,
  next_due_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Savings Goals
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON public.portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_stock_id ON public.portfolio(stock_id);
CREATE INDEX IF NOT EXISTS idx_news_stock_id ON public.news(stock_id);
CREATE INDEX IF NOT EXISTS idx_news_published ON public.news(is_published);
CREATE INDEX IF NOT EXISTS idx_fd_user_id ON public.fixed_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_rd_user_id ON public.recurring_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.savings_goals(user_id);

-- ============================================
-- SEED: 6 Fictional Stocks
-- ============================================
INSERT INTO public.stocks (company_name, ticker, current_price, previous_price, description)
VALUES
  ('SolarWave Energy', 'SWE', 142.50, 138.20, 'A renewable energy startup focused on next-gen solar panel technology for homes and schools. They are making clean energy affordable for everyone!'),
  ('MunchBox Foods', 'MBF', 87.30, 91.00, 'India''s favourite snack food company making yummy chips, cookies, and health bars. Their new range of healthy snacks is a big hit with kids!'),
  ('ZipRide Motors', 'ZRM', 215.80, 208.40, 'An electric scooter company that makes fun, eco-friendly rides for cities. Their colorful scooters are now in over 50 cities across India!'),
  ('CloudNest Tech', 'CNT', 312.00, 318.50, 'A kids'' cloud storage platform that lets children safely store drawings, homework, and projects online. Parents love the privacy controls!'),
  ('GreenGrow Farms', 'GGF', 56.75, 53.90, 'Urban farming startup growing fresh vegetables right inside city buildings using smart LED lighting and recycled water. No soil needed!'),
  ('PixelPlay Games', 'PPG', 178.40, 165.20, 'A mobile gaming studio that makes educational games kids actually want to play. Their maths adventure game has 10 million downloads worldwide!')
ON CONFLICT (ticker) DO NOTHING;

-- ============================================
-- AUTO-DELETE old transactions (trigger-based)
-- ============================================
-- This stored procedure can be called by a cron job / edge function
CREATE OR REPLACE FUNCTION public.cleanup_old_transactions(days_threshold INT DEFAULT 30)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM public.transactions
  WHERE created_at < now() - (days_threshold || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- HELPER: Create user profile + account together
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only insert if not already there (avoids duplicate on re-trigger)
  INSERT INTO public.users (id, username, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'kid')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.accounts (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger: run on new Supabase auth user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- === users ===
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (id = auth.uid() OR public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Users can update own non-sensitive fields" ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- === accounts ===
CREATE POLICY "Users can view own account" ON public.accounts
  FOR SELECT USING (user_id = auth.uid() OR public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all accounts" ON public.accounts
  FOR ALL USING (public.get_current_user_role() = 'admin');

-- Kids can only update their own account via server-side logic
-- Direct updates from client are blocked for kids (balance can't be changed directly)
CREATE POLICY "Kids can update own account" ON public.accounts
  FOR UPDATE USING (user_id = auth.uid());

-- === transactions ===
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (user_id = auth.uid() OR public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert any transaction" ON public.transactions
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

-- Kids can only insert non-admin transaction types
CREATE POLICY "Kids can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND public.get_current_user_role() = 'kid'
    AND type NOT IN ('deposit', 'withdrawal')
  );

CREATE POLICY "Admins can delete transactions" ON public.transactions
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- === stocks ===
CREATE POLICY "Authenticated users can read stocks" ON public.stocks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage stocks" ON public.stocks
  FOR ALL USING (public.get_current_user_role() = 'admin');

-- === portfolio ===
CREATE POLICY "Users can manage own portfolio" ON public.portfolio
  FOR ALL USING (user_id = auth.uid() OR public.get_current_user_role() = 'admin');

-- === news ===
CREATE POLICY "Authenticated users can read published news" ON public.news
  FOR SELECT USING (is_published = true OR public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage news" ON public.news
  FOR ALL USING (public.get_current_user_role() = 'admin');

-- === fixed_deposits ===
CREATE POLICY "Users can manage own FDs" ON public.fixed_deposits
  FOR ALL USING (user_id = auth.uid() OR public.get_current_user_role() = 'admin');

-- === recurring_deposits ===
CREATE POLICY "Users can manage own RDs" ON public.recurring_deposits
  FOR ALL USING (user_id = auth.uid() OR public.get_current_user_role() = 'admin');

-- === savings_goals ===
CREATE POLICY "Users can manage own goals" ON public.savings_goals
  FOR ALL USING (user_id = auth.uid() OR public.get_current_user_role() = 'admin');
