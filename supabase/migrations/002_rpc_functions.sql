-- ============================================
-- RPC: Admin creates a kid account
-- ============================================
CREATE OR REPLACE FUNCTION public.create_kid_account(
  p_username TEXT,
  p_display_name TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM public.users WHERE id = auth.uid();
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create kid accounts';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE username = lower(p_username)) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;

  v_email := lower(p_username) || '@kidbank.app';
  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('username', lower(p_username), 'display_name', p_display_name, 'role', 'kid'),
    now(), now()
  );

  INSERT INTO public.users (id, username, display_name, role, is_frozen)
  VALUES (v_user_id, lower(p_username), p_display_name, 'kid', false)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    role = 'kid';

  INSERT INTO public.accounts (user_id, balance)
  VALUES (v_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN jsonb_build_object('id', v_user_id, 'email', v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_kid_account TO authenticated;


-- ============================================
-- RPC: Kid opens a fixed deposit (atomic)
-- ============================================
CREATE OR REPLACE FUNCTION public.create_fixed_deposit(
  p_user_id UUID,
  p_principal NUMERIC,
  p_interest_rate NUMERIC,
  p_duration_days INT,
  p_maturity_date TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id AND (SELECT role FROM public.users WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF (SELECT balance FROM public.accounts WHERE user_id = p_user_id) < p_principal THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  INSERT INTO public.fixed_deposits (
    user_id, principal, interest_rate, duration_days, maturity_date, is_matured
  ) VALUES (p_user_id, p_principal, p_interest_rate, p_duration_days, p_maturity_date, false);

  UPDATE public.accounts SET
    balance = balance - p_principal,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (
    p_user_id, 'fd_open', p_principal,
    format('Fixed Deposit for %s days @ %s%%', p_duration_days, p_interest_rate)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_fixed_deposit TO authenticated;
