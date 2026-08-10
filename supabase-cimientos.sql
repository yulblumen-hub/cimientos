-- ============================================================
-- Cimientos — esquema para cuando pases a multiusuario con login.
--
-- IMPORTANTE: corré esto en un proyecto de Supabase PROPIO de esta app.
-- Cimientos y Mis Finanzas son dos apps separadas y no comparten datos.
--
-- Cada tabla lleva user_id y RLS activo: cada persona ve sólo lo suyo,
-- incluso usando la misma clave pública desde el navegador.
-- ============================================================

-- ---------- PILARES ----------
create table if not exists public.pilares (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nombre      text not null,
  definicion  text default '',
  color       text not null default '#7a8b6f',
  orden       int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- MÁXIMAS ----------
create table if not exists public.maximas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  pilar_id     uuid references public.pilares(id) on delete set null,
  texto        text not null,
  fuente       text default '',
  estado       text not null default 'nueva'
               check (estado in ('nueva','practica','cimiento')),
  favorita     boolean not null default false,
  resonancias  int not null default 0,
  ultima_vista timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------- NOTAS (diario) ----------
create table if not exists public.notas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  maxima_id  uuid references public.maximas(id) on delete set null,
  pilar_id   uuid references public.pilares(id) on delete set null,
  texto      text not null,
  fecha      timestamptz not null default now()
);

-- ---------- REGISTROS (cierre del día) ----------
create table if not exists public.registros (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  fecha     date not null,
  maxima_id uuid references public.maximas(id) on delete set null,
  practica  text not null check (practica in ('si','medias','no')),
  unique (user_id, fecha)          -- un cierre por día y por persona
);

-- ---------- CONFIG (una fila por persona) ----------
create table if not exists public.config (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  foco_pilar_id uuid references public.pilares(id) on delete set null,
  foco_semana   text,
  umbral        int  not null default 12,
  hora          text not null default '07:30',
  notif         boolean not null default false,
  hoy_fecha     date,
  hoy_maxima_id uuid references public.maximas(id) on delete set null,
  ultimo_aviso  date
);

-- ============================================================
-- RLS: cada quien ve y toca sólo sus filas.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['pilares','maximas','notas','registros','config'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "propio_select" on public.%I;', t);
    execute format('drop policy if exists "propio_insert" on public.%I;', t);
    execute format('drop policy if exists "propio_update" on public.%I;', t);
    execute format('drop policy if exists "propio_delete" on public.%I;', t);
    execute format('create policy "propio_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('create policy "propio_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "propio_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('create policy "propio_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ---------- índices ----------
create index if not exists ix_maximas_user   on public.maximas(user_id);
create index if not exists ix_maximas_pilar  on public.maximas(pilar_id);
create index if not exists ix_notas_user     on public.notas(user_id, fecha desc);
create index if not exists ix_registros_user on public.registros(user_id, fecha desc);
create index if not exists ix_pilares_user   on public.pilares(user_id, orden);
