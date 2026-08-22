-- Add dynamic hero fields to store settings
ALTER TABLE public.settings 
ADD COLUMN hero_eyebrow TEXT NOT NULL DEFAULT 'New Season, New You',
ADD COLUMN hero_title TEXT NOT NULL DEFAULT 'The Art of',
ADD COLUMN hero_cursive_title TEXT NOT NULL DEFAULT 'Darajni.',
ADD COLUMN hero_subtitle TEXT NOT NULL DEFAULT 'Timeless pieces. Modern looks. Made to empower every woman.',
ADD COLUMN hero_font_family TEXT NOT NULL DEFAULT 'Great_Vibes',
ADD COLUMN hero_accent_color TEXT NOT NULL DEFAULT '#B58A4A';
