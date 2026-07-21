-- 1. Create requested_dresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.requested_dresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL CHECK (
    char_length(image_url) <= 2048
    AND image_url LIKE 'https://%'
  ),
  storage_path TEXT NOT NULL UNIQUE CHECK (
    char_length(trim(storage_path)) BETWEEN 3 AND 512
  ),
  description TEXT CHECK (
    description IS NULL OR char_length(trim(description)) BETWEEN 1 AND 160
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'published', 'hidden', 'rejected')
  ),
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update constraint if table already existed with older constraint
ALTER TABLE public.requested_dresses DROP CONSTRAINT IF EXISTS requested_dresses_status_check;
ALTER TABLE public.requested_dresses ADD CONSTRAINT requested_dresses_status_check 
CHECK (status IN ('pending', 'published', 'hidden', 'rejected'));

-- Index and RLS for requested_dresses
CREATE INDEX IF NOT EXISTS requested_dresses_public_feed_idx
  ON public.requested_dresses (created_at DESC)
  WHERE status = 'published';

ALTER TABLE public.requested_dresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requested_dresses_public_read" ON public.requested_dresses;
CREATE POLICY "requested_dresses_public_read"
  ON public.requested_dresses FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

REVOKE ALL ON public.requested_dresses FROM anon, authenticated;
GRANT SELECT (id, image_url, description, created_at)
  ON public.requested_dresses TO anon, authenticated;
GRANT ALL ON public.requested_dresses TO service_role;

-- Storage Bucket Setup for requested-dresses
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'requested-dresses',
  'requested-dresses',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "requested_dresses_images_public_read" ON storage.objects;
CREATE POLICY "requested_dresses_images_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'requested-dresses');

-- 2. Create requested_dress_comments table
CREATE TABLE IF NOT EXISTS public.requested_dress_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requested_dress_id UUID REFERENCES public.requested_dresses(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL CHECK (char_length(trim(comment_text)) >= 1),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.requested_dress_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved comments" ON public.requested_dress_comments;
CREATE POLICY "Public can view approved comments" 
ON public.requested_dress_comments FOR SELECT 
USING (status = 'approved');

DROP POLICY IF EXISTS "Public can insert comments" ON public.requested_dress_comments;
CREATE POLICY "Public can insert comments" 
ON public.requested_dress_comments FOR INSERT 
WITH CHECK (true);

GRANT SELECT, INSERT ON public.requested_dress_comments TO anon, authenticated;
GRANT ALL ON public.requested_dress_comments TO service_role;
