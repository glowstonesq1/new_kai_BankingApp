-- Add optional duration to savings goals for daily savings calculator
ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS duration_days INT CHECK (duration_days > 0);
