-- ══════════════════════════════════════════════
-- Central de Controle Agrícola — Painel de O.S. em Aberto
-- Rode isto UMA VEZ no SQL Editor do Supabase (projeto do app).
-- Colunas batem com a aba "O.S_Dias_app" da planilha CONTROLE DANIEL
-- (mesma origem do "SQL DE O.S" rodado no Oracle/oraipi).
-- Import é manual: Table Editor → central_os → Insert → Import data.
-- ══════════════════════════════════════════════

create table if not exists public.central_os (
  id          bigint generated always as identity primary key,
  empresa     text,
  responsavel text,
  fzd         text,
  dsc_fzd     text,
  tipo_os     text,
  os          text,
  data        text,
  dias        numeric,
  status      text,   -- opcional: se vier vazio, o app calcula (<7 / 7-15 / >15) a partir de "dias"
  layer       text,   -- opcional
  importado_em timestamptz not null default now()
);

comment on table public.central_os is
  'Painel de O.S. em Aberto da Central de Controle Agrícola. Alimentada por importação manual de Excel/CSV no Table Editor do Supabase (planilha "O.S_Dias_app") — sem planilha Google publicada, sem botão de sync no app.';

alter table public.central_os enable row level security;

drop policy if exists "central_os_select_anon" on public.central_os;
create policy "central_os_select_anon" on public.central_os
  for select using (true);

-- Antes de importar um Excel novo, rode isto pra não duplicar:
-- truncate table public.central_os;
