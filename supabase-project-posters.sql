create table if not exists public.portfolio_project_posters (
  repo_name text primary key,
  poster_url text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolio_project_posters enable row level security;

drop policy if exists "Public can read enabled project posters" on public.portfolio_project_posters;
create policy "Public can read enabled project posters"
on public.portfolio_project_posters
for select
using (enabled = true);

create index if not exists portfolio_project_posters_enabled_idx
on public.portfolio_project_posters (enabled);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio',
  'portfolio',
  true,
  8388608,
  array[
    'image/png',`
    'image/jpeg',
    'image/webp',
    'image/avif',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
