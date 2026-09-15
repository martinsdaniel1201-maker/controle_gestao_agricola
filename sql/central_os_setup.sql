-- ══════════════════════════════════════════════
-- Central de Controle Agrícola — Painel de O.S. em Aberto
-- Rode isto UMA VEZ no SQL Editor do Supabase (projeto do app).
-- ══════════════════════════════════════════════

create table if not exists public.central_os (
  id           bigint generated always as identity primary key,
  empresa      text,
  os           text,
  dt_abert     text,
  fzd          text,
  dsc_fazenda  text,
  tipo         text,
  status_os    text,
  dias         numeric,
  linha_hash   text not null unique,
  atualizado_em timestamptz not null default now()
);

comment on table public.central_os is
  'Painel de O.S. em Aberto da Central de Controle Agrícola — alimentada pelo botão "Sincronizar" (nuvem) na tela, que lê uma aba publicada (CSV) da planilha do Power BI e faz upsert aqui.';

-- Mantém atualizado_em sempre correto a cada upsert
create or replace function public.central_os_set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_central_os_atualizado_em on public.central_os;
create trigger trg_central_os_atualizado_em
  before insert or update on public.central_os
  for each row execute function public.central_os_set_atualizado_em();

-- RLS: leitura liberada para o app (mesmo padrão das outras tabelas do
-- projeto — ajuste se o seu projeto usa uma policy diferente).
alter table public.central_os enable row level security;

drop policy if exists "central_os_select_anon" on public.central_os;
create policy "central_os_select_anon" on public.central_os
  for select using (true);

drop policy if exists "central_os_upsert_anon" on public.central_os;
create policy "central_os_upsert_anon" on public.central_os
  for insert with check (true);

drop policy if exists "central_os_update_anon" on public.central_os;
create policy "central_os_update_anon" on public.central_os
  for update using (true);
