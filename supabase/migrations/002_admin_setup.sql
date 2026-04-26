-- Run this AFTER creating your admin user via Supabase Auth
-- Replace 'YOUR_ADMIN_USER_ID' with the actual UUID from auth.users

-- Example: Create admin profile
-- INSERT INTO public.users (id, username, display_name, role)
-- VALUES ('YOUR_ADMIN_USER_ID', 'admin', 'KidBank Admin', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- INSERT INTO public.accounts (user_id, balance)
-- VALUES ('YOUR_ADMIN_USER_ID', 0)
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- GRANT service_role access for edge functions
-- ============================================
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Allow the cleanup function to be called
GRANT EXECUTE ON FUNCTION public.cleanup_old_transactions(INT) TO service_role;
