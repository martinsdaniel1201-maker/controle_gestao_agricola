-- ══════════════════════════════════════════════
-- Central de Controle Agrícola — Apontamento de Horas
-- Rode isto UMA VEZ no SQL Editor do Supabase (projeto do app).
-- Colunas batem com a aba "Operadores_Geral_app" da planilha CONTROLE
-- DANIEL. Alimentada pelo Sincronizar_APP.pyw (mesmo mecanismo automático
-- de Liberações/O.S. em Aberto) — não precisa de import manual.
-- ══════════════════════════════════════════════

create table if not exists public.central_apontamentos (
  id               bigint generated always as identity primary key,
  empresa          text,
  data_inicio      text,
  cod_equip        text,
  horas_apontadas  numeric,
  cc_equipamento   text,
  responsavel      text,
  supervisor       text,
  horas_dia        numeric,
  importado_em     timestamptz not null default now()
);

comment on table public.central_apontamentos is
  'Apontamento de Horas da Central de Controle Agrícola (planejado × apontado, por responsável/equipamento). Alimentada automaticamente pelo Sincronizar_APP.pyw a partir da aba "Operadores_Geral_app".';

alter table public.central_apontamentos enable row level security;

drop policy if exists "central_apontamentos_select_anon" on public.central_apontamentos;
create policy "central_apontamentos_select_anon" on public.central_apontamentos
  for select using (true);
