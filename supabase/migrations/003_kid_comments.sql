-- Kid comments table: admins write suggestions, kids read them
CREATE TABLE IF NOT EXISTS public.kid_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_id   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  comment    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kid_comments ENABLE ROW LEVEL SECURITY;

-- Kids can read their own comments
CREATE POLICY "kids_read_own_comments"
  ON public.kid_comments
  FOR SELECT
  USING (auth.uid() = kid_id);

-- Admins can insert, update, delete, and select any comment
CREATE POLICY "admins_manage_comments"
  ON public.kid_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
