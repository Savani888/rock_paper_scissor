# Supabase Database Schema

Use Supabase PostgreSQL.

Supabase Auth already provides `auth.users`, so do not create your own password table.

## Tables

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gesture_labels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create table public.dataset_samples (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  sample_type text not null check (sample_type in ('pose', 'motion')),
  landmark_vector jsonb not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

## Indexes

```sql
create index projects_user_id_idx on public.projects(user_id);
create index gesture_labels_project_id_idx on public.gesture_labels(project_id);
create index dataset_samples_project_id_idx on public.dataset_samples(project_id);
create index dataset_samples_project_label_idx on public.dataset_samples(project_id, label);
```

## Row-Level Security

Enable RLS:

```sql
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.gesture_labels enable row level security;
alter table public.dataset_samples enable row level security;
```

Profiles:

```sql
create policy "users can read own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "users can update own profile"
on public.profiles for update
using (auth.uid() = id);
```

Projects:

```sql
create policy "users can manage own projects"
on public.projects for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Gesture labels:

```sql
create policy "users can manage own labels"
on public.gesture_labels for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Dataset samples:

```sql
create policy "users can manage own samples"
on public.dataset_samples for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## Not Included

No tables for:

- model versions
- API keys
- rate limits
- monitoring
- audit logs
- billing
