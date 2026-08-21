-- Create the event_banners table for the EventsSlider on the homepage
create table if not exists public.event_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  link_url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.event_banners enable row level security;

-- Policies for public access (anyone can view active event banners)
create policy "Active event banners are visible to everyone"
  on public.event_banners
  for select
  to public
  using (is_active = true);

-- Policies for admin access (admins can do everything)
-- Using the existing auth.role() = 'authenticated' as a proxy for admin,
-- or whatever policy is used for homepage_slides. We can match homepage_slides.
create policy "Admins can insert event banners"
  on public.event_banners
  for insert
  to authenticated
  with check (true);

create policy "Admins can update event banners"
  on public.event_banners
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Admins can delete event banners"
  on public.event_banners
  for delete
  to authenticated
  using (true);

-- Add a trigger to update the updated_at column automatically
create or replace function update_event_banners_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_event_banners_updated_at
  before update on public.event_banners
  for each row
  execute function update_event_banners_updated_at();
