create table if not exists communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  base_url text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id),
  external_id text not null,
  title text not null,
  original_url text not null unique,
  thumbnail_url text,
  summary text not null,
  author_name text,
  views integer,
  likes integer,
  comments_count integer,
  published_at timestamptz,
  collected_at timestamptz not null default now(),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  unique_key text not null unique,
  unique (community_id, external_id)
);

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null default 'editor',
  created_at timestamptz not null default now()
);

create table if not exists crawl_logs (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id),
  status text not null,
  message text,
  started_at timestamptz not null,
  finished_at timestamptz
);

create index if not exists posts_published_at_idx on posts (published_at desc);
create index if not exists posts_community_status_idx on posts (community_id, status);
