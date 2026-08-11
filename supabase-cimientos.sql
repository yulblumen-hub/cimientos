-- ============================================================
-- Cimientos — sincronización entre dispositivos
--
-- IMPORTANTE: correr esto en un proyecto de Supabase PROPIO de
-- esta app. Cimientos y Mis Finanzas son dos apps separadas.
--
-- Diseño: un documento JSON por persona, con marca de tiempo.
-- Gana el más reciente. Para un teléfono y una computadora del
-- mismo dueño alcanza de sobra, y evita media app de código de
-- sincronización tabla por tabla. La app siempre escribe primero
-- en el dispositivo, así que funciona igual sin internet.
-- ============================================================

create table if not exists public.cimientos_estado (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  datos       jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);

-- ============================================================
-- RLS: cada persona ve y toca únicamente su propia fila.
-- Esto es lo que hace que la clave pública del navegador sea
-- inofensiva: sin sesión no se lee nada, y con sesión sólo lo tuyo.
-- ============================================================

alter table public.cimientos_estado enable row level security;

drop policy if exists "propio_select" on public.cimientos_estado;
drop policy if exists "propio_insert" on public.cimientos_estado;
drop policy if exists "propio_update" on public.cimientos_estado;
drop policy if exists "propio_delete" on public.cimientos_estado;

create policy "propio_select" on public.cimientos_estado
  for select using (auth.uid() = user_id);

create policy "propio_insert" on public.cimientos_estado
  for insert with check (auth.uid() = user_id);

create policy "propio_update" on public.cimientos_estado
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "propio_delete" on public.cimientos_estado
  for delete using (auth.uid() = user_id);

-- Marca de tiempo siempre fresca del lado del servidor.
create or replace function public.tocar_cimientos_estado()
returns trigger language plpgsql as $$
begin
  new.actualizado = greatest(new.actualizado, now());
  return new;
end $$;

drop trigger if exists trg_tocar_cimientos on public.cimientos_estado;
create trigger trg_tocar_cimientos before insert or update on public.cimientos_estado
  for each row execute function public.tocar_cimientos_estado();
