-- Migration: Add user details columns to requested_dresses table

ALTER TABLE public.requested_dresses
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS user_phone TEXT;

CREATE INDEX IF NOT EXISTS requested_dresses_user_id_idx
  ON public.requested_dresses (user_id)
  WHERE user_id IS NOT NULL;
