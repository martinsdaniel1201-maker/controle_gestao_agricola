/* ══════════════════════════════════════════════
CLIENTE SUPABASE (precisa ser inicializado ANTES de
qualquer função que o utilize — ver INIT no fim do arquivo,
que chama carregarDadosGATEC() de forma síncrona no carregamento)
══════════════════════════════════════════════ */
const _SB_URL  = 'https://umlwcilvhpoxhnqaalqn.supabase.co';
const _SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbHdjaWx2aHBveGhucWFhbHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODExNjUsImV4cCI6MjA5NjU1NzE2NX0.HMw-vhMYDf6zfUrHiNNDZ1xBMNt3J0FGo2mW1IHeT2Q';
const _sbClient = supabase.createClient(_SB_URL, _SB_KEY, {
  auth: {
    persistSession: true,          // mantém sessão no localStorage
    autoRefreshToken: true,        // renova token automaticamente
    storageKey: 'ctt_sb_session',  // chave isolada do resto do app
  }
});

/* ══════════════════════════════════════════════
FORMATADOR DE NÚMEROS CURTOS (Mobile-friendly)
Arredonda números grandes e limita casas decimais
para evitar quebra de layout no celular.
══════════════════════════════════════════════ */
function formatarNumeroCurto(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  
  // Converte formato BR (1.234,56) ou US (1234.56) para número real
  let num = parseFloat(String(valor).replace(/\./g, '').replace(',', '.'));
  if (isNaN(num)) return valor;
  
  // Se for maior ou igual a 1000 (ou menor ou igual a -1000), arredonda para inteiro
  if (Math.abs(num) >= 1000) {
    return Math.round(num).toLocaleString('pt-BR');
  }
  
  // Se for menor, mantém no máximo 1 casa decimal (ex: 12,3)
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/* ══════════════════════════════════════════════
ESTADO GLOBAL
══════════════════════════════════════════════ */
let frentes = [
  { id: 1, nome: "FRENTE 01", maquinas: 5, tch: 85, vel: 4.5, larg: 1.5, efc: 85, horas: 12, diesel: 48 }
];
let myChart = null;
let modoSimulacao = false;
// Dois conjuntos de dados estanques: real e simulado
let dadosReal = null;       // snapshot do modo real (gravado ao entrar em simulação)
let dadosSimulado = null;   // estado persistente do modo simulado entre alternâncias

/* ══════════════════════════════════════════════
NAVEGAÇÃO
══════════════════════════════════════════════ */
function showTab(e, id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (e && e.currentTarget) e.currentTarget.classList.add('active');
  
  // Sai do modo home: oculta o grid de menu, mostra o botão voltar
  const nav = document.getElementById('main-nav');
  nav.classList.remove('home-mode');
  nav.style.display = 'none';
  document.getElementById('btn-voltar-menu').style.display = 'flex';
  
  // Oculta a Sabedoria de Campo (exclusiva da tela inicial)
  document.body.classList.add('tab-open');
  
  // Indicador da aba ativa no botão voltar — com ícone
  const abaConfig = {
    'simulador':   { nome: 'SIMULADOR',    icon: 'fa-tractor' },
    'liberacoes_menu': { nome: 'LIBERAÇÕES', icon: 'fa-table' },
    'liberacoes':  { nome: 'LIBERAÇÕES',   icon: 'fa-table' },
    'clima_aba':   { nome: 'CLIMA & AGRO', icon: 'fa-cloud-sun' },
    'conf_menu':   { nome: 'CONFERÊNCIAS', icon: 'fa-clipboard-check' },
    'conf_os_aba': { nome: 'CONFERÊNCIAS', icon: 'fa-clipboard-check' },
    'conf_novo_recurso': { nome: 'CONFERÊNCIAS', icon: 'fa-tools' },
    'tratos_menu': { nome: 'TRATOS CULTURAIS', icon: 'fa-spray-can' },
    'tratos_aba':  { nome: 'TRATOS CULTURAIS', icon: 'fa-spray-can' },
    'tratos_novo_recurso': { nome: 'TRATOS CULTURAIS', icon: 'fa-tools' },
    'mapas_aba':   { nome: 'MAPAS',        icon: 'fa-map' },
    'calc_aba':    { nome: 'CALCULADORA',  icon: 'fa-calculator' },
    'plantio_aba': { nome: 'PLANTIO',      icon: 'fa-seedling' }
  };
  const cfg = abaConfig[id] || { nome: '', icon: 'fa-circle' };
  const nomeEl = document.getElementById('voltar-aba-nome');
  if (nomeEl) {
    nomeEl.innerHTML = `<span class="vab-icon"><i class="fas ${cfg.icon}"></i></span>${cfg.nome}`;
  }
  
  // Botão "Atualizar Indicadores" só aparece no Simulador
  const mostrarBtnAtualizar = (id === 'simulador');
  document.getElementById('btn-atualizar-global').style.display = mostrarBtnAtualizar ? 'block' : 'none';
  
  if (id === 'simulador') {
    if (document.getElementById('sub_dash').classList.contains('active')) renderChart();
  }
  if (id === 'conf_os_aba' && !window._confOsDados) {
    carregarDadosConfOS();
  }
  
  // ── ALTERAÇÃO AQUI: Aumenta o container APENAS na aba de liberações ──
  const containerPrincipal = document.querySelector('.container');
  if (containerPrincipal) {
    if (id === 'liberacoes' || id === 'conf_os_aba') {
      containerPrincipal.classList.add('container-larga');
    } else {
      containerPrincipal.classList.remove('container-larga');
    }
  }
  atualizarBottomNavAtivo(id);
}

/* Destaca o item correspondente na barra de navegação inferior. Seções sem
ícone próprio na barra (Conferências, Simulador, Clima, Calculadora)
destacam o botão "Mais", já que vivem dentro daquele sheet. */
function atualizarBottomNavAtivo(id) {
  const mapa = {
    'liberacoes_menu':     'bn-liberacoes',
    'liberacoes':          'bn-liberacoes',
    'tratos_menu':         'bn-tratos',
    'tratos_aba':          'bn-tratos',
    'tratos_novo_recurso': 'bn-tratos',
    'plantio_aba':         'bn-plantio',
    'mapas_aba':           'bn-mapas'
  };
  const alvoId = mapa[id] || 'bn-mais';
  document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
  const alvo = document.getElementById(alvoId);
  if (alvo) alvo.classList.add('active');
}

function abrirMaisSheet() {
  document.getElementById('mais-sheet-overlay').classList.add('open');
}

function fecharMaisSheet(e) {
  // Se veio de um clique no overlay, só fecha se o clique foi fora da caixa
  if (e && e.target && e.target.id !== 'mais-sheet-overlay') return;
  document.getElementById('mais-sheet-overlay').classList.remove('open');
}

/* Sub-tab da Calculadora */
function showCalcTab(id) {
  document.querySelectorAll('.calc-sub-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.calc-sub-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById(id);
  if (panel) panel.classList.add('active');
  
  // Ativa o botão correspondente
  document.querySelectorAll('.calc-sub-btn').forEach(b => {
    if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(id)) {
      b.classList.add('active');
    }
  });
}

function showSubTab(e, id) {
  document.querySelectorAll('.sub-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sub-tab-btn').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (e && e.currentTarget) e.currentTarget.classList.add('active');
  if (id === 'sub_dash') renderChart();
}

function voltarParaHome() {
  // Oculta todas as sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  
  // Volta ao modo home: mostra o grid de menu, oculta o botão voltar
  const nav = document.getElementById('main-nav');
  nav.classList.remove('home-mode');
  nav.style.display = '';
  
  // Força reflow para reiniciar a animação
  void nav.offsetWidth;
  nav.classList.add('home-mode');
  
  document.getElementById('btn-voltar-menu').style.display = 'none';
  document.getElementById('btn-atualizar-global').style.display = 'none';
  document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
  document.getElementById('mais-sheet-overlay').classList.remove('open');
  
  // Reexibe a Sabedoria de Campo
  document.body.classList.remove('tab-open');
  
  // Limpa indicador de aba
  const nomeEl = document.getElementById('voltar-aba-nome');
  if (nomeEl) nomeEl.textContent = '';
  
  // ── ALTERAÇÃO AQUI: Remove a largura total ao voltar para a Home ──
  const containerPrincipal = document.querySelector('.container');
  if (containerPrincipal) {
    containerPrincipal.classList.remove('container-larga');
  }
  
  // Scrolla para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════
KEBAB MENU
══════════════════════════════════════════════ */
function toggleKebab(e) {
  e.stopPropagation();
  const menu = document.getElementById('kebab-menu');
  const isOpen = menu.classList.contains('open');
  if (!isOpen) atualizarKebabMenu(); // monta itens contextuais antes de abrir
  menu.classList.toggle('open');
}

function fecharKebab() {
  document.getElementById('kebab-menu').classList.remove('open');
}

document.addEventListener('click', function(e) {
  const wrap = document.getElementById('kebab-btn-wrap');
  if (wrap && !wrap.contains(e.target)) fecharKebab();
});

/* ── Monta os itens do kebab conforme a aba ativa ── */
function atualizarKebabMenu() {
  const menu = document.getElementById('kebab-menu');
  if (!menu) return;
  const sec = document.querySelector('.section.active');
  const abaId = sec ? sec.id : null;
  
  let itens = [];
  if (abaId === 'simulador') {
    itens = [
      { secao: 'App' },
      { label: 'Sincronizar atualização', icon: 'fas fa-sync-alt', acao: 'atualizar' },
    ];
  } else if (abaId === 'liberacoes') {
    itens = [
      { secao: 'Exportar' },
      { label: 'Exportar PDF', icon: 'fas fa-file-pdf', acao: 'pdf' },
      { label: 'Exportar Excel', icon: 'fas fa-file-excel', acao: 'excel' },
      { secao: 'App' },
      { label: 'Sincronizar atualização', icon: 'fas fa-sync-alt', acao: 'atualizar' },
    ];
  } else if (abaId === 'conf_os_aba') {
    itens = [
      { secao: 'Exportar' },
      { label: 'Exportar PDF', icon: 'fas fa-file-pdf', acao: 'pdf' },
      { label: 'Exportar Excel', icon: 'fas fa-file-excel', acao: 'excel' },
      { secao: 'App' },
      { label: 'Sincronizar atualização', icon: 'fas fa-sync-alt', acao: 'atualizar' },
    ];
  } else if (abaId === 'tratos_aba') {
    itens = [
      { secao: 'Exportar' },
      { label: 'Exportar PDF', icon: 'fas fa-file-pdf', acao: 'pdf' },
      { label: 'Exportar Excel', icon: 'fas fa-file-excel', acao: 'excel' },
      { secao: 'App' },
      { label: 'Sincronizar atualização', icon: 'fas fa-sync-alt', acao: 'atualizar' },
    ];
  } else if (abaId === 'plantio_aba') {
    itens = [
      { secao: 'Exportar' },
      { label: 'Exportar PDF', icon: 'fas fa-file-pdf', acao: 'pdf' },
      { secao: 'App' },
      { label: 'Sincronizar atualização', icon: 'fas fa-sync-alt', acao: 'atualizar' },
    ];
  } else {
    // Clima, Mapas, Calculadora — sem exportação, só sincronizar
    itens = [
      { secao: 'App' },
      { label: 'Sincronizar atualização', icon: 'fas fa-sync-alt', acao: 'atualizar' },
    ];
  }
  
  menu.innerHTML = itens.map(item => {
    if (item.secao) return `<div class="kebab-section-label">${item.secao}</div>`;
    return `<div class="kebab-item" onclick="kebabAcao('${item.acao}')"> <i class="${item.icon}"></i> ${item.label} </div>`;
  }).join('');
}

function kebabAcao(acao) {
  fecharKebab();
  switch (acao) {
    case 'pdf': {
      const secAtiva = document.querySelector('.section.active');
      if (!secAtiva) { showToast('⚠️ Abra uma aba primeiro.', 'error'); return; }
      const sid = secAtiva.id;
      if (sid === 'liberacoes') exportarPDFLiberacoes();
      else if (sid === 'conf_os_aba') exportarPDFConfOS();
      else if (sid === 'tratos_aba') exportarPDFTratos();
      else if (sid === 'plantio_aba') {
        if (document.getElementById('plantio-comparar')?.style.display !== 'none') exportarPDFComparar();
        else exportarPDFMapaPlantio();
      }
      else showToast('ℹ️ Exportação em PDF disponível em Liberações, Conferências, Tratos e Plantio.', 'info', 3000);
      break;
    }
    case 'excel': {
      const secAtiva = document.querySelector('.section.active');
      if (!secAtiva) { showToast('⚠️ Abra uma aba primeiro.', 'error'); return; }
      const sid = secAtiva.id;
      if (sid === 'liberacoes') exportarExcelLiberacoes();
      else if (sid === 'conf_os_aba') exportarConfOsExcel();
      else if (sid === 'tratos_aba') exportarTratosExcel();
      else showToast('ℹ️ Exportação Excel disponível em Liberações, Conferências e Tratos Culturais.', 'info', 3000);
      break;
    }
    case 'atualizar':
      sincronizarApp();
      break;
  }
}

/* ══════════════════════════════════════════════
COPIAR RESUMO LIBERAÇÕES (por frente filtrada)
══════════════════════════════════════════════ */
function copiarResumoLiberacoes() {
  if (!window._gatecDados || window._gatecDados.length === 0) {
    showToast('⚠️ Nenhum dado carregado. Clique em "Atualizar dados" primeiro.', 'error', 3000);
    return;
  }
  
  // Lê os filtros ativos (chips de frente + fazenda + status)
  const frentesSel = window._libFrentesSelecionadas || new Set();
  const bStatus    = (document.getElementById('filtroStatus')?.value  || '');
  
  // Aplica os mesmos filtros da tabela
  const filtrados = window._gatecDados.filter(row => {
    const frente  = (row['FRENTE']       || '').trim();
    const status  = (row['STATUS OS']    || '').toUpperCase();
    const okFrente  = frentesSel.size === 0 || frentesSel.has(frente);
    const statusOk  = bStatus === '' || (bStatus === 'ENCERRADA' ? status.includes('ENCERRADA') : !status.includes('ENCERRADA'));
    return okFrente && _libFazendaOk(row['DESC.FAZENDA']) && statusOk;
  });
  
  if (filtrados.length === 0) {
    showToast('⚠️ Nenhum registro com o filtro atual.', 'error', 2500);
    return;
  }
  
  // Agrupa produção real por frente (somente frentes permitidas)
  const frentesPermitidas = ["401", "402", "403", "404", "451"];
  const resumo = {};
  let totalGeral = 0;
  
  filtrados.forEach(row => {
    const frente = (row['FRENTE'] || 'Sem Frente').trim();
    const prodReal = parseFloat(String(row['PROD. REAL'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
    
    if (!resumo[frente]) resumo[frente] = { prodReal: 0, abertas: 0, encerradas: 0 };
    resumo[frente].prodReal += prodReal;
    
    const status = (row['STATUS OS'] || '').toUpperCase();
    if (status.includes('ENCERRADA')) resumo[frente].encerradas++;
    else resumo[frente].abertas++;
    
    if (frentesPermitidas.includes(frente)) totalGeral += prodReal;
  });
  
  // Ordena por produção real decrescente
  const frentesOrdenadas = Object.entries(resumo).sort((a, b) => b[1].prodReal - a[1].prodReal);
  const now = new Date();
  const dataHora = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  
  const filtrosDesc = [
    frentesSel.size > 0 ? `Frente(s): "${[...frentesSel].join(', ')}"` : null,
    window._bFazenda ? `Fazenda: "${window._bFazenda.toUpperCase()}"` : null,
    bStatus  ? `Status: ${bStatus}` : null,
  ].filter(Boolean);
  
  const filtroLabel = filtrosDesc.length > 0 ? `🔍 Filtros: ${filtrosDesc.join(' · ')}` : '📋 Todos os registros';
  const medalhoes = ['🥇','🥈','🥉'];
  
  const linhasFrente = frentesOrdenadas.map(([frente, dados], idx) => {
    const medalha = idx < 3 ? medalhoes[idx] : `${idx+1}º`;
    const prodFmt = dados.prodReal > 0 ? formatarNumeroCurto(dados.prodReal) + ' t' : '—';
    const statusInfo = dados.abertas > 0 && dados.encerradas > 0
      ? `${dados.abertas} aberta(s) · ${dados.encerradas} encerrada(s)` 
      : dados.abertas > 0 ? `${dados.abertas} aberta(s)` : `${dados.encerradas} encerrada(s)`;
    return `${medalha} *Frente ${frente}:* ${prodFmt} _(${statusInfo})_`;
  }).join('\n');
  
  const totalFmt = totalGeral > 0 ? formatarNumeroCurto(totalGeral) + ' t' : '—';
  
  const texto = `🌾 *LIBERAÇÕES — RESUMO POR FRENTE*\n📅 ${dataHora}\n${filtroLabel}\n${'─'.repeat(32)}\n${linhasFrente}\n${'─'.repeat(32)}\n📦 *Total Produzido (frentes monitoradas):* ${totalFmt}\n${'─'.repeat(32)}\n_Gerado pelo CTT Controle Agrícola_`;
  
  navigator.clipboard.writeText(texto)
    .then(() => showToast('✅ Resumo de Liberações copiado! Cole no WhatsApp.'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ Resumo de Liberações copiado! Cole no WhatsApp.');
    });
}

/* ══════════════════════════════════════════════
CARD DE EXPORTAÇÃO — RESUMO POR FRENTE
(usado tanto pelo PDF quanto pelo envio de imagem)
══════════════════════════════════════════════ */
function _montarCardResumoExportacao() {
  const resumoCardsOriginal = document.getElementById('resumoCards');
  if (!resumoCardsOriginal || !resumoCardsOriginal.children.length) return null;
  
  const now = new Date();
  const dataFmt = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}`;
  const horaFmt = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  const totalTxt = document.getElementById('totalProduzido')?.textContent || '0 t';
  const liderTxt = document.getElementById('frenteLider')?.textContent || '-';
  
  const frentesSel = window._libFrentesSelecionadas || new Set();
  const fazendaTxt = _libFazendaFiltroTxt();
  const bStatus  = document.getElementById('filtroStatus')?.value || '';
  
  const filtrosDesc = [
    frentesSel.size > 0 ? `Frente(s) ${[...frentesSel].join(', ')}` : null,
    fazendaTxt ? `Fazenda: ${fazendaTxt}` : null,
    bStatus  ? `Status: ${bStatus === 'ENCERRADA' ? 'Encerradas' : 'Abertas'}` : null,
  ].filter(Boolean);
  
  const filtroLabel = filtrosDesc.length ? filtrosDesc.join(' · ') : 'Todos os registros';
  
  const wrap = document.createElement('div');
  wrap.id = 'resumo-export-render';
  wrap.style.cssText = `position:fixed; left:-9999px; top:0; width:720px; background:var(--surface); border-radius:24px; overflow:hidden; font-family:'Inter', sans-serif; box-shadow:0 8px 30px rgba(0,0,0,0.12);`;
  wrap.innerHTML = `
    <div style="background:var(--grad); padding:26px 30px; color:#fff; position:relative;">
      <div style="font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; opacity:0.85;">
        <i class="fas fa-seedling"></i> Usina Ipiranga · Unidade Passos/MG
      </div>
      <div style="font-size:24px; font-weight:800; margin-top:6px;"> 🌾 Resumo de Produção por Frente </div>
      <div style="font-size:12px; opacity:0.85; margin-top:6px;"> ${dataFmt} às ${horaFmt} · ${filtroLabel} </div>
    </div>
    <div style="padding:24px 30px 28px;">
      <div class="resumo-cards" id="resumo-export-cards" style="margin-top:0;"></div>
      <div class="resumo-total" style="margin-top:20px;">
        <div>Total Produzido: <span>${totalTxt}</span></div>
        <div>Frente Líder: <span>${liderTxt}</span></div>
      </div>
      <div style="text-align:center; margin-top:22px; font-size:10px; color:var(--text-3); letter-spacing:0.4px;">
        Gerado pelo CTT Controle Agrícola
      </div>
    </div>`;
  wrap.querySelector('#resumo-export-cards').innerHTML = resumoCardsOriginal.innerHTML;
  document.body.appendChild(wrap);
  return wrap;
}

/* ══════════════════════════════════════════════
EXPORTAR RESUMO POR FRENTE — PDF (para impressão)
══════════════════════════════════════════════ */
async function exportarResumoFrentesPDF() {
  if (!window._gatecDados || window._gatecDados.length === 0) {
    showToast('⚠️ Nenhum dado carregado. Clique em "Atualizar dados" primeiro.', 'error', 3000);
    return;
  }
  
  const node = _montarCardResumoExportacao();
  if (!node) {
    showToast('⚠️ Nenhum resumo disponível para exportar.', 'error', 2500);
    return;
  }
  
  showToast('📄 Gerando PDF do resumo… aguarde', 'info', 5000);
  await new Promise(r => setTimeout(r, 150));
  
  try {
    const canvas = await html2canvas(node, {
      scale: 3, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff'
    });
    const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    const pdf  = new jsPDFClass({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pgW  = pdf.internal.pageSize.getWidth();
    const pgH  = pdf.internal.pageSize.getHeight();
    const margem = 12;
    const maxW = pgW - margem * 2;
    const maxH = pgH - margem * 2;
    
    let imgWmm = maxW;
    let imgHmm = canvas.height * (imgWmm / canvas.width);
    if (imgHmm > maxH) {
      const fator = maxH / imgHmm;
      imgHmm *= fator;
      imgWmm *= fator;
    }
    
    const x = (pgW - imgWmm) / 2;
    const y = (pgH - imgHmm) / 2;
    const imgData = canvas.toDataURL('image/jpeg', 0.97);
    
    pdf.addImage(imgData, 'JPEG', x, y, imgWmm, imgHmm);
    
    const now = new Date();
    const nomeArq = `Resumo_Frentes_${now.getDate().toString().padStart(2,'0')}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getFullYear()}.pdf`;
    const blobPdf = pdf.output('blob');
    const filePdf = new File([blobPdf], nomeArq, { type: 'application/pdf' });
    
    if (navigator.canShare && navigator.canShare({ files: [filePdf] })) {
      try {
        await navigator.share({ files: [filePdf], title: 'Resumo por Frente' });
        showToast('✅ PDF do resumo gerado!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          _baixarArquivo(blobPdf, nomeArq);
          showToast('✅ PDF do resumo baixado!');
        }
      }
    } else {
      _baixarArquivo(blobPdf, nomeArq);
      showToast('✅ PDF do resumo baixado!');
    }
  } catch (e) {
    console.error(e);
    showToast('❌ Erro ao gerar PDF do resumo.', 'error', 3000);
  } finally {
    node.remove();
  }
}

/* ══════════════════════════════════════════════
ENVIAR RESUMO POR FRENTE — IMAGEM (WhatsApp e outros apps)
══════════════════════════════════════════════ */
function _baixarImagemResumo(blob, nomeArq) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArq;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('✅ Imagem baixada! Envie pelo WhatsApp anexando o arquivo.', 'info', 4000);
}

async function compartilharResumoFrentesImagem() {
  if (!window._gatecDados || window._gatecDados.length === 0) {
    showToast('⚠️ Nenhum dado carregado. Clique em "Atualizar dados" primeiro.', 'error', 3000);
    return;
  }
  
  const node = _montarCardResumoExportacao();
  if (!node) {
    showToast('⚠️ Nenhum resumo disponível para compartilhar.', 'error', 2500);
    return;
  }
  
  showToast('🖼️ Gerando imagem do resumo… aguarde', 'info', 5000);
  await new Promise(r => setTimeout(r, 150));
  
  try {
    const canvas = await html2canvas(node, {
      scale: 3, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff'
    });
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        showToast('❌ Erro ao gerar imagem do resumo.', 'error', 3000);
        node.remove();
        return;
      }
      
      const now = new Date();
      const nomeArq = `Resumo_Frentes_${now.getDate().toString().padStart(2,'0')}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getFullYear()}.png`;
      const file = new File([blob], nomeArq, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Resumo por Frente',
            text: 'Resumo de produção por frente — CTT Controle Agrícola'
          });
          showToast('✅ Resumo enviado!');
        } catch (err) {
          if (err.name !== 'AbortError') {
            _baixarImagemResumo(blob, nomeArq);
          }
        }
      } else {
        _baixarImagemResumo(blob, nomeArq);
      }
      node.remove();
    }, 'image/png', 1);
  } catch (e) {
    console.error(e);
    showToast('❌ Erro ao gerar imagem do resumo.', 'error', 3000);
    node.remove();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
⭐ MELHORIA UX — indicador de sincronização com cor por tempo decorrido
Verde: < 30 min · Laranja: 30–60 min · Vermelho: > 60 min sem atualizar.
Ajuda o usuário a perceber de relance se os dados podem estar desatualizados.
══════════════════════════════════════════════════════════════════════════ */
function _atualizarCorSyncStatus() {
  const dot = document.getElementById('gatec-sync-dot');
  const label = document.getElementById('gatec-sync-label');
  if (!dot || !window._gatecUltimaSyncTs) return;
  
  const minutos = (Date.now() - window._gatecUltimaSyncTs) / 60000;
  if (minutos < 30) {
    dot.style.color = 'var(--green-500)';
  } else if (minutos < 60) {
    dot.style.color = 'var(--amber)';
  } else {
    dot.style.color = 'var(--red)';
    if (label) label.title = 'Dados podem estar desatualizados — toque em "Atualizar dados"';
  }
}
setInterval(_atualizarCorSyncStatus, 60000);

async function sincronizarApp() {
  showToast('🔄 Verificando atualização…', 'info', 3000);
  if (!('serviceWorker' in navigator)) {
    showToast('ℹ️ Seu navegador não suporta atualização automática.', 'info', 4000);
    return;
  }
  
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      showToast('ℹ️ Service Worker não registrado. Recarregue manualmente.', 'info', 4000);
      return;
    }
    
    await reg.update();
    
    if (reg.waiting) {
      showToast('⚡ Nova versão encontrada! Atualizando...', 'success', 3000);
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(() => window.location.reload(), 500);
      return;
    }
    
    if (reg.installing) {
      showToast('⏳ Baixando nova versão...', 'info', 3000);
      reg.installing.addEventListener('statechange', (event) => {
        if (event.target.state === 'installed') {
          showToast('🚀 Nova versão instalada! Atualizando app...', 'success', 3000);
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          setTimeout(() => window.location.reload(), 500);
        }
      });
      return;
    }
    
    showToast('✅ Seu app já está na versão mais recente!', 'success', 4000);
  } catch (err) {
    showToast('❌ Erro ao verificar atualização: ' + err.message, 'error', 4000);
  }
}

/* ══════════════════════════════════════════════
HELPER COMPARTILHADO — PDFs vetoriais (tabela real, não print da tela)
══════════════════════════════════════════════ */
function _novoPDFRelatorio(titulo, subtitulo, orientacao) {
  const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  const pdf = new jsPDFClass({ unit: 'mm', format: 'a4', orientation: orientacao || 'portrait' });
  const pgW = pdf.internal.pageSize.getWidth();
  
  pdf.setFillColor(27, 94, 32);
  pdf.rect(0, 0, pgW, 20, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(titulo, 12, 12);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const dataHoje = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const larguraData = pdf.getTextWidth(dataHoje);
  pdf.text(dataHoje, pgW - 12 - larguraData, 12);
  
  let y = 27;
  if (subtitulo) {
    pdf.setTextColor(74, 85, 74);
    pdf.setFontSize(9.5);
    pdf.setFont('helvetica', 'normal');
    const linhas = pdf.splitTextToSize(subtitulo, pgW - 24);
    pdf.text(linhas, 12, y);
    y += linhas.length * 4.2 + 4;
  }
  
  return { pdf, y, pgW };
}

function _baixarArquivo(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function _finalizarPDFRelatorio(pdf, nomeArquivo) {
  const paginas = pdf.internal.getNumberOfPages();
  const pgW = pdf.internal.pageSize.getWidth();
  const pgH = pdf.internal.pageSize.getHeight();
  
  for (let i = 1; i <= paginas; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Página ${i} de ${paginas}`, pgW - 30, pgH - 6);
    pdf.text('Gerado pelo app de Gestão Agrícola', 12, pgH - 6);
  }
  
  const blob = pdf.output('blob');
  const file = new File([blob], nomeArquivo, { type: 'application/pdf' });
  
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: nomeArquivo.replace(/.pdf$/i, '') });
      showToast('✅ PDF gerado!', 'success', 2500);
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  
  _baixarArquivo(blob, nomeArquivo);
  showToast('✅ PDF baixado!', 'success', 2500);
}

const _PDF_TABLE_ESTILO = {
  theme: 'striped',
  headStyles: { fillColor: [27, 94, 32], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
  bodyStyles: { fontSize: 8, textColor: [34, 40, 31] },
  alternateRowStyles: { fillColor: [249, 250, 249] },
  margin: { left: 12, right: 12 },
};

/* ══════════════════════════════════════════════
BARRA DE BOAS-VINDAS (HOME)
══════════════════════════════════════════════ */
function iniciarWelcomeBar(nomeUsuario) {
  const greeting = document.getElementById('home-welcome-greeting');
  const sub = document.getElementById('home-welcome-sub');
  if (!greeting || !sub) return;
  
  window._nomeLoginAtual = nomeUsuario || '';
  const nomeSalvo = localStorage.getItem('ctt_nome_preferido');
  const nomeExibir = nomeSalvo || nomeUsuario;
  
  const hora = new Date().getHours();
  let saudacao = 'Boa noite';
  if (hora >= 5 && hora < 12) saudacao = 'Bom dia';
  else if (hora >= 12 && hora < 18) saudacao = 'Boa tarde';
  
  const nome = nomeExibir ? nomeExibir.charAt(0).toUpperCase() + nomeExibir.slice(1) : '';
  greeting.textContent = `${saudacao}${nome ? ', ' + nome : ''}! 🌾`;
  
  const diasSemana = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const agora = new Date();
  sub.textContent = `${diasSemana[agora.getDay()]}, ${agora.getDate()} de ${meses[agora.getMonth()]} · Passos/MG`;
  
  atualizarClimaHomeAutomatico();
  popularSeletorChuvaCidade();
  buscarDiasSemChuva();
}

function popularSeletorChuvaCidade() {
  const sel = document.getElementById('hre-chuva-cidade-select');
  if (!sel || typeof CIDADES_COORDS === 'undefined') return;
  
  if (sel.options.length === 0) {
    Object.keys(CIDADES_COORDS).forEach(key => {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = CIDADES_COORDS[key].nome;
      sel.appendChild(o);
    });
  }
  
  const salva = localStorage.getItem('ctt_chuva_cidade');
  if (salva && CIDADES_COORDS[salva]) {
    sel.value = salva;
  } else {
    const padrao = Object.keys(CIDADES_COORDS).find(k => CIDADES_COORDS[k].nome === 'Passos');
    if (padrao) sel.value = padrao;
  }
  
  atualizarChipCidadeChuva();
  sel.onchange = () => {
    localStorage.setItem('ctt_chuva_cidade', sel.value);
    atualizarChipCidadeChuva();
    buscarDiasSemChuva();
  };
}

function atualizarChipCidadeChuva() {
  const sel = document.getElementById('hre-chuva-cidade-select');
  const label = document.getElementById('hre-chuva-cidade-label');
  if (sel && label && sel.selectedOptions[0]) {
    label.textContent = sel.selectedOptions[0].textContent;
  }
}

function abrirSeletorCidadeChuva() {
  const sel = document.getElementById('hre-chuva-cidade-select');
  if (!sel) return;
  sel.focus();
  if (typeof sel.showPicker === 'function') {
    try { sel.showPicker(); } catch(e) {}
  }
}

async function atualizarClimaHomeAutomatico() {
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-20.72&longitude=-46.61&current_weather=true&timezone=America%2FSao_Paulo');
    const d = await r.json();
    if (!d.current_weather) return;
    
    const temp = Math.round(d.current_weather.temperature);
    const wc = d.current_weather.weathercode;
    const condicoes = {
      0:'Céu limpo', 1:'Quase limpo', 2:'Parcialmente nublado', 3:'Nublado',
      45:'Neblina', 48:'Neblina', 51:'Garoa', 53:'Garoa', 55:'Garoa',
      61:'Chuva fraca', 63:'Chuva', 65:'Chuva forte',
      71:'Neve', 80:'Pancadas', 81:'Pancadas', 82:'Tempestade',
      95:'Trovoada', 96:'Trovoada', 99:'Trovoada'
    };
    const cond = condicoes[wc] || 'Passos/MG';
    
    const climaEl = document.getElementById('home-welcome-clima');
    const tempEl = document.getElementById('home-welcome-temp');
    const condEl = document.getElementById('home-welcome-cond');
    
    if (climaEl && tempEl && condEl) {
      tempEl.textContent = temp + '°C';
      condEl.textContent = cond;
      climaEl.style.display = 'flex';
    }
  } catch (err) {
    // silencioso se offline
  }
}

/* ══════════════════════════════════════════════
NOVA FUNCIONALIDADE 2 — NOME PERSONALIZADO
══════════════════════════════════════════════ */
function abrirModalNome() {
  const overlay = document.getElementById('modal-nome-overlay');
  const input = document.getElementById('input-nome-personalizado');
  if (!overlay || !input) return;
  
  const atual = localStorage.getItem('ctt_nome_preferido') || window._nomeLoginAtual || '';
  input.value = atual;
  overlay.classList.add('open');
  setTimeout(() => input.focus(), 150);
}

function fecharModalNome() {
  const overlay = document.getElementById('modal-nome-overlay');
  if (overlay) overlay.classList.remove('open');
}

function salvarNomePersonalizado() {
  const input = document.getElementById('input-nome-personalizado');
  if (!input) return;
  
  const nome = input.value.trim();
  if (nome) {
    localStorage.setItem('ctt_nome_preferido', nome);
  } else {
    localStorage.removeItem('ctt_nome_preferido');
  }
  
  fecharModalNome();
  iniciarWelcomeBar(window._nomeLoginAtual);
  showToast('✅ Nome salvo! É assim que vamos te chamar.', 'success', 2500);
}

/* ══════════════════════════════════════════════
NOVA FUNCIONALIDADE 3 — FORÇAR ATUALIZAÇÃO
Limpa Service Worker + caches e recarrega a última versão do deploy.
══════════════════════════════════════════════ */
function forcarAtualizacao() {
  const btns = document.querySelectorAll('#btn-forcar-atualizacao');
  btns.forEach(b => { const el = b.closest('button') || b; el.classList && el.classList.add('girando'); });
  
  showToast('🔄 Limpando cache e buscando a última versão...', 'info', 2000);
  
  const finalizar = () => {
    window.location.reload(true);
  };
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(function (registrations) {
        const unregisters = registrations.map(reg => reg.unregister());
        return Promise.all(unregisters);
      })
      .then(() => {
        if (window.caches && caches.keys) {
          return caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
        }
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(finalizar, 350);
      });
  } else {
    setTimeout(finalizar, 350);
  }
}

/* ══════════════════════════════════════════════
MELHORIA 1+2+3 — RESUMO EXECUTIVO, SYNC E CHUVA
══════════════════════════════════════════════ */
window._syncHistorico = [];

function registrarSync(status, fonte) {
  const agora = new Date();
  const hh = String(agora.getHours()).padStart(2,'0');
  const mm = String(agora.getMinutes()).padStart(2,'0');
  const entrada = { hora: `${hh}:${mm}`, status, fonte };
  
  window._syncHistorico.unshift(entrada);
  if (window._syncHistorico.length > 5) window._syncHistorico.pop();
  
  const label = document.getElementById('home-sync-label');
  const dot   = document.getElementById('home-sync-dot');
  if (label) label.textContent = `Sync às ${hh}:${mm}`;
  if (dot)   dot.style.background = status === 'ok' ? 'var(--green-500)' : 'var(--red)';
  
  renderSyncHistorico();
  atualizarHubStatusLiberacoes();
}

function atualizarHubStatusLiberacoes() {
  const dot = document.getElementById('hub-status-liberacoes-dot');
  const txt = document.getElementById('hub-status-liberacoes-txt');
  if (!txt) return;
  
  const ultima = window._syncHistorico && window._syncHistorico[0];
  let partes = [];
  
  if (ultima) {
    partes.push(`${ultima.status === 'ok' ? 'Sincronizado' : 'Falha na sync'} às ${ultima.hora}`);
    if (dot) dot.style.background = ultima.status === 'ok' ? 'var(--green-500)' : 'var(--red)';
  } else {
    partes.push('Ainda sem sincronização nesta sessão');
    if (dot) dot.style.background = 'var(--text-3)';
  }
  
  if (window._gatecDados && window._gatecDados.length) {
    const frentesPermitidas = ["401", "402", "403", "404", "451"];
    const abertas = new Set();
    window._gatecDados.forEach(row => {
      const frente = (row["FRENTE"] || "").trim();
      if (!frentesPermitidas.includes(frente)) return;
      const status = (row["STATUS OS"] || "").toUpperCase();
      if (!status.includes("ENCERRADA")) abertas.add(frente);
    });
    partes.push(`${abertas.size} frente${abertas.size === 1 ? '' : 's'} em aberto`);
  }
  
  txt.textContent = partes.join(' · ');
}

function renderSyncHistorico() {
  const wrap = document.getElementById('home-sync-historico');
  const lista = document.getElementById('sync-hist-lista');
  if (!wrap || !lista) return;
  
  if (window._syncHistorico.length === 0) { wrap.style.display = 'none'; return; }
  
  wrap.style.display = 'block';
  lista.innerHTML = window._syncHistorico.map(e => `
    <div class="sync-hist-item">
      <div class="shi-dot ${e.status === 'ok' ? 'ok' : 'err'}"></div>
      <span>${e.status === 'ok' ? '✅' : '❌'} ${e.fonte || 'Planilha'}</span>
      <span class="shi-time">${e.hora}</span>
    </div>
  `).join('');
}

function atualizarResumoExecutivo() {
  if (!window._gatecDados || window._gatecDados.length === 0) return;
  
  const frentesPermitidas = ["401", "402", "403", "404", "451"];
  const metasSafra = { "401": 368491, "402": 310186, "403": 294189, "404": 307888, "451": 310433 };
  const metaTotal = Object.values(metasSafra).reduce((a, b) => a + b, 0);
  
  let totalProd = 0;
  const frentesComAbertas = new Set();
  
  window._gatecDados.forEach(row => {
    const frente = (row["FRENTE"] || "").trim();
    if (!frentesPermitidas.includes(frente)) return;
    
    const prodReal = parseFloat(String(row["PROD. REAL"] || "0").replace(/\./g, "").replace(",", ".")) || 0;
    totalProd += prodReal;
    
    const status = (row["STATUS OS"] || "").toUpperCase();
    if (!status.includes("ENCERRADA")) frentesComAbertas.add(frente);
  });
  
  const aderenciaGeral = metaTotal > 0 ? (totalProd / metaTotal) * 100 : 0;
  const corAder = aderenciaGeral >= 90 ? '#1B5E20' : aderenciaGeral >= 70 ? '#E65100' : '#C62828';
  
  const elProd = document.getElementById('hre-producao');
  const elAder = document.getElementById('hre-aderencia');
  
  if (elProd) elProd.textContent = formatarNumeroCurto(totalProd) + ' t';
  if (elAder) { elAder.textContent = aderenciaGeral.toFixed(1) + '%'; elAder.style.color = corAder; }
  
  atualizarCardPlantioHome();
  
  const chips = document.getElementById('home-frentes-chips');
  if (chips && frentesComAbertas.size > 0) {
    chips.style.display = 'flex';
    chips.innerHTML = Array.from(frentesComAbertas).sort().map(f =>
      `<button class="home-frente-chip" onclick="irParaFrente('${f}')">
        <i class="fas fa-tractor" style="font-size:9px; margin-right:4px; opacity:0.7;"></i>${f}
      </button>`
    ).join('');
  }
  
  popularFazendaLibSelect();
  atualizarHubStatusLiberacoes();
}

async function buscarDiasSemChuva() {
  const elVal = document.getElementById('hre-dias-sem-chuva');
  const elSub = document.getElementById('hre-chuva-sub');
  const elMes = document.getElementById('hre-chuva-mes');
  const selCidade = document.getElementById('hre-chuva-cidade-select');
  
  const cidade = (selCidade && typeof CIDADES_COORDS !== 'undefined' && CIDADES_COORDS[selCidade.value])
    ? CIDADES_COORDS[selCidade.value]
    : { lat: -20.72, lon: -46.61, nome: 'Passos' };
    
  try {
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicio30 = new Date(hoje);
    inicio30.setDate(hoje.getDate() - 30);
    const inicioBusca = inicioMes.getTime() < inicio30.getTime() ? inicioMes : inicio30;
    
    const fmt = d => d.toISOString().slice(0, 10);
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${cidade.lat}&longitude=${cidade.lon}&start_date=${fmt(inicioBusca)}&end_date=${fmt(ontem)}&daily=precipitation_sum&timezone=America%2FSao_Paulo`;
    
    const resp = await fetch(url);
    const data = await resp.json();
    
    if (!data.daily || !data.daily.precipitation_sum) throw new Error('sem dados');
    
    const precip = data.daily.precipitation_sum;
    const datas  = data.daily.time;
    
    let dias = 0;
    for (let i = precip.length - 1; i >= 0; i--) {
      if ((precip[i] ?? 0) < 0.1) dias++;
      else break;
    }
    
    if (elVal) { elVal.textContent = dias; }
    if (elSub) {
      elSub.textContent = dias === 0 ? 'choveu ontem' : dias === 1 ? 'desde ontem' : `sem chuva`;
      const card = elVal?.closest('.hre-card');
      if (card) card.style.borderColor = dias >= 3 ? 'var(--green-500)' : '#90CAF9';
    }
    
    if (elMes) {
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      let acumuladoMes = 0;
      
      datas.forEach((d, i) => {
        const dt = new Date(d + 'T00:00:00');
        if (dt.getMonth() === mesAtual && dt.getFullYear() === anoAtual) {
          acumuladoMes += (precip[i] ?? 0);
        }
      });
      
      const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      elMes.textContent = `${nomesMeses[mesAtual]}: ${acumuladoMes.toFixed(1).replace('.', ',')}mm até o momento`;
    }
  } catch(e) {
    if (elVal) elVal.textContent = '—';
    if (elSub) elSub.textContent = 'indisponível';
    if (elMes) elMes.textContent = '';
  }
}

function irParaFrente(frente) {
  const btn = document.querySelector('[onclick*="liberacoes"]');
  if (btn) btn.click();
  setTimeout(() => {
    const chip = document.querySelector(`.lib-frente-chip[data-frente="${frente}"]`);
    if (chip) libToggleFrente(chip);
  }, 200);
}

/* ══════════════════════════════════════════════
MELHORIA 7 — MODO COMPACTO DE TABELA
══════════════════════════════════════════════ */
window._modoCompacto = false;

function toggleModoCompacto() {
  window._modoCompacto = !window._modoCompacto;
  const wrapper = document.getElementById('gatec-table-wrapper');
  const btn = document.getElementById('btn-compact-toggle');
  
  if (wrapper) wrapper.classList.toggle('compact-mode', window._modoCompacto);
  if (btn) {
    btn.classList.toggle('active', window._modoCompacto);
    btn.innerHTML = window._modoCompacto
      ? '<i class="fas fa-expand-alt"></i> Normal'
      : '<i class="fas fa-compress-alt"></i> Compacto';
  }
  showToast(window._modoCompacto ? '📋 Modo compacto ativado' : '📋 Modo normal ativado', 'info', 1500);
}

/* ══════════════════════════════════════════════
MELHORIA 8 — RESUMO SEMANAL PARA WHATSAPP
══════════════════════════════════════════════ */
function copiarResumoSemanal() {
  if (!window._gatecDados || window._gatecDados.length === 0) {
    showToast('⚠️ Aguarde o carregamento dos dados.', 'error', 2500);
    return;
  }
  
  const frentesPermitidas = ["401", "402", "403", "404", "451"];
  const metasSafra = { "401": 330490.62, "402": 280186.42, "403": 258189.22, "404": 277888.36, "451": 280133.10 };
  
  const resumo = {};
  let totalGeral = 0;
  
  frentesPermitidas.forEach(f => { resumo[f] = { prod: 0, abertas: 0, encerradas: 0 }; });
  
  window._gatecDados.forEach(row => {
    const frente = (row["FRENTE"] || "").trim();
    if (!frentesPermitidas.includes(frente)) return;
    
    const prodReal = parseFloat(String(row["PROD. REAL"] || "0").replace(/\./g, "").replace(",", ".")) || 0;
    resumo[frente].prod += prodReal;
    totalGeral += prodReal;
    
    const status = (row["STATUS OS"] || "").toUpperCase();
    if (status.includes("ENCERRADA")) resumo[frente].encerradas++;
    else resumo[frente].abertas++;
  });
  
  let somaAder = 0, contAder = 0;
  let frenteLider = { id: '', prod: 0 };
  
  frentesPermitidas.forEach(f => {
    const meta = metasSafra[f];
    if (meta && resumo[f].prod > 0) {
      somaAder += (resumo[f].prod / meta) * 100;
      contAder++;
    }
    if (resumo[f].prod > frenteLider.prod) frenteLider = { id: f, prod: resumo[f].prod };
  });
  
  const aderMedia = contAder > 0 ? (somaAder / contAder).toFixed(1) : '—';
  const now = new Date();
  const dataHora = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  
  const linhas = frentesPermitidas.map(f => {
    const d = resumo[f];
    const meta = metasSafra[f];
    const ader = meta ? ((d.prod / meta) * 100).toFixed(1) + '%' : '—';
    const prodFmt = formatarNumeroCurto(d.prod);
    return `• *Frente ${f}:* ${prodFmt} t — Ader. ${ader}`;
  }).join('\n');
  
  const texto = `🌾 *RESUMO SEMANAL — CTT CONTROLE AGRÍCOLA*\n📅 Gerado em: ${dataHora}\n${'─'.repeat(32)}\n📦 *Produção Acumulada por Frente:*\n${linhas}\n${'─'.repeat(32)}\n📊 *Total Acumulado:* ${formatarNumeroCurto(totalGeral)} t\n🎯 *Aderência Média:* ${aderMedia}%\n🏆 *Frente Destaque:* Frente ${frenteLider.id || '—'} (${formatarNumeroCurto(frenteLider.prod)} t)\n${'─'.repeat(32)}\n_Gerado pelo CTT Controle Agrícola_`;
  
  navigator.clipboard.writeText(texto)
    .then(() => showToast('✅ Resumo Semanal copiado! Cole no WhatsApp.', 'success', 3000))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ Resumo Semanal copiado! Cole no WhatsApp.', 'success', 3000);
    });
}

/* ══════════════════════════════════════════════
MODO SIMULAÇÃO / REAL  (dois conjuntos estanques)
══════════════════════════════════════════════ */
function alternarModo() {
  modoSimulacao = document.getElementById('toggle-modo').checked;
  const badge       = document.getElementById('modo-badge');
  const labelDesc   = document.getElementById('modo-label-desc');
  const labelTitulo = document.getElementById('modo-label-titulo');
  
  if (modoSimulacao) {
    dadosReal = JSON.parse(JSON.stringify(frentes));
    if (dadosSimulado === null) {
      dadosSimulado = JSON.parse(JSON.stringify(dadosReal));
    }
    frentes = JSON.parse(JSON.stringify(dadosSimulado));
    renderFrentes();
    update();
    badge.className = 'mode-badge sim';
    badge.textContent = 'SIMULAÇÃO';
    labelTitulo.textContent = 'Modo Simulação';
    labelDesc.textContent = 'Altere livremente — os dados reais estão protegidos';
  } else {
    dadosSimulado = JSON.parse(JSON.stringify(frentes));
    frentes = JSON.parse(JSON.stringify(dadosReal));
    renderFrentes();
    update();
    badge.className = 'mode-badge real';
    badge.textContent = 'REAL';
    labelTitulo.textContent = 'Cenário Atual';
    labelDesc.textContent = 'Visualizando dados reais da operação';
  }
}

/* ══════════════════════════════════════════════
CENÁRIOS (localStorage)
══════════════════════════════════════════════ */
function getCenarios() {
  try {
    return JSON.parse(localStorage.getItem('ctt_cenarios') || '{}');
  } catch { return {}; }
}

function saveCenarios(obj) {
  localStorage.setItem('ctt_cenarios', JSON.stringify(obj));
}

function atualizarSelectCenarios() {
  const cenarios = getCenarios();
  const sel = document.getElementById('cenario-select');
  const nomes = Object.keys(cenarios);
  
  sel.innerHTML = nomes.length === 0
    ? '<option value="">— Nenhum cenário salvo —</option>'
    : '<option value="">Selecionar cenário...</option>' +
      nomes.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
}

function abrirModalSalvar() {
  document.getElementById('modal-cenario-nome').value = '';
  document.getElementById('modal-cenario').classList.add('open');
  setTimeout(() => document.getElementById('modal-cenario-nome').focus(), 100);
}

function fecharModal() {
  document.getElementById('modal-cenario').classList.remove('open');
}

function confirmarSalvar() {
  const nome = document.getElementById('modal-cenario-nome').value.trim();
  if (!nome) { alert('Digite um nome para o cenário.'); return; }
  
  const cenarios = getCenarios();
  cenarios[nome] = {
    frentes: JSON.parse(JSON.stringify(frentes)),
    meta: document.getElementById('meta_val').value,
    diesel: document.getElementById('diesel_val').value
  };
  
  saveCenarios(cenarios);
  atualizarSelectCenarios();
  fecharModal();
  showToast(`💾 Cenário "${nome}" salvo com sucesso!`);
}

function carregarCenario() {
  const nome = document.getElementById('cenario-select').value;
  if (!nome) return;
  
  const cenarios = getCenarios();
  const c = cenarios[nome];
  if (!c) return;
  
  frentes = JSON.parse(JSON.stringify(c.frentes));
  if (c.meta) document.getElementById('meta_val').value = c.meta;
  if (c.diesel) document.getElementById('diesel_val').value = c.diesel;
  
  renderFrentes();
  update();
}

function excluirCenario() {
  const nome = document.getElementById('cenario-select').value;
  if (!nome) return;
  if (!confirm(`Excluir o cenário "${nome}"?`)) return;
  
  const cenarios = getCenarios();
  delete cenarios[nome];
  saveCenarios(cenarios);
  atualizarSelectCenarios();
}

/* ══════════════════════════════════════════════
FRENTES
══════════════════════════════════════════════ */
function addFrente() {
  const id = Date.now();
  frentes.push({ id, nome: `FRENTE 0${frentes.length + 1}`, maquinas: 1, tch: 80, vel: 4.0, larg: 1.5, efc: 85, horas: 12, diesel: 45 });
  if (modoSimulacao) dadosSimulado = JSON.parse(JSON.stringify(frentes));
  renderFrentes();
  update();
  if (!modoSimulacao) salvarEstadoReal();
}

function renderFrentes() {
  const container = document.getElementById('frentes-list');
  container.innerHTML = frentes.map(f => `
    <div class="frente-card">
      <div class="frente-card-header">
        <input type="text" value="${escapeHtml(f.nome)}" title="Clique para editar o nome da frente" placeholder="Nome da Frente..." oninput="editData(${f.id},'nome',this.value)">
        <button class="btn-remove-frente" onclick="removeFrente(${f.id})" aria-label="Remover frente">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="grid-inputs">
        <div class="field">
          <label>Nº Máqs</label>
          <input type="number" value="${f.maquinas}" oninput="editData(${f.id},'maquinas',this.value)">
        </div>
        <div class="field">
          <label>TCH</label>
          <div class="input-unit-wrap">
            <input type="number" value="${f.tch}" oninput="editData(${f.id},'tch',this.value)">
            <span class="input-unit">t/ha</span>
          </div>
        </div>
        <div class="field">
          <label>Velocidade</label>
          <div class="input-unit-wrap">
            <input type="number" value="${f.vel}" step="0.1" oninput="editData(${f.id},'vel',this.value)">
            <span class="input-unit">km/h</span>
          </div>
        </div>
        <div class="field">
          <label>Largura</label>
          <div class="input-unit-wrap">
            <input type="number" value="${f.larg}" step="0.1" oninput="editData(${f.id},'larg',this.value)">
            <span class="input-unit">m</span>
          </div>
        </div>
        <div class="field">
          <label>Eficiência</label>
          <div class="input-unit-wrap">
            <input type="number" value="${f.efc}" oninput="editData(${f.id},'efc',this.value)">
            <span class="input-unit">%</span>
          </div>
        </div>
        <div class="field">
          <label>Horas/Dia</label>
          <div class="input-unit-wrap">
            <input type="number" value="${f.horas}" oninput="editData(${f.id},'horas',this.value)">
            <span class="input-unit">h</span>
          </div>
        </div>
        <div class="field">
          <label>Consumo</label>
          <div class="input-unit-wrap">
            <input type="number" value="${f.diesel}" oninput="editData(${f.id},'diesel',this.value)">
            <span class="input-unit">L/h</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function editData(id, field, val) {
  const f = frentes.find(x => x.id === id);
  if (f) f[field] = field === 'nome' ? val : parseFloat(val) || 0;
  
  if (modoSimulacao) dadosSimulado = JSON.parse(JSON.stringify(frentes));
  update();
  
  if (document.getElementById('sub_dash').classList.contains('active')) renderChart();
  if (!modoSimulacao) salvarEstadoReal();
}

function removeFrente(id) {
  frentes = frentes.filter(f => f.id !== id);
  if (modoSimulacao) dadosSimulado = JSON.parse(JSON.stringify(frentes));
  renderFrentes();
  update();
  if (!modoSimulacao) salvarEstadoReal();
}

/* ══════════════════════════════════════════════
UPDATE DASHBOARD + INSIGHTS
══════════════════════════════════════════════ */
function update() {
  const prDiesel = parseFloat(document.getElementById('diesel_val').value) || 0;
  const metaG = parseFloat(document.getElementById('meta_val').value) || 1;
  
  let tTon = 0, tCusto = 0, rankingHtml = '';
  let insights = [];
  
  document.getElementById('meta_label_total').innerText = formatarNumeroCurto(metaG) + ' t';
  
  frentes.forEach(f => {
    const rend = (f.vel * f.larg * (f.efc / 100)) / 10;
    const tonD = rend * f.tch * f.horas * f.maquinas;
    const cD = f.diesel * prDiesel * f.horas * f.maquinas;
    const custoTon = tonD > 0 ? (cD / tonD).toFixed(2) : '0.00';
    
    tTon += tonD;
    tCusto += cD;
    
    rankingHtml += `
      <div class="frente-item">
        <div class="frente-info">
          <b>${escapeHtml(f.nome)}</b>
          <span>${f.maquinas} máqs &nbsp;·&nbsp; ${rend.toFixed(2)} ha/h &nbsp;·&nbsp; Efic. ${f.efc}%</span>
        </div>
        <div class="frente-ton">
          <b>${formatarNumeroCurto(tonD)} t</b>
          <span>R$ ${custoTon}/t diesel</span>
        </div>
      </div>`;
      
    if (f.efc < 80) {
      const efc85ton = ((f.vel * f.larg * 0.85) / 10) * f.tch * f.horas * f.maquinas;
      insights.push({ type: 'warn', msg: `⚠️ Aumentar a eficiência de <b>${escapeHtml(f.nome)}</b> para 85% aumentaria a produção de ${formatarNumeroCurto(tonD)} t para ${formatarNumeroCurto(efc85ton)} t/dia, reduzindo o custo diesel por tonelada.` });
    }
  });
  
  const pct = (tTon / metaG) * 100;
  document.getElementById('total_ton').innerText = formatarNumeroCurto(tTon);
  document.getElementById('total_custo').innerText = 'R$ ' + formatarNumeroCurto(tCusto);
  document.getElementById('meta_pct').innerText = pct.toFixed(1) + '%';
  document.getElementById('meta_fill').style.width = Math.min(pct, 100) + '%';
  document.getElementById('meta_restante').innerText = tTon < metaG
    ? `Faltam ${formatarNumeroCurto(metaG - tTon)} t`
    : '✓ Meta Atingida!';
    
  document.getElementById('lista-ranking').innerHTML = rankingHtml || '<p style="font-size:12px;color:var(--text-3);padding:10px 0">Nenhuma frente cadastrada.</p>';
  
  if (frentes.length > 0 && tTon < metaG * 0.7) {
    insights.push({ type: 'tip', msg: `💡 A produção atual (${formatarNumeroCurto(tTon)} t/dia) está abaixo de 70% da meta. Considere adicionar +1 máquina por frente ou estender as horas de operação por dia para atingir a meta operacional.` });
  }
  
  const insContainer = document.getElementById('insights-container');
  if (insights.length === 0) {
    insContainer.innerHTML = '<div class="insight-item ok"><i class="fas fa-check-circle"></i><span>Todos os indicadores dentro do esperado. Nenhum alerta no momento.</span></div>';
  } else {
    insContainer.innerHTML = insights.map(ins =>
      `<div class="insight-item ${ins.type}"><i class="fas fa-${ins.type === 'warn' ? 'exclamation-triangle' : 'lightbulb'}"></i><span>${ins.msg}</span></div>`
    ).join('');
  }
  
  const chkComp = document.getElementById('toggle-comparativo');
  if (chkComp && chkComp.checked) renderComparativo();
}

/* ══════════════════════════════════════════════
GRÁFICO
══════════════════════════════════════════════ */
function renderChart() {
  const ctx = document.getElementById('prodChart').getContext('2d');
  if (myChart) myChart.destroy();
  
  myChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: frentes.map(f => f.nome),
      datasets: [{
        label: 'Toneladas/Dia',
        data: frentes.map(f => {
          const r = (f.vel * f.larg * (f.efc / 100)) / 10;
          return Math.round(r * f.tch * f.horas * f.maquinas);
        }),
        backgroundColor: '#2E7D32',
        hoverBackgroundColor: '#1B5E20',
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + formatarNumeroCurto(ctx.parsed.y) + ' t/dia'
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, weight: '700' }, color: '#4A554A' } },
        y: {
          grid: { color: '#E0E5E0' },
          ticks: { font: { size: 10 }, color: '#7A8A7A', callback: v => formatarNumeroCurto(v) + ' t' }
        }
      }
    }
  });
}

/* ══════════════════════════════════════════════
COMPARATIVO REAL × SIMULADO
══════════════════════════════════════════════ */
function toggleComparativo() {
  const chk = document.getElementById('toggle-comparativo');
  const painel = document.getElementById('painel-comparativo');
  if (chk.checked) {
    painel.style.display = 'block';
    renderComparativo();
  } else {
    painel.style.display = 'none';
  }
}

function calcTonFrente(f) {
  const rend = (f.vel * f.larg * (f.efc / 100)) / 10;
  return rend * f.tch * f.horas * f.maquinas;
}

function calcCustoFrente(f) {
  const prDiesel = parseFloat(document.getElementById('diesel_val').value) || 0;
  return f.diesel * prDiesel * f.horas * f.maquinas;
}

function renderComparativo() {
  const container = document.getElementById('comp-frentes-container');
  if (!modoSimulacao || !dadosReal || dadosReal.length === 0) {
    container.innerHTML = '<div class="insight-item tip" style="border-radius:var(--radius-sm);"><i class="fas fa-info-circle"></i><span>Ative o <b>Modo Simulação</b> (toggle no topo da aba Colhedoras) e ajuste os dados para visualizar o comparativo Real × Simulado.</span></div>';
    return;
  }
  
  const metrics = [
    { key: 'ton', label: 'Produção t/dia', fmt: v => formatarNumeroCurto(v) + ' t', higherBetter: true },
    { key: 'custo', label: 'Custo Diesel R$/dia', fmt: v => 'R$ ' + formatarNumeroCurto(v), higherBetter: false },
    { key: 'custoTon', label: 'Custo R$/ton', fmt: v => 'R$ ' + v.toFixed(2), higherBetter: false }
  ];
  
  let totalRealTon = 0, totalSimTon = 0, totalRealCusto = 0, totalSimCusto = 0;
  let html = '';
  
  frentes.forEach(fSim => {
    const fReal = dadosReal.find(r => r.id === fSim.id);
    if (!fReal) return;
    
    const simTon = calcTonFrente(fSim);
    const realTon = calcTonFrente(fReal);
    const simCusto = calcCustoFrente(fSim);
    const realCusto = calcCustoFrente(fReal);
    const simCustoTon = simTon > 0 ? simCusto / simTon : 0;
    const realCustoTon = realTon > 0 ? realCusto / realTon : 0;
    
    totalRealTon += realTon; totalSimTon += simTon;
    totalRealCusto += realCusto; totalSimCusto += simCusto;
    
    const vals = {
      ton:      { real: realTon,      sim: simTon      },
      custo:    { real: realCusto,    sim: simCusto    },
      custoTon: { real: realCustoTon, sim: simCustoTon }
    };
    
    html += `<div class="comp-frente-card">
      <div class="comp-frente-title"><i class="fas fa-tractor" style="margin-right:6px; color:var(--green-700);"></i>${escapeHtml(fSim.nome)}</div>`;
      
    metrics.forEach(m => {
      const rv = vals[m.key].real, sv = vals[m.key].sim;
      const diff = sv - rv;
      const pct = rv !== 0 ? ((diff / rv) * 100).toFixed(1) : '—';
      
      let cls = 'neu', sign = '';
      if (diff > 0.01) { cls = m.higherBetter ? 'pos' : 'neg'; sign = '+'; }
      else if (diff < -0.01) { cls = m.higherBetter ? 'neg' : 'pos'; sign = ''; }
      
      const deltaStr = rv !== 0 ? `${sign}${pct}%` : '—';
      
      html += `<div class="comp-row">
        <div class="comp-metric">${m.label}</div>
        <div class="comp-val-real">${m.fmt(rv)}</div>
        <div class="comp-val-sim">${m.fmt(sv)}</div>
        <div class="comp-delta ${cls}">${deltaStr}</div>
      </div>`;
    });
    html += `</div>`;
  });
  
  if (frentes.length > 1) {
    const totalRealCustoTon = totalRealTon > 0 ? totalRealCusto / totalRealTon : 0;
    const totalSimCustoTon  = totalSimTon  > 0 ? totalSimCusto  / totalSimTon  : 0;
    const deltaTon   = totalSimTon   - totalRealTon;
    const deltaCusto = totalSimCusto - totalRealCusto;
    const deltaCt    = totalSimCustoTon - totalRealCustoTon;
    
    const pctTon   = totalRealTon   > 0 ? ((deltaTon/totalRealTon)*100).toFixed(1) : '—';
    const pctCusto = totalRealCusto > 0 ? ((deltaCusto/totalRealCusto)*100).toFixed(1) : '—';
    const pctCt    = totalRealCustoTon > 0 ? ((deltaCt/totalRealCustoTon)*100).toFixed(1) : '—';
    
    html += `<div class="res-highlight" style="margin-top:4px;">
      <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; opacity:0.85; margin-bottom:10px;">
        <i class="fas fa-sigma" style="margin-right:5px;"></i>Totais — Todas as Frentes
      </div>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; text-align:center;">
        <div>
          <div style="font-size:9px; opacity:0.8; text-transform:uppercase; font-weight:700;">Produção</div>
          <div style="font-size:16px; font-weight:800;">${formatarNumeroCurto(totalSimTon)} t</div>
          <div style="font-size:10px; opacity:0.8;">${deltaTon >= 0 ? '+' : ''}${pctTon}% vs real</div>
        </div>
        <div>
          <div style="font-size:9px; opacity:0.8; text-transform:uppercase; font-weight:700;">Custo Diesel</div>
          <div style="font-size:16px; font-weight:800;">R$ ${formatarNumeroCurto(totalSimCusto)}</div>
          <div style="font-size:10px; opacity:0.8;">${deltaCusto >= 0 ? '+' : ''}${pctCusto}% vs real</div>
        </div>
        <div>
          <div style="font-size:9px; opacity:0.8; text-transform:uppercase; font-weight:700;">Custo/ton</div>
          <div style="font-size:16px; font-weight:800;">R$ ${totalSimCustoTon.toFixed(2)}</div>
          <div style="font-size:10px; opacity:0.8;">${deltaCt >= 0 ? '+' : ''}${pctCt}% vs real</div>
        </div>
      </div>
    </div>`;
  }
  
  container.innerHTML = html || '<p style="font-size:12px; color:var(--text-3); padding:10px 0;">Nenhuma frente correspondente encontrada para comparar.</p>';
}

function calcularSafra() {
  const area = parseFloat(document.getElementById('safra_area').value) || 0;
  const tch = parseFloat(document.getElementById('safra_tch').value) || 0;
  const aproveit = (parseFloat(document.getElementById('safra_aproveit').value) || 0) / 100;
  const perda = (parseFloat(document.getElementById('safra_perda').value) || 0) / 100;
  
  const areaUtil = area * aproveit;
  const prodBruta = areaUtil * tch;
  const prodLiquida = prodBruta * (1 - perda);
  
  document.getElementById('res_area_util').innerText = formatarNumeroCurto(areaUtil) + ' ha';
  document.getElementById('res_prod_bruta').innerText = formatarNumeroCurto(prodBruta) + ' t';
  document.getElementById('res_prod_liquida').innerText = formatarNumeroCurto(prodLiquida) + ' t';
}

/* ══════════════════════════════════════════════
CALCULADORA: PLANTIO
══════════════════════════════════════════════ */
function ajustarSugerido() {
  const tipo = document.getElementById('plantio_tipo').value;
  const inp = document.getElementById('plantio_consumo');
  if (tipo === 'Mecanizado') inp.value = 15;
  else if (tipo === 'Manual') inp.value = 12;
  else if (tipo === 'Meiose') inp.value = 10;
  calcularPlantio();
}

function calcularPlantio() {
  const area = parseFloat(document.getElementById('plantio_area').value) || 0;
  const consumo = parseFloat(document.getElementById('plantio_consumo').value) || 0;
  
  const total = area * consumo;
  const viagens = Math.ceil(total / 30);
  
  document.getElementById('res_mudas_total').innerText = formatarNumeroCurto(total) + ' t';
  document.getElementById('res_mudas_viagens').innerText = viagens;
}

/* ══════════════════════════════════════════════
CALCULADORA: ATR
══════════════════════════════════════════════ */
function calcularATR() {
  const pol = parseFloat(document.getElementById('atr_pol').value) || 0;
  const fibra = parseFloat(document.getElementById('atr_fibra').value) || 0;
  const pureza = parseFloat(document.getElementById('atr_pureza').value) || 0;
  const tons = parseFloat(document.getElementById('atr_tons').value) || 0;
  
  if (!pol || !fibra || !pureza) return;
  
  const polCorrigido = pol / (1 - fibra / 100);
  const atr = polCorrigido * (pureza / 100) * 10;
  const acucarTotal = (atr / 1000) * tons;
  const receita = acucarTotal * 1100;
  
  document.getElementById('res_atr_val').innerText = formatarNumeroCurto(atr);
  document.getElementById('res_atr_total').innerText = formatarNumeroCurto(acucarTotal) + ' t';
  document.getElementById('res_atr_receita').innerText = 'R$ ' + formatarNumeroCurto(receita / 1000) + ' mil';
  
  let classe = '', corFundo = '', corTexto = '';
  if (atr < 120) { classe = 'Baixo'; corFundo = '#FFEBEE'; corTexto = '#C62828'; }
  else if (atr < 130) { classe = 'Regular'; corFundo = '#FFF3E0'; corTexto = '#E65100'; }
  else if (atr < 140) { classe = 'Bom'; corFundo = '#F1F8E9'; corTexto = '#2E7D32'; }
  else { classe = 'Excelente'; corFundo = '#E8F5E9'; corTexto = '#1B5E20'; }
  
  const badge = document.getElementById('atr_class_badge');
  badge.innerText = classe;
  badge.style.background = corFundo;
  badge.style.color = corTexto;
  
  const pct = Math.min(Math.max((atr - 100) / 60, 0), 1) * 100;
  document.getElementById('atr_needle').style.left = pct + '%';
  document.getElementById('res_atr_container').style.display = 'grid';
  document.getElementById('atr_gauge_container').style.display = 'block';
}

/* ══════════════════════════════════════════════
CALCULADORA: CUSTO COLHEITA
══════════════════════════════════════════════ */
function calcularCustoColheita() {
  const area = parseFloat(document.getElementById('cc_area').value) || 0;
  const tch = parseFloat(document.getElementById('cc_tch').value) || 0;
  const custoMec = parseFloat(document.getElementById('cc_mecanizado').value) || 0;
  const frete = parseFloat(document.getElementById('cc_frete').value) || 0;
  
  if (!area || !tch) return;
  
  const producao = area * tch;
  const custoTotal = (area * custoMec) + (producao * frete);
  const custoPorTon = producao > 0 ? custoTotal / producao : 0;
  
  document.getElementById('res_cc_prod').innerText = formatarNumeroCurto(producao) + ' t';
  document.getElementById('res_cc_total').innerText = 'R$ ' + formatarNumeroCurto(custoTotal);
  document.getElementById('res_cc_ton').innerText = 'R$ ' + formatarNumeroCurto(custoPorTon);
  document.getElementById('res_cc_container').style.display = 'grid';
}

/* ══════════════════════════════════════════════
CALCULADORA: VARIEDADE
══════════════════════════════════════════════ */
function calcularVariedade() {
  const area = parseFloat(document.getElementById('vr_area').value) || 0;
  const tipo = document.getElementById('vr_tipo').value;
  const custom = parseFloat(document.getElementById('vr_tch_custom').value) || 0;
  const cortes = parseFloat(document.getElementById('vr_cortes').value) || 0;
  
  let tchRef = 0;
  if (tipo === '0') tchRef = custom;
  else if (tipo === '120') tchRef = 85;
  else if (tipo === '150') tchRef = 95;
  else if (tipo === '180') tchRef = 105;
  
  if (!area || !tchRef || !cortes) return;
  
  const prod1Corte = area * tchRef;
  let total = prod1Corte;
  for (let i = 1; i < cortes; i++) total += prod1Corte * Math.pow(0.92, i);
  const media = total / cortes;
  
  document.getElementById('res_vr_1corte').innerText = formatarNumeroCurto(prod1Corte) + ' t';
  document.getElementById('res_vr_total').innerText = formatarNumeroCurto(total) + ' t';
  document.getElementById('res_vr_media').innerText = formatarNumeroCurto(media) + ' t';
  document.getElementById('res_vr_container').style.display = 'grid';
}

/* ══════════════════════════════════════════════
LIBERAÇÕES (GATEC)
══════════════════════════════════════════════ */
const URL_GATEC_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTIIUGH-g6vlowVBAAkgoPwZd1EPJPJS8PzgOEWyDPito38Ii8qzOHaSh1PioGGMLNbwFJPDMzwsA7/pub?gid=0&single=true&output=csv";

function _gatecTxtOuNull(v) {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
}

function _gatecParseNumBR(v) {
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim();
  if (s === '') return NaN;
  return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

function _gatecNumOuNull(v) {
  const n = _gatecParseNumBR(v);
  return isNaN(n) ? null : n;
}

function _gatecNumParaBR(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? '' : String(n).replace('.', ',');
}

async function _gatecSha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function _gatecMontarRegistroSupabase(row) {
  const reg = {
    cod_liberacao   : _gatecTxtOuNull(row['LIBERAÇÃO']),
    frente          : _gatecTxtOuNull(row['FRENTE']),
    desc_fazenda    : _gatecTxtOuNull(row['DESC.FAZENDA']),
    listagem_talhao : _gatecTxtOuNull(row['LISTAGEM TALHAO']),
    prod_estimada   : _gatecNumOuNull(row['PROD. ESTIMADA']),
    prod_real       : _gatecNumOuNull(row['PROD. REAL']),
    dif_prod        : _gatecNumOuNull(row['DIF PROD.']),
    tch             : _gatecNumOuNull(row['TCH']),
    status_os       : _gatecTxtOuNull(row['STATUS OS']),
  };
  
  const identidade = {
    cod_liberacao  : reg.cod_liberacao,
    frente         : reg.frente,
    desc_fazenda   : reg.desc_fazenda,
  };
  
  const base = Object.keys(identidade).sort().map(k => `${k}=${identidade[k] ?? ''}`).join('|');
  reg.linha_hash = await _gatecSha256Hex(base);
  return reg;
}

function _gatecCarregarCSVFonte() {
  return new Promise((resolve, reject) => {
    Papa.parse(URL_GATEC_CSV, {
      download: true, header: true, skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || !results.data.length) { reject(new Error('Nenhum dado encontrado.')); return; }
        resolve(results.data);
      },
      error: reject,
    });
  });
}

async function _gatecBuscarSupabasePaginado() {
  const PAGINA = 1000;
  let de = 0, todas = [];
  while (true) {
    const { data, error } = await _sbClient
      .from('liberacoes_gatec')
      .select('*')
      .order('id', { ascending: true })
      .range(de, de + PAGINA - 1);
      
    if (error) throw error;
    if (!data || !data.length) break;
    
    todas.push(...data);
    if (data.length < PAGINA) break;
    de += PAGINA;
  }
  return todas;
}

async function sincronizarGatecSupabase() {
  if (typeof _sbClient === 'undefined') {
    if (typeof showToast === 'function') showToast('⚠️ Cliente Supabase não encontrado.', 'error', 3000);
    return;
  }
  
  const btn = document.getElementById('btn-gatec-sync-supabase');
  if (btn) { btn.disabled = true; btn.dataset.textoOriginal = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando planilha...'; }
  
  try {
    const dados = await _gatecCarregarCSVFonte();
    const total = dados.length;
    const registrosBrutos = [];
    
    for (let i = 0; i < total; i += 1000) {
      const bloco = dados.slice(i, i + 1000);
      const blocoPronto = await Promise.all(bloco.map(_gatecMontarRegistroSupabase));
      registrosBrutos.push(...blocoPronto);
      if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Preparando... ${Math.min(i + 1000, total)}/${total}`;
    }
    
    const porHash = new Map();
    registrosBrutos.forEach(r => porHash.set(r.linha_hash, r));
    const registros = [...porHash.values()];
    const duplicatasNaPlanilha = registrosBrutos.length - registros.length;
    
    if (duplicatasNaPlanilha > 0) {
      console.warn(`[Liberações→Supabase] ${duplicatasNaPlanilha} linha(s) duplicada(s) na própria planilha — mantida só a mais recente de cada.`);
    }
    
    const LOTE = 300;
    let enviados = 0, erros = 0, erroConstraint = false;
    
    for (let i = 0; i < registros.length; i += LOTE) {
      const lote = registros.slice(i, i + LOTE);
      const { error } = await _sbClient.from('liberacoes_gatec').upsert(lote, { onConflict: 'linha_hash' });
      if (error) {
        erros++;
        console.error('[Liberações→Supabase] erro no lote', i, error);
        if (error.code === '42P10' || /unique or exclusion constraint/i.test(error.message || '')) erroConstraint = true;
      }
      enviados += lote.length;
      if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Enviando... ${enviados}/${registros.length}`;
    }
    
    if (erroConstraint) {
      if (typeof showToast === 'function') showToast('❌ Falta um índice único em "linha_hash" no Supabase.', 'error', 9000);
    } else if (erros === 0) {
      const avisoDup = duplicatasNaPlanilha > 0 ? ` (${duplicatasNaPlanilha} linha(s) duplicada(s) na planilha foram ignoradas)` : '';
      if (typeof showToast === 'function') showToast(`✅ Supabase sincronizado: ${registros.length} linhas.${avisoDup}`, 'success', 4500);
    } else {
      if (typeof showToast === 'function') showToast(`⚠️ Sincronizado com ${erros} lote(s) com erro — veja o console (F12).`, 'error', 5000);
    }
    
    await carregarDadosGATEC();
  } catch (e) {
    console.error('[Liberações→Supabase] erro geral', e);
    if (typeof showToast === 'function') showToast('❌ Erro ao sincronizar com o Supabase — veja o console (F12).', 'error', 5000);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.textoOriginal || '<i class="fas fa-cloud-arrow-up"></i>'; }
  }
}

async function carregarDadosGATEC() {
  const corpoPrevia = document.getElementById('corpo-tabela-gatec');
  if (corpoPrevia) corpoPrevia.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-3);padding:24px;font-size:12px;"><i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Carregando Liberações...</td></tr>`;

  if (typeof _sbClient === 'undefined') {
    if (typeof showToast === 'function') showToast('⚠️ Cliente Supabase não encontrado.', 'error', 3500);
    return;
  }

  let dados;
  try {
    const brutos = await _gatecBuscarSupabasePaginado();
    dados = brutos.map(r => ({
      'LIBERAÇÃO'      : r.cod_liberacao || '',
      'FRENTE'         : r.frente || '',
      'DESC.FAZENDA'   : r.desc_fazenda || '',
      'LISTAGEM TALHAO': r.listagem_talhao || '',
      'PROD. ESTIMADA' : formatarNumeroCurto(r.prod_estimada),
      'PROD. REAL'     : formatarNumeroCurto(r.prod_real),
      'DIF PROD.'      : formatarNumeroCurto(r.dif_prod),
      'TCH'            : formatarNumeroCurto(r.tch),
      'STATUS OS'      : r.status_os || '',
    }));
  } catch (err) {
    console.error('[Liberações] Erro Supabase:', err);
    if (corpoPrevia) corpoPrevia.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--red);padding:24px;font-size:12px;"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>Erro ao carregar dados do Supabase. Verifique se está logado e tente de novo.</td></tr>`;
    return;
  }

  if (!dados.length) {
    if (corpoPrevia) corpoPrevia.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-3);padding:24px;font-size:12px;"><i class="fas fa-info-circle" style="margin-right:6px;"></i>Nenhum dado sincronizado ainda. Use o ícone de nuvem pra sincronizar.</td></tr>`;
    return;
  }

  window._gatecDados = dados;
  const resumoFrentes = {};
  let totalProduzido = 0;
  const frentesPermitidas = ["401", "402", "403", "404", "451"];
  
  dados.forEach(row => {
    const frente = (row["FRENTE"] || "Sem Frente").trim();
    if (!frentesPermitidas.includes(frente)) return; 
    
    const prodReal = parseFloat(String(row["PROD. REAL"] || "0").replace(/\./g, "").replace(",", ".")) || 0;
    resumoFrentes[frente] = (resumoFrentes[frente] || 0) + prodReal;
    totalProduzido += prodReal;
  });
  
  const resumoCards = document.getElementById("resumoCards");
  if (resumoCards) {
    resumoCards.innerHTML = "";
    let frenteLider = "-";
    let maiorValor = 0;
    
    Object.entries(resumoFrentes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([frente, valor], index) => {
        if (valor > maiorValor) {
          maiorValor = valor;
          frenteLider = frente;
        }
        
        let medalhaHtml = "";
        let rankClass = "";
        if (index === 0) {
          medalhaHtml = '<span class="medal gold"><i class="fas fa-medal"></i> 1º</span>';
          rankClass = "rank-1";
        } else if (index === 1) {
          medalhaHtml = '<span class="medal silver"><i class="fas fa-medal"></i> 2º</span>';
          rankClass = "rank-2";
        } else if (index === 2) {
          medalhaHtml = '<span class="medal bronze"><i class="fas fa-medal"></i> 3º</span>';
          rankClass = "rank-3";
        } else {
          medalhaHtml = `<span class="medal-text">${index + 1}º</span>`;
          rankClass = "rank-others";
        }
        
        const metasSafra = { "401": 360491, "402": 310186, "403": 294189, "404": 307888, "451": 310133 };
        const meta = metasSafra[frente] || null;
        const aderencia = meta ? Math.min((valor / meta) * 100, 999) : null;
        const aderenciaFormatada = aderencia !== null ? aderencia.toFixed(1) + "%" : "—";
        const aderenciaCor = aderencia === null ? "var(--text-3)" : aderencia >= 90 ? "#1B5E20" : aderencia >= 70 ? "#E65100" : "#C62828";
        const metaFormatada = meta ? formatarNumeroCurto(meta) + " t" : "—";
        
        resumoCards.innerHTML += `
          <div class="frente-card ${rankClass}">
            <div class="frente-card-header">
              ${medalhaHtml}
              <span class="frente-title">Frente ${frente}</span>
            </div>
            <div class="frente-value">
              ${formatarNumeroCurto(valor)} <span class="frente-unit">t</span>
            </div>
            <div style="margin-top:8px; border-top:1px solid var(--border); padding-top:7px; display:flex; justify-content:space-between; align-items:center; gap:4px;">
              <span style="font-size:9px; font-weight:600; color:var(--text-3); text-transform:uppercase; letter-spacing:0.4px;">Meta: ${metaFormatada}</span>
              <span style="font-size:11px; font-weight:800; color:${aderenciaCor};">${aderenciaFormatada}</span>
            </div>
          </div>
        `;
      });
      
    const totalEl = document.getElementById("totalProduzido");
    const liderEl = document.getElementById("frenteLider");
    if (totalEl) totalEl.textContent = formatarNumeroCurto(totalProduzido) + " t";
    if (liderEl) liderEl.textContent = frenteLider;
  }
  
  const corpo = document.getElementById('corpo-tabela-gatec');
  corpo.innerHTML = dados.map(row => {
    const status = (row["STATUS OS"] || "").toUpperCase().trim();
    const isEncerrada = status.includes("ENCERRADA");
    const prodEst  = row["PROD. ESTIMADA"] || "—";
    const prodReal = row["PROD. REAL"]     || "—";
    const difProd  = row["DIF PROD."]      || "—";
    const tch      = row["TCH"]            || "—";
    
    const difNum = parseFloat(String(difProd).replace(/\./g, '').replace(',', '.'));
    const difColor = isNaN(difNum) ? "inherit" : (difNum >= 0 ? "#1B5E20" : "#C62828");
    
    return `<tr class="linha-tabela">
      <td data-label="Liberação:">${row["LIBERAÇÃO"] || ""}</td>
      <td data-label="Frente:">${row["FRENTE"] || ""}</td>
      <td data-label="Fazenda:">${row["DESC.FAZENDA"] || ""}</td>
      <td data-label="Talhões:" style="word-break:break-all;">${row["LISTAGEM TALHAO"] || ""}</td>
      <td data-label="Prod. Est.:" style="text-align:right;">${prodEst}</td>
      <td data-label="Prod. Real:" style="text-align:right;">${prodReal}</td>
      <td data-label="Dif. Prod.:" style="text-align:right; font-weight:600; color:${difColor};">${difProd}</td>
      <td data-label="TCH:" style="text-align:right;">${tch}</td>
      <td data-label="Status:" style="text-align:center;">
        <span class="badge" style="background:${isEncerrada ? '#FFEBEE' : '#E8F5E9'}; color:${isEncerrada ? '#C62828' : '#1B5E20'};">
          ${isEncerrada ? 'ENCERRADA' : 'ABERTA'}
        </span>
      </td>
    </tr>`;
  }).join('');
  
  filtrarTabela();
  
  const abertas = dados.filter(row => {
    const s = (row["STATUS OS"] || "").toUpperCase().trim();
    return !s.includes("ENCERRADA");
  }).length;
  
  const badge = document.getElementById('badge-liberacoes');
  if (badge) {
    badge.textContent = abertas;
    badge.style.display = abertas > 0 ? 'inline-flex' : 'none';
  }
  
  const syncStatus = document.getElementById('gatec-sync-status');
  const syncLabel  = document.getElementById('gatec-sync-label');
  if (syncStatus && syncLabel) {
    const agora = new Date();
    const hh = String(agora.getHours()).padStart(2,'0');
    const mm = String(agora.getMinutes()).padStart(2,'0');
    syncLabel.textContent = `Sync ${hh}:${mm}`;
    syncStatus.style.display = 'inline-flex';
    syncStatus.style.alignItems = 'center';
    window._gatecUltimaSyncTs = Date.now();
    _atualizarCorSyncStatus();
  }
  
  registrarSync('ok', 'GATEC/Liberações');
  atualizarResumoExecutivo();
}

/* ══════════════════════════════════════════════
CONFERÊNCIA OPERADORES X O.S
══════════════════════════════════════════════ */
const URL_CONF = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTIIUGH-g6vlowVBAAkgoPwZd1EPJPJS8PzgOEWyDPito38Ii8qzOHaSh1PioGGMLNbwFJPDMzwsA7/pub?gid=781227222&single=true&output=csv";

function _confTxtOuNull(v) {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
}

async function _confSha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function _confMontarRegistroSupabase(row, cols) {
  const reg = {
    nr_os             : _confTxtOuNull(row[cols.colOS]),
    data_encerramento : _confTxtOuNull(row[cols.colData]),
    desc_fazenda      : _confTxtOuNull(row[cols.colFazenda]),
    desc_operacao     : _confTxtOuNull(row[cols.colOperacao]),
    observacao        : _confTxtOuNull(row[cols.colObs]),
  };
  const base = Object.keys(reg).sort().map(k => `${k}=${reg[k] ?? ''}`).join('|');
  reg.linha_hash = await _confSha256Hex(base);
  return reg;
}

function _confDetectarColunas(fields) {
  function findCol(keywords) {
    return fields.find(c => keywords.some(k => c.toUpperCase().includes(k))) || '';
  }
  return {
    colOS       : findCol(['Nº', 'N°', 'NO', 'OS', 'O.S', 'NUMERO', 'NÚMERO']),
    colData     : findCol(['DATA', 'ENCERR', 'FECHA']),
    colFazenda  : findCol(['FAZENDA', 'FARM', 'PROPRI']),
    colOperacao : findCol(['OPERA', 'AGRICOLA', 'AGRÍCOLA', 'ATIVIDADE', 'SERVIÇO', 'SERVICO']),
    colObs      : findCol(['OBS', 'OBSERV']),
  };
}

function _confCarregarCSVFonte() {
  return new Promise((resolve, reject) => {
    Papa.parse(URL_CONF, {
      download: true, header: true, skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || !results.data.length) { reject(new Error('Nenhum dado encontrado.')); return; }
        resolve({ dados: results.data, cols: _confDetectarColunas(results.meta.fields || []) });
      },
      error: reject,
    });
  });
}

async function _confBuscarSupabasePaginado() {
  const PAGINA = 1000;
  let de = 0, todas = [];
  while (true) {
    const { data, error } = await _sbClient.from('conf_os').select('*').order('id', { ascending: true }).range(de, de + PAGINA - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    todas.push(...data);
    if (data.length < PAGINA) break;
    de += PAGINA;
  }
  return todas;
}

async function sincronizarConfOsSupabase() {
  if (typeof _sbClient === 'undefined') { if (typeof showToast === 'function') showToast('⚠️ Cliente Supabase não encontrado.', 'error', 3000); return; }
  
  const btn = document.getElementById('btn-conf-os-sync-supabase');
  if (btn) { btn.disabled = true; btn.dataset.textoOriginal = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
  
  try {
    const { dados, cols } = await _confCarregarCSVFonte();
    const registros = await Promise.all(dados.map(row => _confMontarRegistroSupabase(row, cols)));
    
    const LOTE = 300;
    let erros = 0;
    for (let i = 0; i < registros.length; i += LOTE) {
      const lote = registros.slice(i, i + LOTE);
      const { error } = await _sbClient.from('conf_os').upsert(lote, { onConflict: 'linha_hash' });
      if (error) { erros++; console.error('[Conf O.S.→Supabase] erro no lote', i, error); }
    }
    
    if (typeof showToast === 'function') showToast(erros === 0 ? `✅ Supabase sincronizado: ${registros.length} linhas.` : `⚠️ ${erros} lote(s) com erro — veja o console.`, erros === 0 ? 'success' : 'error', 4000);
    await carregarDadosConfOS();
  } catch (e) {
    console.error('[Conf O.S.→Supabase] erro geral', e);
    if (typeof showToast === 'function') showToast('❌ Erro ao sincronizar — veja o console (F12).', 'error', 5000);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.textoOriginal || '<i class="fas fa-cloud-arrow-up"></i>'; }
  }
}
window.sincronizarConfOsSupabase = sincronizarConfOsSupabase;

async function carregarDadosConfOS() {
  const corpo = document.getElementById('corpo-tabela-conf-os');
  const contador = document.getElementById('conf-os-contador');
  if (!corpo) return;
  
  corpo.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-3);padding:24px;font-size:12px;"><i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Carregando dados...</td></tr>`;
  if (contador) contador.textContent = 'Carregando...';
  
  if (typeof _sbClient === 'undefined') {
    corpo.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:24px;font-size:12px;">Cliente Supabase não encontrado.</td></tr>`;
    return;
  }
  
  try {
    const brutos = await _confBuscarSupabasePaginado();
    const dados = brutos.map(r => ({
      NR_OS: r.nr_os || '', DATA_ENCERRAMENTO: r.data_encerramento || '',
      DESC_FAZENDA: r.desc_fazenda || '', DESC_OPERACAO: r.desc_operacao || '', OBSERVACAO: r.observacao || '',
    }));
    
    window._confOsDados = dados;
    window._confOsCols  = { colOS: 'NR_OS', colData: 'DATA_ENCERRAMENTO', colFazenda: 'DESC_FAZENDA', colOperacao: 'DESC_OPERACAO', colObs: 'OBSERVACAO' };
    
    if (!dados.length) {
      corpo.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-3);padding:24px;font-size:12px;">Nenhum dado sincronizado ainda. Use o ícone de nuvem pra sincronizar.</td></tr>`;
      if (contador) contador.textContent = '0 registros';
      return;
    }
    
    renderTabelaConfOS(dados);
  } catch (err) {
    console.error('[Conf O.S.] Erro Supabase:', err);
    corpo.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:24px;font-size:12px;">Erro ao carregar dados do Supabase. Verifique se está logado.</td></tr>`;
    if (contador) contador.textContent = 'Erro';
  }
}

function renderTabelaConfOS(dados) {
  const corpo = document.getElementById('corpo-tabela-conf-os');
  const contador = document.getElementById('conf-os-contador');
  if (!corpo) return;
  
  const { colOS, colData, colFazenda, colOperacao, colObs } = window._confOsCols || {};
  
  if (!dados || dados.length === 0) {
    corpo.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-3);padding:20px;font-size:12px;">Nenhum registro encontrado para os filtros aplicados.</td></tr>`;
    if (contador) contador.textContent = '0 registros';
    return;
  }
  
  corpo.innerHTML = dados.map(row => {
    const os       = escapeHtml(row[colOS]       || '—');
    const data     = escapeHtml(row[colData]     || '—');
    const fazenda  = escapeHtml(row[colFazenda]  || '—');
    const operacao = escapeHtml(row[colOperacao] || '—');
    const obs      = escapeHtml(row[colObs]      || '');
    
    return `<tr>
      <td data-label="Nº da O.S:" style="font-weight:700; color:var(--green-900);">${os}</td>
      <td data-label="Data Encerramento:">${data}</td>
      <td data-label="Fazenda:">${fazenda}</td>
      <td data-label="Operação Agrícola:">${operacao}</td>
      <td data-label="OBS:" style="color:var(--text-3); font-size:11px;">${obs}</td>
    </tr>`;
  }).join('');
  
  if (contador) contador.textContent = `${dados.length} registro${dados.length !== 1 ? 's' : ''} encontrado${dados.length !== 1 ? 's' : ''}`;
}

function filtrarTabelaConf() {
  const bFazenda   = (document.getElementById('filtroConfFazenda')?.value   || '').toLowerCase();
  const bOperacao  = (document.getElementById('filtroConfOperacao')?.value  || '').toLowerCase();
  const bObs       = (document.getElementById('filtroConfObs')?.value       || '').toLowerCase();
  
  if (!window._confOsDados) return;
  
  const filtrados = window._confOsDados.filter(row => {
    const { colFazenda, colOperacao, colObs } = window._confOsCols || {};
    const fazenda  = (row[colFazenda]  || '').toLowerCase();
    const operacao = (row[colOperacao] || '').toLowerCase();
    const obs      = (row[colObs]      || '').toLowerCase();
    return fazenda.includes(bFazenda) && operacao.includes(bOperacao) && obs.includes(bObs);
  });
  
  renderTabelaConfOS(filtrados);
}

function exportarConfOsExcel() {
  if (!window._confOsDados) { showToast('⚠️ Nenhum dado carregado para exportar.', 'error', 2500); return; }
  
  const bFazenda  = (document.getElementById('filtroConfFazenda')?.value  || '').toLowerCase();
  const bOperacao = (document.getElementById('filtroConfOperacao')?.value || '').toLowerCase();
  const bObs      = (document.getElementById('filtroConfObs')?.value      || '').toLowerCase();
  
  const { colOS, colData, colFazenda, colOperacao, colObs } = window._confOsCols || {};
  
  const filtrados = window._confOsDados.filter(row => {
    const fazenda  = (row[colFazenda]  || '').toLowerCase();
    const operacao = (row[colOperacao] || '').toLowerCase();
    const obs      = (row[colObs]      || '').toLowerCase();
    return fazenda.includes(bFazenda) && operacao.includes(bOperacao) && obs.includes(bObs);
  });
  
  if (filtrados.length === 0) { showToast('⚠️ Nenhum registro para exportar.', 'error', 2500); return; }
  
  const cabecalho = ['Nº da O.S', 'Data Encerramento', 'Fazenda', 'Operação Agrícola', 'OBS'];
  const linhas = filtrados.map(row => [
    row[colOS]       || '',
    row[colData]     || '',
    row[colFazenda]  || '',
    row[colOperacao] || '',
    row[colObs]      || ''
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));
  
  const csv = '\uFEFF' + cabecalho.map(c => `"${c}"`).join(';') + '\n' + linhas.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `conf_os_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast(`✅ ${filtrados.length} registros exportados!`, 'success', 2500);
}

function exportarPDFConfOS() {
  if (!window._confOsDados) { showToast('⚠️ Nenhum dado carregado para exportar.', 'error', 2500); return; }
  
  const bFazenda  = (document.getElementById('filtroConfFazenda')?.value  || '').toLowerCase();
  const bOperacao = (document.getElementById('filtroConfOperacao')?.value || '').toLowerCase();
  const bObs      = (document.getElementById('filtroConfObs')?.value      || '').toLowerCase();
  
  const { colOS, colData, colFazenda, colOperacao, colObs } = window._confOsCols || {};
  
  const filtrados = window._confOsDados.filter(row => {
    const fazenda  = (row[colFazenda]  || '').toLowerCase();
    const operacao = (row[colOperacao] || '').toLowerCase();
    const obs      = (row[colObs]      || '').toLowerCase();
    return fazenda.includes(bFazenda) && operacao.includes(bOperacao) && obs.includes(bObs);
  });
  
  if (filtrados.length === 0) { showToast('⚠️ Nenhum registro para exportar.', 'error', 2500); return; }
  
  const filtrosTxt = [
    bFazenda  ? 'Fazenda: "' + bFazenda + '"' : null,
    bOperacao ? 'Operação: "' + bOperacao + '"' : null,
    bObs      ? 'OBS: "' + bObs + '"' : null,
  ].filter(Boolean).join('   ·   ') || 'Sem filtros aplicados — todos os registros';
  
  const { pdf, y } = _novoPDFRelatorio('Conferência Operadores × O.S.', `${filtrados.length} registros · ${filtrosTxt}`, 'portrait');
  
  pdf.autoTable({
    ...(_PDF_TABLE_ESTILO),
    startY: y,
    head: [['Nº da O.S', 'Data Encerramento', 'Fazenda', 'Operação Agrícola', 'OBS']],
    body: filtrados.map(row => [
      row[colOS]       || '—',
      row[colData]     || '—',
      row[colFazenda]  || '—',
      row[colOperacao] || '—',
      row[colObs]      || '—',
    ]),
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const raw = String(data.cell.raw || '').toUpperCase();
        if (raw.includes('SEM APONTAMENTO')) { data.cell.styles.textColor = [198, 40, 40]; data.cell.styles.fontStyle = 'bold'; }
        else if (raw === 'OK') { data.cell.styles.textColor = [46, 125, 50]; data.cell.styles.fontStyle = 'bold'; }
      }
    },
  });
  
  const nomeArq = `Conferencia_OS_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`;
  _finalizarPDFRelatorio(pdf, nomeArq);
}

function exportarExcelLiberacoes() {
  if (!window._gatecDados || window._gatecDados.length === 0) {
    showToast('⚠️ Nenhum dado de Liberações carregado para exportar.', 'error', 2500);
    return;
  }
  
  const frentesSel = window._libFrentesSelecionadas || new Set();
  const bStatus    = (document.getElementById('filtroStatus')?.value  || '');
  
  const filtrados = window._gatecDados.filter(row => {
    const frente  = (row['FRENTE']       || '').trim();
    const status  = (row['STATUS OS']    || '').toUpperCase();
    const okFrente = frentesSel.size === 0 || frentesSel.has(frente);
    const statusOk = bStatus === '' || (bStatus === 'ENCERRADA' ? status.includes('ENCERRADA') : !status.includes('ENCERRADA'));
    return okFrente && _libFazendaOk(row['DESC.FAZENDA']) && statusOk;
  });
  
  if (filtrados.length === 0) { showToast('⚠️ Nenhum registro para exportar.', 'error', 2500); return; }
  
  const cabecalho = ['Liberação', 'Frente', 'Fazenda', 'Talhões', 'Prod. Estimada', 'Prod. Real', 'TCH', 'Dif. Prod.', 'Status'];
  const linhas = filtrados.map(row => {
    const status = (row['STATUS OS'] || '').toUpperCase();
    return [
      row['LIBERAÇÃO']        || '',
      row['FRENTE']           || '',
      row['DESC.FAZENDA']     || '',
      row['LISTAGEM TALHAO']  || '',
      row['PROD. ESTIMADA']   || '',
      row['PROD. REAL']       || '',
      row['TCH']              || '',
      row['DIF PROD.']        || '',
      status.includes('ENCERRADA') ? 'ENCERRADA' : 'ABERTA'
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';');
  });
  
  const csv  = '\uFEFF' + cabecalho.map(c => `"${c}"`).join(';') + '\n' + linhas.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `liberacoes_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast(`✅ ${filtrados.length} liberações exportadas!`, 'success', 2500);
}

function exportarPDFLiberacoes() {
  if (!window._gatecDados || window._gatecDados.length === 0) {
    showToast('⚠️ Nenhum dado de Liberações carregado para exportar.', 'error', 2500);
    return;
  }
  
  const frentesSel = window._libFrentesSelecionadas || new Set();
  const fazendaTxt = _libFazendaFiltroTxt();
  const bStatus    = (document.getElementById('filtroStatus')?.value  || '');
  
  const filtrados = window._gatecDados.filter(row => {
    const frente  = (row['FRENTE']       || '').trim();
    const status  = (row['STATUS OS']    || '').toUpperCase();
    const okFrente = frentesSel.size === 0 || frentesSel.has(frente);
    const statusOk = bStatus === '' || (bStatus === 'ENCERRADA' ? status.includes('ENCERRADA') : !status.includes('ENCERRADA'));
    return okFrente && _libFazendaOk(row['DESC.FAZENDA']) && statusOk;
  });
  
  if (filtrados.length === 0) { showToast('⚠️ Nenhum registro para exportar.', 'error', 2500); return; }
  
  const filtrosTxt = [
    frentesSel.size ? 'Frente: ' + [...frentesSel].join(', ') : null,
    fazendaTxt ? 'Fazenda: ' + fazendaTxt : null,
    bStatus  ? 'Status: ' + (bStatus === 'ENCERRADA' ? 'Encerradas' : 'Abertas') : null,
  ].filter(Boolean).join('   ·   ') || 'Sem filtros aplicados — todos os registros';
  
  const totalProd = filtrados.reduce((s, r) => s + (parseFloat(String(r['PROD. REAL']||'0').replace(/\./g,'').replace(',','.')) || 0), 0);
  const subtitulo = `${filtrados.length} liberações · ${filtrosTxt} · Total produzido: ${formatarNumeroCurto(totalProd)} t`;
  
  const { pdf, y } = _novoPDFRelatorio('Liberações', subtitulo, 'landscape');
  
  const linhas = filtrados.map(row => {
    const status = (row['STATUS OS'] || '').toUpperCase();
    return [
      row['LIBERAÇÃO']       || '—',
      row['FRENTE']          || '—',
      row['DESC.FAZENDA']    || '—',
      row['LISTAGEM TALHAO'] || '—',
      row['PROD. ESTIMADA']  || '—',
      row['PROD. REAL']      || '—',
      row['DIF PROD.']       || '—',
      row['TCH']             || '—',
      status.includes('ENCERRADA') ? 'ENCERRADA' : 'ABERTA',
    ];
  });
  
  pdf.autoTable({
    ...(_PDF_TABLE_ESTILO),
    startY: y,
    head: [['Liberação', 'Frente', 'Fazenda', 'Talhões', 'Prod. Est.', 'Prod. Real', 'Dif. Prod.', 'TCH', 'Status']],
    body: linhas,
    columnStyles: {
      3: { cellWidth: 55 },
      4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
      8: { halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 6) {
          const raw = String(data.cell.raw || '');
          if (raw.includes('-')) data.cell.styles.textColor = [198, 40, 40];
          else if (raw !== '—' && raw !== 'SEM PRODUÇÃO') data.cell.styles.textColor = [46, 125, 50];
          if (raw !== '—') data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 8) {
          const raw = String(data.cell.raw || '');
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = raw === 'ENCERRADA' ? [120, 120, 120] : [46, 125, 50];
        }
      }
    },
  });
  
  const nomeArq = `Liberacoes_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`;
  _finalizarPDFRelatorio(pdf, nomeArq);
}

/* ══════════════════════════════════════════════
CHIPS MULTI-SELEÇÃO DE FRENTES — LIBERAÇÕES
══════════════════════════════════════════════ */
window._libFrentesSelecionadas = new Set();

function libToggleFrente(btn) {
  const frente = btn.dataset.frente;
  const chips  = document.querySelectorAll('#lib-frentes-chips .lib-frente-chip');
  
  if (frente === '') {
    window._libFrentesSelecionadas.clear();
    chips.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
  } else {
    document.querySelector('.lib-frente-chip[data-frente=""]')?.classList.remove('active');
    if (window._libFrentesSelecionadas.has(frente)) {
      window._libFrentesSelecionadas.delete(frente);
      btn.classList.remove('active');
    } else {
      window._libFrentesSelecionadas.add(frente);
      btn.classList.add('active');
    }
    if (window._libFrentesSelecionadas.size === 0) {
      document.querySelector('.lib-frente-chip[data-frente=""]')?.classList.add('active');
    }
  }
  
  _atualizarContadorFrentesLib();
  filtrarTabela();
}

function _atualizarContadorFrentesLib() {
  const contador = document.getElementById('lib-frentes-contador');
  if (!contador) return;
  const n = window._libFrentesSelecionadas.size;
  if (n >= 2) {
    contador.textContent = `${n} selecionadas`;
    contador.style.display = 'inline';
  } else {
    contador.style.display = 'none';
  }
}

/* ══════════════════════════════════════════════
APP-SS: Search-Select genérico reutilizável
══════════════════════════════════════════════ */
function _appSSRefs(ssId) {
  const wrap  = document.getElementById('ss-' + ssId);
  if (!wrap) return null;
  return {
    wrap,
    input:    wrap.querySelector('.app-ss-input'),
    lista:    wrap.querySelector('.app-ss-lista'),
    clearBtn: wrap.querySelector('.app-ss-clear'),
  };
}

function _appSSRenderLista(ssId, termo, opts) {
  const r = _appSSRefs(ssId);
  if (!r) return;
  
  const termoN = (termo || '').trim().toLowerCase();
  const filtradas = !termoN ? opts : opts.filter(o => o.label.toLowerCase().includes(termoN));
  
  if (!filtradas.length) {
    r.lista.innerHTML = '<div class="app-ss-opt ss-empty">Nenhum resultado</div>';
    return;
  }
  
  r.lista.innerHTML = filtradas.map(o => {
    const sel = o.value === (r.input.dataset.value || '');
    return `<div class="app-ss-opt${sel ? ' selected' : ''}" data-val="${o.value.replace(/"/g,'&quot;')}">${o.label}</div>`;
  }).join('');
  
  r.lista.querySelectorAll('.app-ss-opt[data-val]').forEach(div => {
    div.addEventListener('mousedown', ev => {
      ev.preventDefault();
      _appSSEscolher(ssId, div.dataset.val, div.textContent);
    });
  });
}

function appSSAbrir(ssId) {
  const r = _appSSRefs(ssId);
  if (!r) return;
  
  document.querySelectorAll('.app-ss.open').forEach(el => {
    if (el.id !== 'ss-' + ssId) el.classList.remove('open');
  });
  
  r.wrap.classList.add('open');
  r.input.select();
  _appSSRenderListaFromSource(ssId, '');
}

function appSSFiltrar(ssId) {
  const r = _appSSRefs(ssId);
  if (!r) return;
  r.wrap.classList.add('open');
  r.clearBtn.style.display = r.input.value ? 'block' : 'none';
  _appSSRenderListaFromSource(ssId, r.input.value);
}

function _appSSEscolher(ssId, val, label) {
  const r = _appSSRefs(ssId);
  if (!r) return;
  
  r.input.dataset.value = val;
  r.input.value = val ? label : '';
  r.clearBtn.style.display = val ? 'block' : 'none';
  r.wrap.classList.remove('open');
  
  const assocId = r.wrap.dataset.selectId;
  if (assocId) {
    const sel = document.getElementById(assocId);
    if (sel) { sel.value = val; sel.dispatchEvent(new Event('change')); }
  }
  
  const hiddenInp = document.getElementById('filtro' + ssId.charAt(0).toUpperCase() + ssId.slice(1).split('-')[0]);
  if (!assocId && hiddenInp) { hiddenInp.value = val; filtrarTabela(); }
  else if (!assocId) { filtrarTabela(); }
}

function appSSLimpar(ssId) {
  _appSSEscolher(ssId, '', '');
}

function _appSSRenderListaFromSource(ssId, termo) {
  const r = _appSSRefs(ssId);
  if (!r) return;
  
  const assocId = r.wrap.dataset.selectId;
  let opts = [];
  
  if (assocId) {
    const sel = document.getElementById(assocId);
    if (sel) opts = Array.from(sel.options).filter(o => o.value).map(o => ({ value: o.value, label: o.textContent }));
  } else {
    try { opts = JSON.parse(r.wrap.dataset.opts || '[]'); } catch(e) { opts = []; }
  }
  
  _appSSRenderLista(ssId, termo, opts);
}

function popularFazendaLibSelect() {
  if (!window._gatecDados) return;
  
  const fazendas = [...new Set(window._gatecDados.map(r => (r['DESC.FAZENDA'] || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true }));
    
  window._tratosMultiSel    = window._tratosMultiSel    || {};
  window._tratosMultiOpcoes = window._tratosMultiOpcoes || {};
  
  if (!window._tratosMultiSel.libFazenda) window._tratosMultiSel.libFazenda = new Set();
  window._tratosMultiOpcoes.libFazenda = fazendas.map(f => ({ value: f, label: f }));
  
  const validos = new Set(fazendas);
  [...window._tratosMultiSel.libFazenda].forEach(v => { if (!validos.has(v)) window._tratosMultiSel.libFazenda.delete(v); });
  
  if (typeof window._tratosMSSyncDisplay === 'function') window._tratosMSSyncDisplay('libFazenda');
}

document.addEventListener('click', ev => {
  document.querySelectorAll('.app-ss.open').forEach(wrap => {
    if (!wrap.contains(ev.target)) wrap.classList.remove('open');
  });
});

function toggleResumoMobile() {
  const el = document.getElementById('resumoFrentes');
  if (!el) return;
  const aberto = el.classList.toggle('mobile-aberto');
  const label = document.getElementById('resumo-mobile-label');
  if (label) label.textContent = aberto ? 'Toque para recolher' : 'Toque para expandir';
}

function _libFazendaSelecionadas() {
  return window._tratosMultiSel?.libFazenda || new Set();
}

function _libFazendaOk(fazendaTxt) {
  const sel = _libFazendaSelecionadas();
  if (!sel.size) return true;
  const alvo = (fazendaTxt || '').trim().toLowerCase();
  for (const f of sel) { if (alvo === (f || '').trim().toLowerCase()) return true; }
  return false;
}

function _libFazendaFiltroTxt() {
  const sel = _libFazendaSelecionadas();
  return sel.size ? [...sel].join(', ') : '';
}

function filtrarTabela() {
  const frentesSel = window._libFrentesSelecionadas || new Set();
  const bStatus  = document.getElementById('filtroStatus')?.value || '';
  
  document.querySelectorAll('#corpo-tabela-gatec tr').forEach(linha => {
    const frente  = (linha.cells[1]?.innerText || '').trim();
    const fazenda = (linha.cells[2]?.innerText || '').trim();
    const status  = (linha.cells[8]?.innerText || '').toUpperCase().trim();
    
    const okFrente  = frentesSel.size === 0 || frentesSel.has(frente);
    const okFazenda = _libFazendaOk(fazenda);
    const okStatus  = !bStatus  || status.includes(bStatus);
    
    linha.style.display = (okFrente && okFazenda && okStatus) ? '' : 'none';
  });
}

/* ══════════════════════════════════════════════
MÓDULO DE CLIMA — Open-Meteo API
══════════════════════════════════════════════ */
let climaAtual = { lat: -20.72, lon: -46.61, nome: 'Passos' };

const CIDADES_COORDS = {
  '-20.61|-46.42|São João Batista do Glória': { lat: -20.61, lon: -46.42, nome: 'São João Batista do Glória' },
  '-20.34|-46.85|Delfinópolis': { lat: -20.34, lon: -46.85, nome: 'Delfinópolis' },
  '-20.72|-46.61|Passos': { lat: -20.72, lon: -46.61, nome: 'Passos' },
  '-20.86|-46.39|Alpinópolis': { lat: -20.86, lon: -46.39, nome: 'Alpinópolis' },
  '-20.47|-45.93|Piumhi': { lat: -20.47, lon: -45.93, nome: 'Piumhi' },
  '-21.30|-46.71|Guaxupé': { lat: -21.30, lon: -46.71, nome: 'Guaxupé' },
  '-21.09|-47.05|Itamogi': { lat: -21.09, lon: -47.05, nome: 'Itamogi' },
  '-20.92|-46.99|São Sebastião do Paraíso': { lat: -20.92, lon: -46.99, nome: 'São Sebastião do Paraíso' },
  '-21.47|-47.01|Mococa': { lat: -21.47, lon: -47.01, nome: 'Mococa' },
  '-21.90|-47.62|Descalvado': { lat: -21.90, lon: -47.62, nome: 'Descalvado' },
  '-21.88|-49.03|Iacanga': { lat: -21.88, lon: -49.03, nome: 'Iacanga' }
};

function onCidadeSelectChange() {
  const val = document.getElementById('cidade-select').value;
  const wrap = document.getElementById('cidade-custom-wrap');
  wrap.style.display = (val === 'outro') ? 'block' : 'none';
}

function showClimaTab(tab) {
  document.querySelectorAll('.clima-sub-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.clima-sub-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  
  const btns = document.querySelectorAll('.clima-sub-btn');
  const map = { previsao5: 0, tendencia30: 1, historico: 2 };
  btns[map[tab]].classList.add('active');
}

function getCidadeAtual() {
  const val = document.getElementById('cidade-select').value;
  if (val === 'outro') {
    const nomeCustom = document.getElementById('cidade-custom-input').value.trim() || 'Cidade';
    return { lat: -19.92, lon: -43.94, nome: nomeCustom };
  }
  return CIDADES_COORDS[val] || { lat: -20.72, lon: -46.61, nome: 'Passos' };
}

async function buscarClima() {
  const cidade = getCidadeAtual();
  climaAtual = cidade;
  
  document.getElementById('forecast5-container').innerHTML = '<div class="clima-loading"><i class="fas fa-spinner fa-spin"></i>Carregando previsão para ' + escapeHtml(cidade.nome) + '...</div>';
  document.getElementById('forecast30-container').innerHTML = '<div class="clima-loading"><i class="fas fa-spinner fa-spin"></i>Carregando tendência...</div>';
  
  try {
    const url5 = `https://api.open-meteo.com/v1/forecast?latitude=${cidade.lat}&longitude=${cidade.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&current_weather=true&hourly=temperature_2m&timezone=America/Sao_Paulo&forecast_days=7`;
    const r5 = await fetch(url5);
    const d5 = await r5.json();
    renderPrevisao5(d5, cidade.nome);
    
    const url30 = `https://api.open-meteo.com/v1/forecast?latitude=${cidade.lat}&longitude=${cidade.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=America/Sao_Paulo&forecast_days=16`;
    const r30 = await fetch(url30);
    const d30 = await r30.json();
    renderTendencia30(d30, cidade.nome);
  } catch (err) {
    document.getElementById('forecast5-container').innerHTML = '<div class="clima-loading" style="color:var(--red)"><i class="fas fa-exclamation-triangle"></i>Erro ao carregar dados. Verifique sua conexão.</div>';
    document.getElementById('forecast30-container').innerHTML = '<div class="clima-loading" style="color:var(--red)"><i class="fas fa-exclamation-triangle"></i>Erro ao carregar dados.</div>';
  }
}

function getWeatherIcon(code) {
  if (code === 0) return { icon: '☀️', cls: '', label: 'Céu limpo' };
  if (code <= 3) return { icon: '⛅', cls: '', label: 'Parcialmente nublado' };
  if (code <= 49) return { icon: '🌫️', cls: '', label: 'Névoa/Neblina' };
  if (code <= 67) return { icon: '🌧️', cls: '', label: 'Chuva' };
  if (code <= 77) return { icon: '❄️', cls: '', label: 'Neve/Granizo' };
  if (code <= 82) return { icon: '🌦️', cls: '', label: 'Pancadas de chuva' };
  if (code <= 99) return { icon: '⛈️', cls: '', label: 'Tempestade' };
  return { icon: '🌡️', cls: '', label: 'Variável' };
}

const DIAS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DIAS_PT[d.getDay()]} ${d.getDate()}/${MESES_PT[d.getMonth()]}`;
}

function isToday(dateStr) {
  const today = new Date();
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

function renderPrevisao5(data, nomeCidade) {
  const { time, temperature_2m_max, temperature_2m_min, precipitation_sum, weathercode } = data.daily;
  const dias = time.slice(0, 7);
  const tempAtual = (data.current_weather && data.current_weather.temperature !== undefined) ? Math.round(data.current_weather.temperature) : null;
  
  let html = `<div class="card"><div class="card-title"><i class="fas fa-sun"></i> Previsão — ${escapeHtml(nomeCidade)}</div><div class="forecast-grid">`;
  
  dias.forEach((dt, i) => {
    const w = getWeatherIcon(weathercode[i]);
    const hoje = isToday(dt);
    const chuva = (precipitation_sum[i] || 0).toFixed(1);
    const tempatualHtml = (hoje && tempAtual !== null)
      ? `<div style="margin-top:6px;padding:4px 8px;background:linear-gradient(135deg,#1B5E20,#388E3C);border-radius:6px;color:white;font-size:11px;font-weight:800;letter-spacing:0.3px;"><i class="fas fa-thermometer-half" style="margin-right:3px;font-size:9px;"></i>AGORA: ${tempAtual}°C</div>` 
      : '';
      
    html += `<div class="forecast-card ${hoje ? 'today' : ''}">
      <div class="forecast-day">${hoje ? '📍 HOJE' : formatDate(dt)}</div>
      <div class="forecast-icon">${w.icon}</div>
      <div class="forecast-cond">${w.label}</div>
      <div class="forecast-temps">
        <span class="temp-max">${Math.round(temperature_2m_max[i])}°</span>
        <span style="color:var(--text-3); font-size:13px; align-self:center;">/</span>
        <span class="temp-min">${Math.round(temperature_2m_min[i])}°</span>
      </div>
      <div class="forecast-rain"><i class="fas fa-tint" style="margin-right:3px"></i>${chuva} mm</div>
      ${tempatualHtml}
    </div>`;
  });
  
  html += '</div></div>';
  document.getElementById('forecast5-container').innerHTML = html;
}

function renderTendencia30(data, nomeCidade) {
  const { time, temperature_2m_max, temperature_2m_min, precipitation_sum, weathercode } = data.daily;
  
  let html = `<div class="card">
    <div class="card-title"><i class="fas fa-calendar-alt"></i> Tendência — ${escapeHtml(nomeCidade)} (próximos ${time.length} dias)</div>
    <p style="font-size:11px; color:var(--text-3); margin-bottom:14px; line-height:1.6;"> Previsão estendida disponível via Open-Meteo. Dados acima de 7 dias são estimativas de modelos climatológicos. </p>
    <div class="tendencia-grid">`;
    
  time.forEach((dt, i) => {
    const w = getWeatherIcon(weathercode[i]);
    const d = new Date(dt + 'T12:00:00');
    const chuva = (precipitation_sum[i] || 0).toFixed(0);
    html += `<div class="tend-day">
      <div class="tend-day-num">${d.getDate()}/${d.getMonth()+1}</div>
      <div class="tend-day-icon">${w.icon}</div>
      <div class="tend-day-rain">${chuva}mm</div>
    </div>`;
  });
  
  html += `</div>`;
  
  const maxAlta = Math.max(...temperature_2m_max);
  const maxBaixa = Math.min(...temperature_2m_min);
  const totalChuva = precipitation_sum.reduce((a, b) => a + (b || 0), 0);
  const diasChuva = precipitation_sum.filter(p => p > 1).length;
  
  html += `
    <div class="calc-res-container" style="margin-top:14px;">
      <div class="res-box"><span>Temp. Máx. prevista</span><b style="color:var(--red)">${Math.round(maxAlta)}°C</b></div>
      <div class="res-box"><span>Temp. Mín. prevista</span><b style="color:var(--blue)">${Math.round(maxBaixa)}°C</b></div>
      <div class="res-box"><span>Chuva total prevista</span><b style="color:var(--blue)">${totalChuva.toFixed(0)} mm</b></div>
      <div class="res-box"><span>Dias com chuva</span><b>${diasChuva} dias</b></div>
    </div>
  </div>`;
  
  document.getElementById('forecast30-container').innerHTML = html;
}

async function buscarHistorico() {
  const dataIni = document.getElementById('historico-data-ini').value;
  const dataFim = document.getElementById('historico-data-fim').value;
  
  if (!dataIni || !dataFim) { alert('Selecione a Data Inicial e a Data Final para consultar.'); return; }
  if (dataIni > dataFim) { alert('A Data Inicial deve ser anterior ou igual à Data Final.'); return; }
  
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const dFim = new Date(dataFim + 'T12:00:00');
  if (dFim >= hoje) { alert('A Data Final deve ser uma data passada.'); return; }
  
  const cidade = climaAtual;
  const resultEl = document.getElementById('historico-result');
  resultEl.innerHTML = '<div class="clima-loading" style="margin-top:14px"><i class="fas fa-spinner fa-spin"></i>Consultando histórico...</div>';
  
  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${cidade.lat}&longitude=${cidade.lon}&start_date=${dataIni}&end_date=${dataFim}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=America/Sao_Paulo`;
    const r = await fetch(url);
    const d = await r.json();
    
    if (!d.daily || !d.daily.time || d.daily.time.length === 0) {
      resultEl.innerHTML = '<p style="color:var(--red); font-size:12px; margin-top:12px;">Dados não encontrados para este período.</p>';
      return;
    }
    
    const diasChuva = d.daily.time
      .map((dt, i) => ({
        dt,
        tmax: Math.round(d.daily.temperature_2m_max[i]),
        tmin: Math.round(d.daily.temperature_2m_min[i]),
        chuva: d.daily.precipitation_sum[i] || 0,
        wcode: d.daily.weathercode[i]
      }))
      .filter(x => x.chuva > 0);
      
    const totalMm = diasChuva.reduce((acc, x) => acc + x.chuva, 0);
    const totalDias = d.daily.time.length;
    const dIniObj = new Date(dataIni + 'T12:00:00');
    const dFimObj = new Date(dataFim + 'T12:00:00');
    const fmtDate = d2 => `${d2.getDate().toString().padStart(2,'0')}/${(d2.getMonth()+1).toString().padStart(2,'0')}/${d2.getFullYear()}`;
    
    let html = `
      <div style="margin-top:16px; padding:14px; background:var(--blue-bg); border-radius:var(--radius-md); border:1px solid #90CAF9;">
        <div style="font-size:10px; font-weight:700; color:#0D47A1; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">
          <i class="fas fa-map-marker-alt" style="margin-right:4px"></i>
          ${escapeHtml(cidade.nome)} · ${fmtDate(dIniObj)} a ${fmtDate(dFimObj)}
        </div>
        <div class="calc-res-container" style="margin-top:0;">
          <div class="res-box" style="background:var(--blue-bg); border-color:#90CAF9;">
            <span style="color:#0D47A1;">Dias consultados</span>
            <b style="color:var(--blue)">${totalDias}</b>
          </div>
          <div class="res-box" style="background:var(--blue-bg); border-color:#90CAF9;">
            <span style="color:#0D47A1;">Dias com chuva</span>
            <b style="color:var(--blue)">${diasChuva.length}</b>
          </div>
          <div class="res-box" style="background:linear-gradient(135deg,#1B5E20,#388E3C); border-color:var(--green-700);">
            <span style="color:rgba(255,255,255,0.8);">Total acumulado</span>
            <b style="color:white; font-size:20px;">${totalMm.toFixed(1)} mm</b>
          </div>
        </div>
      </div>`;
      
    if (diasChuva.length === 0) {
      html += `<div class="insight-item ok" style="margin-top:12px; border-radius:var(--radius-sm);">
        <i class="fas fa-check-circle"></i><span>Nenhum dia com precipitação registrada no período selecionado.</span>
      </div>`;
    } else {
      html += `<div style="margin-top:14px;">
        <div style="font-size:10px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">
          <i class="fas fa-tint" style="color:var(--blue); margin-right:4px;"></i> Dias com ocorrência de chuva
        </div>`;
      diasChuva.forEach(x => {
        const w = getWeatherIcon(x.wcode);
        const d2 = new Date(x.dt + 'T12:00:00');
        const dtFmt = `${DIAS_PT[d2.getDay()]}, ${fmtDate(d2)}`;
        html += `
          <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; margin-bottom:6px; background:var(--surface2); border-radius:var(--radius-sm); border:1px solid var(--border);">
            <div style="font-size:22px; flex-shrink:0;">${w.icon}</div>
            <div style="flex:1;">
              <div style="font-size:11px; font-weight:700; color:var(--text);">${dtFmt}</div>
              <div style="font-size:10px; color:var(--text-3); margin-top:2px;">${w.label}</div>
            </div>
            <div style="text-align:right; flex-shrink:0;">
              <div style="font-size:13px; font-weight:800; color:var(--blue);">${x.chuva.toFixed(1)} mm</div>
              <div style="font-size:10px; color:var(--text-3);">${x.tmin}° / ${x.tmax}°C</div>
            </div>
          </div>`;
      });
      html += `</div>`;
    }
    html += `<p style="font-size:10px; color:var(--text-3); margin-top:10px;">* Dados históricos fornecidos pela Open-Meteo Historical Weather API.</p>`;
    resultEl.innerHTML = html;
  } catch (err) {
    resultEl.innerHTML = '<p style="color:var(--red); font-size:12px; margin-top:12px;"><i class="fas fa-exclamation-triangle"></i> Erro ao consultar histórico. Verifique sua conexão.</p>';
  }
}

const CIDADES_COMPARATIVO = [
  { nome: 'Passos',     lat: -20.72, lon: -46.61, estado: 'MG', cor: '#1B5E20', corBg: '#E8F5E9' },
  { nome: 'Mococa',     lat: -21.47, lon: -47.01, estado: 'SP', cor: '#1565C0', corBg: '#E3F2FD' },
  { nome: 'Descalvado', lat: -21.90, lon: -47.62, estado: 'SP', cor: '#6A1B9A', corBg: '#F3E5F5' },
  { nome: 'Iacanga',    lat: -21.88, lon: -49.03, estado: 'SP', cor: '#E65100', corBg: '#FFF3E0' }
];

async function buscarComparativoCidades() {
  const dataIni = document.getElementById('historico-data-ini').value;
  const dataFim = document.getElementById('historico-data-fim').value;
  
  if (!dataIni || !dataFim) { alert('Defina a Data Inicial e a Data Final no filtro de Histórico acima antes de comparar.'); return; }
  if (dataIni > dataFim) { alert('A Data Inicial deve ser anterior ou igual à Data Final.'); return; }
  
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const dFim = new Date(dataFim + 'T12:00:00');
  if (dFim >= hoje) { alert('A Data Final deve ser uma data passada.'); return; }
  
  const resultEl = document.getElementById('comparativo-cidades-result');
  resultEl.innerHTML = '<div class="clima-loading" style="margin-top:14px"><i class="fas fa-spinner fa-spin"></i>Consultando dados das 4 cidades...</div>';
  
  const fmtDate = d2 => `${d2.getDate().toString().padStart(2,'0')}/${(d2.getMonth()+1).toString().padStart(2,'0')}/${d2.getFullYear()}`;
  const dIniObj = new Date(dataIni + 'T12:00:00');
  const dFimObj = new Date(dataFim + 'T12:00:00');
  
  try {
    const resultados = await Promise.all(CIDADES_COMPARATIVO.map(async cidade => {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${cidade.lat}&longitude=${cidade.lon}&start_date=${dataIni}&end_date=${dataFim}&daily=precipitation_sum&timezone=America/Sao_Paulo`;
      const r = await fetch(url);
      const d = await r.json();
      const precipArr = (d.daily && d.daily.precipitation_sum) ? d.daily.precipitation_sum : [];
      const total = precipArr.reduce((acc, v) => acc + (v || 0), 0);
      const diasChuva = precipArr.filter(v => v > 0).length;
      const totalDias = precipArr.length;
      return { ...cidade, total, diasChuva, totalDias };
    }));
    
    const ordenados = [...resultados].sort((a, b) => b.total - a.total);
    const maxTotal = ordenados[0].total || 1;
    
    let html = `
      <div style="margin-top:16px; padding:12px 14px; background:var(--surface2); border-radius:var(--radius-md); border:1px solid var(--border); margin-bottom:14px;">
        <div style="font-size:10px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.5px;">
          <i class="fas fa-calendar-alt" style="margin-right:4px; color:var(--blue);"></i>
          Período: ${fmtDate(dIniObj)} a ${fmtDate(dFimObj)}
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin-bottom:14px;">`;
      
    resultados.forEach((c, i) => {
      const rank = ordenados.findIndex(x => x.nome === c.nome) + 1;
      const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      html += `
        <div style="background:${c.corBg}; border:1.5px solid ${c.cor}30; border-radius:var(--radius-md); padding:14px 12px; text-align:center; position:relative;">
          <div style="position:absolute; top:8px; right:10px; font-size:14px;">${rankIcon}</div>
          <div style="font-size:11px; font-weight:800; color:${c.cor}; margin-bottom:2px;">${c.nome}</div>
          <div style="font-size:9px; font-weight:600; color:var(--text-3); margin-bottom:10px;">${c.estado}</div>
          <div style="font-size:22px; font-weight:800; color:${c.cor}; line-height:1;">${c.total.toFixed(1)}</div>
          <div style="font-size:10px; font-weight:700; color:var(--text-3); margin-bottom:8px;">mm acumulados</div>
          <div style="font-size:9px; color:var(--text-3);">${c.diasChuva} dias com chuva</div>
          <div style="margin-top:8px; height:6px; background:${c.cor}20; border-radius:99px; overflow:hidden;">
            <div style="height:100%; width:${Math.round((c.total/maxTotal)*100)}%; background:${c.cor}; border-radius:99px; transition:width 0.8s;"></div>
          </div>
        </div>`;
    });
    
    html += `</div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px 10px; background:var(--surface2); border-bottom:2px solid var(--border); color:var(--text-3); font-size:9px; text-transform:uppercase; letter-spacing:0.5px;">Cidade</th>
              <th style="text-align:right; padding:8px 10px; background:var(--surface2); border-bottom:2px solid var(--border); color:var(--text-3); font-size:9px; text-transform:uppercase; letter-spacing:0.5px;">Total mm</th>
              <th style="text-align:right; padding:8px 10px; background:var(--surface2); border-bottom:2px solid var(--border); color:var(--text-3); font-size:9px; text-transform:uppercase; letter-spacing:0.5px;">Dias c/ chuva</th>
              <th style="text-align:right; padding:8px 10px; background:var(--surface2); border-bottom:2px solid var(--border); color:var(--text-3); font-size:9px; text-transform:uppercase; letter-spacing:0.5px;">Ranking</th>
            </tr>
          </thead>
          <tbody>`;
          
    ordenados.forEach((c, i) => {
      const rank = i + 1;
      const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      html += `
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:9px 10px; font-weight:700; color:${c.cor};">${c.nome}, ${c.estado}</td>
          <td style="padding:9px 10px; text-align:right; font-weight:800; color:${c.cor};">${c.total.toFixed(1)} mm</td>
          <td style="padding:9px 10px; text-align:right; color:var(--text-2);">${c.diasChuva} / ${c.totalDias}</td>
          <td style="padding:9px 10px; text-align:right; font-size:14px;">${rankIcon}</td>
        </tr>`;
    });
    
    html += `
          </tbody>
        </table>
      </div>
      <p style="font-size:10px; color:var(--text-3); margin-top:10px;">* Dados fornecidos pela Open-Meteo Historical Weather API.</p>`;
      
    resultEl.innerHTML = html;
  } catch (err) {
    resultEl.innerHTML = '<p style="color:var(--red); font-size:12px; margin-top:12px;"><i class="fas fa-exclamation-triangle"></i> Erro ao consultar dados das cidades. Verifique sua conexão.</p>';
  }
}

/* ══════════════════════════════════════════════
CADERNO DE MAPAS
══════════════════════════════════════════════ */
const MAPAS_PDFS = {
  fornecedor_25_26: { label: "Caderno de Mapas de Fornecedores 25'26", arquivo: 'CADERNO_DE_MAPA_FORNACEDOR_25_26.pdf' },
  proprio_25_26: { label: "Caderno de Mapas Próprio 25'26", arquivo: 'CADERNO_MAPA_25_26_PROPRIO.pdf' },
  proprio_26_27: { label: "Caderno de Mapas Próprio 26'27", arquivo: 'CADERNO_MAPA_26_27_PROPRIO.pdf' },
  fornecedor_26_27: { label: "Caderno de Mapas Fornecedor 26'27", arquivo: 'CADERNO_MAPA_FORNECEDOR_26_27.pdf' }
};

let mapaAtivo = null;

function isMobileOuIOS() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  const isMobileWidth = window.innerWidth <= 768;
  return isIOS || isAndroid || isMobileWidth;
}

function trocarMapaPDF(chave, btnEl) {
  document.querySelectorAll('.mapas-sub-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  
  const mapa = MAPAS_PDFS[chave];
  if (!mapa) return;
  
  mapaAtivo = chave;
  document.getElementById('mapas-titulo-pdf').textContent = mapa.label;
  
  const iframe      = document.getElementById('mapas-iframe');
  const placeholder = document.getElementById('mapas-placeholder');
  const mobileOpen  = document.getElementById('mapas-mobile-open');
  
  iframe.style.display      = 'none';
  placeholder.style.display = 'none';
  mobileOpen.style.display  = 'none';
  iframe.src = '';
  
  if (!mapa.arquivo) {
    placeholder.style.display = 'flex';
    placeholder.innerHTML = `<i class="fas fa-clock" style="font-size:36px; color:var(--amber);"></i> <p style="color:var(--amber); font-weight:700;">${escapeHtml(mapa.label)}</p> <p style="font-size:11px;">Este caderno ainda não foi carregado. Adicione o PDF correspondente na pasta do projeto para ativá-lo.</p>`;
    return;
  }
  
  if (isMobileOuIOS()) {
    document.getElementById('mob-nome-pdf').textContent = mapa.label;
    document.getElementById('btn-abrir-pdf-mobile').href = mapa.arquivo;
    mobileOpen.style.display = 'flex';
  } else {
    iframe.src = mapa.arquivo + '#toolbar=1&navpanes=1&scrollbar=1';
    iframe.style.display = 'block';
  }
}

/* ══════════════════════════════════════════════
#1 — PERSISTÊNCIA AUTOMÁTICA (localStorage)
══════════════════════════════════════════════ */
const STORAGE_KEY_REAL    = 'ctt_frentes_real';
const STORAGE_KEY_META    = 'ctt_meta';
const STORAGE_KEY_DIESEL  = 'ctt_diesel';
const STORAGE_KEY_DARK    = 'ctt_darkmode';

function salvarEstadoReal() {
  try {
    localStorage.setItem(STORAGE_KEY_REAL,   JSON.stringify(frentes));
    localStorage.setItem(STORAGE_KEY_META,   document.getElementById('meta_val').value);
    localStorage.setItem(STORAGE_KEY_DIESEL, document.getElementById('diesel_val').value);
  } catch(e) {}
}

function restaurarEstadoReal() {
  try {
    const f = localStorage.getItem(STORAGE_KEY_REAL);
    const m = localStorage.getItem(STORAGE_KEY_META);
    const d = localStorage.getItem(STORAGE_KEY_DIESEL);
    if (f) frentes = JSON.parse(f);
    if (m) document.getElementById('meta_val').value = m;
    if (d) document.getElementById('diesel_val').value = d;
  } catch(e) {}
}

const _editDataOrig = editData;
editData = function(id, field, val) {
  _editDataOrig(id, field, val);
  if (!modoSimulacao) salvarEstadoReal();
};

/* ══════════════════════════════════════════════
#2 — ATUALIZAR GATEC (botão manual)
══════════════════════════════════════════════ */
async function atualizarGATEC() {
  const btn = document.getElementById('btn-atualizar-gatec');
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
    btn.disabled = true;
  }
  await carregarDadosGATEC();
  if (btn) {
    btn.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar dados';
    btn.disabled = false;
  }
  showToast('✅ Liberações atualizadas com sucesso!');
}

/* ══════════════════════════════════════════════
#3 — DATA E HORA EM TEMPO REAL NO HEADER
══════════════════════════════════════════════ */
const DIAS_SEMANA_FULL = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function atualizarRelogio() {
  const el = document.getElementById('header-datetime');
  if (!el) return;
  
  const now = new Date();
  const dia  = DIAS_SEMANA_FULL[now.getDay()];
  const d    = now.getDate().toString().padStart(2,'0');
  const mes  = MESES_FULL[now.getMonth()];
  const ano  = now.getFullYear();
  const hh   = now.getHours().toString().padStart(2,'0');
  const mm   = now.getMinutes().toString().padStart(2,'0');
  
  el.textContent = `${dia}, ${d} de ${mes} de ${ano} · ${hh}:${mm}`;
  atualizarJornada();
}

/* ══════════════════════════════════════════════
#4 — JORNADA DO DIA
══════════════════════════════════════════════ */
function atualizarJornada() {
  const totalHoras = frentes.length > 0
    ? Math.round(frentes.reduce((s, f) => s + (f.horas || 12), 0) / frentes.length)
    : 12;
    
  const now   = new Date();
  const horaAtual = now.getHours() + now.getMinutes() / 60;
  
  const inicioTurno = 6;
  const fimTurno    = inicioTurno + totalHoras;
  const horasTrab   = Math.max(0, Math.min(horaAtual - inicioTurno, totalHoras));
  const pct         = Math.min((horasTrab / totalHoras) * 100, 100);
  
  const fmt = h => {
    const hh = Math.floor(h).toString().padStart(2,'0');
    const mm = Math.round((h % 1) * 60).toString().padStart(2,'0');
    return `${hh}:${mm}`;
  };
  
  document.getElementById('jornada-bar').style.width = pct.toFixed(1) + '%';
  document.getElementById('jornada-horas-label').textContent = `${horasTrab.toFixed(1).replace('.',',')} h de ${totalHoras} h`;
  document.getElementById('jornada-inicio').textContent  = `Início: ${fmt(inicioTurno)}`;
  document.getElementById('jornada-fim').textContent     = `Fim: ${fmt(fimTurno)}`;
  
  let turnoLabel = '';
  if (horaAtual < inicioTurno)       turnoLabel = '⏳ Antes do turno';
  else if (horaAtual >= fimTurno)    turnoLabel = '✅ Turno encerrado';
  else if (pct < 50)                 turnoLabel = '🟢 Em andamento';
  else if (pct < 85)                 turnoLabel = '🟡 Mais da metade';
  else                               turnoLabel = '🔴 Reta final';
  
  document.getElementById('jornada-turno-label').textContent = turnoLabel;
}

/* ══════════════════════════════════════════════
#5 — COPIAR RESUMO PARA WHATSAPP
══════════════════════════════════════════════ */
function copiarResumoOperacional() {
  const prDiesel = parseFloat(document.getElementById('diesel_val').value) || 0;
  const metaG    = parseFloat(document.getElementById('meta_val').value) || 0;
  const now      = new Date();
  const dataHora = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  
  let tTon = 0, tCusto = 0;
  const linhasFrente = frentes.map(f => {
    const rend  = (f.vel * f.larg * (f.efc / 100)) / 10;
    const tonD  = rend * f.tch * f.horas * f.maquinas;
    const cD    = f.diesel * prDiesel * f.horas * f.maquinas;
    const cTon  = tonD > 0 ? (cD / tonD).toFixed(2) : '0.00';
    tTon  += tonD;
    tCusto += cD;
    return `• ${f.nome}: *${formatarNumeroCurto(tonD)} t/dia* | R$${cTon}/t`;
  }).join('\n');
  
  const pct = metaG > 0 ? ((tTon / metaG) * 100).toFixed(1) : '—';
  const modo = modoSimulacao ? '📊 SIMULAÇÃO' : '✅ REAL';
  
  const texto = `🌾 *CONTROLE TÉCNICO AGRÍCOLA*\n📅 ${dataHora} | Modo: ${modo}\n${'─'.repeat(32)}\n🚜 *FRENTES DE COLHEITA*\n${linhasFrente}\n${'─'.repeat(32)}\n📦 *Produção Total:* ${formatarNumeroCurto(tTon)} t/dia\n⛽ *Custo Diesel:* R$ ${formatarNumeroCurto(tCusto)}/dia\n🎯 *Meta (${formatarNumeroCurto(metaG)} t):* ${pct}%\n${'─'.repeat(32)}\n_Gerado pelo CTT Controle Agrícola_`;
  
  navigator.clipboard.writeText(texto)
    .then(() => showToast('✅ Resumo copiado! Cole no WhatsApp.'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ Resumo copiado! Cole no WhatsApp.');
    });
}

/* ══════════════════════════════════════════════
#7 — TOAST / CONFIRMAÇÃO VISUAL
══════════════════════════════════════════════ */
function showToast(msg, tipo = 'success', duracao = 2800) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const t = document.createElement('div');
  t.className = 'toast' + (tipo === 'error' ? ' error' : tipo === 'info' ? ' info' : '');
  t.innerHTML = msg;
  container.appendChild(t);
  
  setTimeout(() => {
    t.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => t.remove(), 320);
  }, duracao);
}

const _confirmarSalvarOrig = confirmarSalvar;
confirmarSalvar = function() {
  const nome = document.getElementById('modal-cenario-nome').value.trim();
  if (!nome) { alert('Digite um nome para o cenário.'); return; }
  _confirmarSalvarOrig();
  showToast(`💾 Cenário "${nome}" salvo com sucesso!`);
};

/* ══════════════════════════════════════════════
#8 — MODO ESCURO
══════════════════════════════════════════════ */
function toggleDarkMode() {
  const body = document.body;
  const icon = document.getElementById('dark-mode-icon');
  const isDark = body.classList.toggle('dark-mode');
  icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  try { localStorage.setItem(STORAGE_KEY_DARK, isDark ? '1' : '0'); } catch(e) {}
  showToast(isDark ? '🌙 Modo escuro ativado' : '☀️ Modo claro ativado', 'info', 2000);
}

function restaurarDarkMode() {
  try {
    const pref = localStorage.getItem(STORAGE_KEY_DARK);
    if (pref === '1') {
      document.body.classList.add('dark-mode');
      const icon = document.getElementById('dark-mode-icon');
      if (icon) icon.className = 'fas fa-sun';
    }
  } catch(e) {}
}

/* ══════════════════════════════════════════════
#9 — ATALHOS DE TECLADO (desktop)
══════════════════════════════════════════════ */
document.addEventListener('keydown', function(e) {
  if (e.altKey && !e.ctrlKey && !e.shiftKey) {
    const mapa = { '1':'simulador', '2':'liberacoes', '3':'clima_aba', '4':'calc_aba', '5':'mapas_aba' };
    if (mapa[e.key]) {
      e.preventDefault();
      const btn = document.querySelectorAll('.tab-btn')[parseInt(e.key)-1];
      showTab({ currentTarget: btn }, mapa[e.key]);
      if (btn) { document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
      showToast(`⌨️ Aba ${e.key} — ${mapa[e.key].replace('_aba','').replace('clima','Clima & Agro').replace('calc','Calculadora').replace('mapas','Mapas').replace('liberacoes','Liberações').replace('simulador','Simulador')}`, 'info', 1800);
    }
  }
});

/* ══════════════════════════════════════════════
#10 — INDICADOR DE CONEXÃO OFFLINE
══════════════════════════════════════════════ */
function atualizarStatusConexao() {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;
  
  if (!navigator.onLine) {
    banner.classList.add('visible');
    document.body.classList.add('has-offline-banner');
  } else {
    if (banner.classList.contains('visible')) {
      banner.classList.remove('visible');
      document.body.classList.remove('has-offline-banner');
      showToast('📶 Conexão restaurada!', 'success', 2500);
    }
  }
}
window.addEventListener('online',  atualizarStatusConexao);
window.addEventListener('offline', atualizarStatusConexao);

/* ══════════════════════════════════════════════
UTILIDADES
══════════════════════════════════════════════ */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.getElementById('modal-cenario').addEventListener('click', function(e) {
  if (e.target === this) fecharModal();
});

document.getElementById('modal-cenario-nome').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') confirmarSalvar();
});

/* ══════════════════════════════════════════════
MÓDULO 1 — TCH / TAH (Qualidade e Produtividade)
══════════════════════════════════════════════ */
function calcularTCH() {
  const tons  = parseFloat(document.getElementById('tah_tons').value)  || 0;
  const area  = parseFloat(document.getElementById('tah_area').value)  || 0;
  const atr   = parseFloat(document.getElementById('tah_atr').value)   || 0;
  
  if (!tons || !area) {
    document.getElementById('res_tch_container').style.display = 'none';
    document.getElementById('tch_insight').className = 'tch-insight';
    return;
  }
  
  const tch = tons / area;
  const tah = atr > 0 ? (tch * atr) / 1000 : 0;
  const acucarTotal = atr > 0 ? (tons * atr) / 1000 : 0;
  
  document.getElementById('res_tch_val').innerText    = formatarNumeroCurto(tch) + ' t/ha';
  document.getElementById('res_tah_val').innerText    = formatarNumeroCurto(tah) + ' t/ha';
  document.getElementById('res_tah_acucar').innerText = formatarNumeroCurto(acucarTotal) + ' t';
  document.getElementById('res_tch_container').style.display = 'grid';
  
  const insEl = document.getElementById('tch_insight');
  if (tch < 65) {
    insEl.className = 'tch-insight alert-baixo';
    insEl.innerHTML = '⚠️ <strong>Atenção: Produtividade abaixo da média regional (65 t/ha).</strong> Verifique a idade do canavial (possível soca velha), estresse hídrico nas últimas semanas ou falhas no stand de plantas. Considere uma avaliação de reforma do talhão.';
    injetarSabedoriaAlerta(tch);
  } else if (tch < 80) {
    insEl.className = 'tch-insight alert-medio';
    insEl.innerHTML = '🟡 <strong>Produtividade dentro da faixa intermediária (65–80 t/ha).</strong> Há espaço para melhoria. Avalie a possibilidade de adubação complementar de cobertura e o ajuste das condições de colheita (velocidade da colhedora vs perdas visíveis).';
  } else {
    insEl.className = 'tch-insight alert-bom';
    insEl.innerHTML = '✅ <strong>Excelente produtividade (acima de 80 t/ha)!</strong> A frente está operando com alta eficiência. Mantenha o padrão de manejo, monitorando a qualidade da soqueira no pós-colheita para sustentar os resultados nos próximos cortes.';
  } 
}

/* ══════════════════════════════════════════════
MÓDULO 2 — SABEDORIA DE CAMPO
══════════════════════════════════════════════ */
const BANCO_SABEDORIAS = [
  { tag: '🍬 ATR & Maturação', texto: 'O ATR (Açúcar Total Recuperável) ideal para colheita está acima de 130 kg/t. Iniciar o corte com ATR abaixo de 120 kg/t pode gerar descontos contratuais e reduzir a receita em até R$ 8/t.' },
  { tag: '🌡️ Amplitude Térmica', texto: 'Noites frescas (abaixo de 20°C) combinadas com dias secos aceleram o acúmulo de sacarose. Variedades tardias podem elevar o ATR em até 15% nessas condições — priorize esses talhões na programação de corte.' },
  { tag: '📊 Graus-Dia', texto: 'O modelo de Graus-Dia (base 18°C) estima o estágio de maturação sem laboratório. Acúmulos entre 1.200 e 1.800 GDA indicam maturação ativa — momento ideal para programar a colheita prioritária.' },
  { tag: '🔬 Brix de Campo', texto: 'O Brix medido com refratômetro portátil deve ser acima de 18° para confirmar maturação. Amostras abaixo de 16° Brix indicam colheita prematura, reduzindo a eficiência industrial e o pagamento por qualidade.' },
  { tag: '🧪 Aplicação de Maturadores', texto: 'Maturadores como etefom e sulfometuron-metil podem elevar o ATR em 8–15 kg/t em variedades intermediárias. Aplique 45–60 dias antes da colheita com temperatura acima de 20°C e sem chuva prevista por 24h.' },
  { tag: '📅 Janela de Colheita', texto: 'Cada variedade tem uma janela ideal de colheita de 45 a 90 dias. Coletar fora dessa janela — precoce ou tardiamente — reduz o ATR e pode iniciar a inversão de sacarose em glicose e frutose.' },
  { tag: '⚗️ Pureza do Caldo', texto: 'A pureza do caldo (relação Pol/Brix) deve ficar acima de 85% para eficiência industrial máxima. Valores abaixo indicam contaminação por impurezas ou maturação inadequada, impactando diretamente o rendimento da usina.' },
  { tag: '🌾 Pol da Cana', texto: 'A Pol (teor de sacarose aparente) é o principal indicador de pagamento. Variedades bem manejadas atingem Pol acima de 15%, enquanto talhões com estresse hídrico ou soqueiras velhas ficam abaixo de 12%.' },
  { tag: '🍬 Inversão de Sacarose', texto: 'Acima de 1.800 GDA ou após florescimento, a sacarose começa a se inverter em açúcares redutores. Priorize a colheita imediata dos talhões nessa fase para evitar perdas irreversíveis de qualidade.' },
  { tag: '📐 Amostragem de Maturidade', texto: 'Realize amostragem de maturidade em pelo menos 5% dos talhões a cada 15 dias durante a safra. Amostras do terço médio do colmo são as mais representativas para determinar o ponto ótimo de colheita.' }
];

let SABEDORIAS        = [];
let sabedoriaAtual    = 0;
let sabedoriaTimer    = null;
let sabedoriaAlertaAtivo = false;

function sortearSabedorias(n) {
  const copia = [...BANCO_SABEDORIAS];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, n).map(s => ({ ...s, alert: null }));
}

function injetarSabedoriaAlerta(tch) {
  if (tch > 0 && tch < 65 && !sabedoriaAlertaAtivo) {
    SABEDORIAS.unshift({
      tag: '🚨 Alerta de Produtividade',
      alert: `TCH Baixo: ${formatarNumeroCurto(tch)} t/ha`,
      texto: `TCH calculado (${formatarNumeroCurto(tch)} t/ha) abaixo da média regional de 65 t/ha. Causas mais prováveis: (1) soqueira envelhecida com perda de stand, (2) estresse hídrico acumulado nos últimos 60 dias, (3) deficiência de N e K na cobertura. Recomenda-se avaliação agronômica de campo antes do próximo ciclo.`,
    });
    sabedoriaAlertaAtivo = true;
    sabedoriaAtual = 0;
    renderSabedoria(0);
  }
}

function renderSabedoria(idx) {
  const s = SABEDORIAS[idx];
  if (!s) return;
  
  const textoEl   = document.getElementById('sabedoria-texto');
  const badgeWrap = document.getElementById('sabedoria-alert-badge-wrap');
  const dotsEl    = document.getElementById('sabedoria-dots');
  const tagEl     = document.querySelector('#sabedoria-card .sabedoria-tag');
  
  textoEl.classList.add('fadding');
  setTimeout(() => {
    textoEl.textContent = s.texto;
    badgeWrap.innerHTML = s.alert ? `<div class="sabedoria-alert-badge">⚠️ ${s.alert}</div>` : '';
    
    if (tagEl) {
      if (s.alert) {
        tagEl.textContent = '🚨 Alerta de Campo';
        tagEl.style.background = 'rgba(255,80,0,0.35)';
      } else {
        tagEl.textContent = s.tag;
        tagEl.style.background = 'rgba(255,255,255,0.18)';
      }
    }
    
    const total = SABEDORIAS.length;
    dotsEl.innerHTML = Array.from({ length: total }, (_, i) =>
      `<div class="sabedoria-dot${i === idx ? ' active' : ''}"></div>`
    ).join('');
    
    textoEl.classList.remove('fadding');
  }, 340);
}

function proximaSabedoria() {
  sabedoriaAtual++;
  if (sabedoriaAtual >= SABEDORIAS.length) {
    const alertas = SABEDORIAS.filter(s => s.alert !== null);
    SABEDORIAS = [...alertas, ...sortearSabedorias(5)];
    sabedoriaAtual = 0;
  }
  renderSabedoria(sabedoriaAtual);
  clearInterval(sabedoriaTimer);
  sabedoriaTimer = setInterval(proximaSabedoria, 20000);
}

function iniciarSabedoria() {
  SABEDORIAS = sortearSabedorias(5);
  renderSabedoria(0);
  sabedoriaTimer = setInterval(proximaSabedoria, 20000);
}

/* ══════════════════════════════════════════════
MÓDULO 3 — GDA (NASA POWER API)
══════════════════════════════════════════════ */
function sincronizarCidadeGDA() {
  const cidade = getCidadeAtual();
  if (!cidade) return;
  document.getElementById('gda-lat').value = cidade.lat.toFixed(4);
  document.getElementById('gda-lon').value = cidade.lon.toFixed(4);
  showToast(`📍 Coordenadas atualizadas para ${cidade.nome}`, 'success', 2500);
}

async function buscarGDA() {
  const lat = parseFloat(document.getElementById('gda-lat').value) || -20.7222;
  const lon = parseFloat(document.getElementById('gda-lon').value) || -46.6111;
  const numDias = parseInt(document.getElementById('gda-dias').value) || 120;
  
  const badge    = document.getElementById('gda-status-badge');
  const container = document.getElementById('gda-result-container');
  
  badge.className = 'gda-status-badge carregando';
  badge.textContent = '⏳ Buscando NASA...';
  container.innerHTML = '<div class="eta-loading"><i class="fas fa-satellite-dish fa-spin"></i>Consultando NASA POWER API...</div>';
  
  try {
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - numDias);
    
    const fmtData = d => {
      const yyyy = d.getFullYear();
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      return `${yyyy}${mm}${dd}`;
    };
    
    const startStr = fmtData(inicio);
    const endStr   = fmtData(new Date(hoje.getTime() - 86400000));
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,ALLSKY_SFC_SW_DWN&community=AG&longitude=${lon}&latitude=${lat}&start=${startStr}&end=${endStr}&format=JSON`;
    
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    
    const tmax = data.properties.parameter.T2M_MAX;
    const tmin = data.properties.parameter.T2M_MIN;
    const rad  = data.properties.parameter.ALLSKY_SFC_SW_DWN;
    const BASE_TEMP = 18;
    
    let gdaTotal = 0;
    let diasValidos = 0;
    let tempMedia = 0;
    let radMedia = 0;
    
    const datas = Object.keys(tmax).sort();
    const nDias = datas.length;
    
    datas.forEach(d => {
      const mx = tmax[d], mn = tmin[d], r = rad[d];
      if (mx <= -900 || mn <= -900) return;
      const tmed = (mx + mn) / 2;
      const gd = Math.max(0, tmed - BASE_TEMP);
      gdaTotal  += gd;
      tempMedia += tmed;
      radMedia  += (r > 0 ? r : 0);
      diasValidos++;
    });
    
    if (diasValidos === 0) throw new Error('Sem dados válidos no período.');
    
    tempMedia /= diasValidos;
    radMedia  /= diasValidos;
    
    let faseTexto, faseDescricao;
    if (gdaTotal < 600)  {
      faseTexto = '🌱 Brotação / Perfilhamento';
      faseDescricao = `<strong>Fase inicial (0–600 GDA):</strong> A cana encontra-se em pleno estabelecimento. Os perfilhos primários e secundários estão se formando. É o período mais crítico para garantia do estande.`;
    } else if (gdaTotal < 1000) {
      faseTexto = '📈 Crescimento Vegetativo';
      faseDescricao = `<strong>Fase de crescimento intenso (600–1000 GDA):</strong> A cana entra no pico de elongação dos colmos, podendo acrescentar até 10 cm/dia em condições ideais.`;
    } else if (gdaTotal < 1400) {
      faseTexto = '🔄 Transição / Pré-Maturação';
      faseDescricao = `<strong>Fase de pré-maturação (1000–1400 GDA):</strong> O crescimento vegetativo desacelera e a planta começa a direcionar fotoassimilados para o acúmulo de sacarose nos colmos.`;
    } else if (gdaTotal < 1800) {
      faseTexto = '🍬 Maturação Ativa';
      faseDescricao = `<strong>Fase de maturação ativa (1400–1800 GDA):</strong> A sacarose acumulada nos colmos está no pico ou próxima do pico sazonal.`;
    } else {
      faseTexto = '⏳ Maturação Plena / Sobrematuração';
      faseDescricao = `<strong>⚠️ Sobrematuração (acima de 1800 GDA):</strong> Atenção máxima! Nesta fase pode ocorrer a inversão da sacarose em glicose e frutose, reduzindo drasticamente o ATR.`;
    }
    
    const metaGDA = 1800;
    const pctGDA  = Math.min((gdaTotal / metaGDA) * 100, 100);
    
    badge.className = 'gda-status-badge ok';
    badge.textContent = `✅ ${nDias} de ${numDias} dias`;
    
    container.innerHTML = `
      <div class="gda-big-val">
        <div class="gda-big-num">${formatarNumeroCurto(gdaTotal)}</div>
        <div class="gda-big-unit">Graus-Dia Acumulados (Base 18°C) — últimos ${diasValidos} dias consultados</div>
      </div>
      <div style="margin: 10px 0 4px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
          <span style="font-size:10px; font-weight:700; color:var(--text-2);">Progresso até maturação plena (1800 GDA)</span>
          <span style="font-size:10px; font-weight:800; color:var(--green-900);">${pctGDA.toFixed(1)}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${pctGDA}%; background: linear-gradient(90deg, #43A047, #1B5E20);"></div>
        </div>
        <div class="gda-progress-labels">
          <span>0 GDA</span><span>900</span><span>1400</span><span>1800 GDA</span>
        </div>
      </div>
      <div style="margin:10px 0;">
        <div class="gda-fase-badge" style="display:inline-flex;">${faseTexto}</div>
        <p style="font-size:11px; color:var(--text-3); margin-top:8px; line-height:1.65; text-align:left;">${faseDescricao}</p>
      </div>
      <div class="gda-meta-grid">
        <div class="gda-meta-item">
          <span class="gda-mi-val">${tempMedia.toFixed(1)}°C</span>
          <span class="gda-mi-lbl">Temp. Média</span>
        </div>
        <div class="gda-meta-item">
          <span class="gda-mi-val">${radMedia.toFixed(1)}</span>
          <span class="gda-mi-lbl">Rad. Solar (MJ/m²)</span>
        </div>
      </div>
      <p style="font-size:9px; color:var(--text-3); margin-top:10px; text-align:center;">
        Fonte: NASA POWER API (LARC) · Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)} · Período: ${numDias} dias
      </p>`;
      
    showToast('🛰️ GDA calculado com sucesso via NASA POWER!', 'success', 3000);
  } catch (err) {
    badge.className = 'gda-status-badge erro';
    badge.textContent = '❌ Erro';
    container.innerHTML = `<div class="insight-item warn" style="margin-top:10px;"> <i class="fas fa-exclamation-triangle"></i> <span>Não foi possível acessar a NASA POWER API no momento.<br><small style="opacity:0.7;">Erro: ${err.message}</small></span> </div>`;
    showToast('❌ Erro ao buscar dados da NASA POWER', 'error');
  }
}

/* ══════════════════════════════════════════════
MÓDULO 4 — LOGÍSTICA ETA (OSRM API)
══════════════════════════════════════════════ */
async function calcularETA() {
  const frenteLat = parseFloat(document.getElementById('eta-frente-lat').value);
  const frenteLon = parseFloat(document.getElementById('eta-frente-lon').value);
  const usinaLat  = parseFloat(document.getElementById('eta-usina-lat').value);
  const usinaLon  = parseFloat(document.getElementById('eta-usina-lon').value);
  const qtdCam    = parseInt(document.getElementById('eta-qtd-caminhoes').value)  || 6;
  const capCam    = parseInt(document.getElementById('eta-cap-caminhao').value)   || 35;
  
  if (isNaN(frenteLat) || isNaN(frenteLon) || isNaN(usinaLat) || isNaN(usinaLon)) {
    showToast('⚠️ Insira coordenadas válidas para frente e usina.', 'error');
    return;
  }
  
  const container = document.getElementById('eta-result-container');
  container.innerHTML = '<div class="eta-loading"><i class="fas fa-route fa-spin"></i>Calculando rota via OpenStreetMap (OSRM)...</div>';
  
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${frenteLon},${frenteLat};${usinaLon},${usinaLat}?overview=false&annotations=false`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`OSRM HTTP ${resp.status}`);
    const data = await resp.json();
    
    if (data.code !== 'Ok' || !data.routes || !data.routes[0]) {
      throw new Error('Rota não encontrada pelo OSRM.');
    }
    
    const rota = data.routes[0];
    const distKm   = (rota.distance / 1000).toFixed(1);
    const duracaoS = rota.duration;
    
    const duracaoMin       = Math.round(duracaoS / 60);
    const duracaoH         = Math.floor(duracaoMin / 60);
    const duracaoResto     = duracaoMin % 60;
    const etaLabel         = duracaoH > 0 ? `${duracaoH}h ${duracaoResto}min` : `${duracaoMin} min`;
    const cicloCam_min = duracaoMin * 2 + 15;
    const viagensPorCaminhao24h = Math.floor(1440 / cicloCam_min);
    const capacidadeTotal24h    = viagensPorCaminhao24h * qtdCam * capCam;
    const velocidadeMedia       = duracaoS > 0 ? ((rota.distance / 1000) / (duracaoS / 3600)).toFixed(1) : '—';
    
    container.innerHTML = `
      <div class="eta-result-card">
        <div class="eta-main">
          <div>
            <div class="eta-tempo">${etaLabel}</div>
            <div class="eta-tempo-unit">⏱️ Tempo estimado de viagem (ida)</div>
          </div>
          <div class="eta-dist-badge">
            <div class="eta-dist-val">${distKm} km</div>
            <div class="eta-dist-lbl">Distância Rodoviária</div>
          </div>
        </div>
        <p style="font-size:10px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">📦 Capacidade da Frota (${qtdCam} rodotrens × ${capCam} t)</p>
        <div class="eta-frota-grid">
          <div class="eta-frota-item">
            <span class="ef-val">${cicloCam_min} min</span>
            <span class="ef-lbl">Ciclo/Caminhão</span>
          </div>
          <div class="eta-frota-item">
            <span class="ef-val">${viagensPorCaminhao24h}</span>
            <span class="ef-lbl">Viagens/Cam./Dia</span>
          </div>
          <div class="eta-frota-item">
            <span class="ef-val">${formatarNumeroCurto(capacidadeTotal24h)} t</span>
            <span class="ef-lbl">Capac. Frota/Dia</span>
          </div>
        </div>
        <div style="margin-top:12px; padding:10px 12px; background:var(--green-50); border:1px solid var(--green-100); border-radius:var(--radius-sm);">
          <p style="font-size:11px; color:var(--green-900); font-weight:600; line-height:1.5;">
            🚛 Velocidade média estimada: <strong>${velocidadeMedia} km/h</strong> &nbsp;·&nbsp;
            Ciclo completo (ida + descarga + volta): <strong>${cicloCam_min} min</strong>
          </p>
        </div>
        <p style="font-size:9px; color:var(--text-3); margin-top:8px; text-align:center;">
          Fonte: OSRM (OpenStreetMap Routing Machine) · Rota real em asfalto estimada
        </p>
      </div>`;
      
    showToast(`🗺️ Rota calculada: ${distKm} km — ETA ${etaLabel}`, 'success', 3500);
  } catch (err) {
    container.innerHTML = `<div class="insight-item warn" style="margin-top:10px;"> <i class="fas fa-exclamation-triangle"></i> <span>Não foi possível calcular a rota via OSRM.<br><small style="opacity:0.7;">Erro: ${err.message}</small></span> </div>`;
    showToast('❌ Erro ao calcular rota OSRM', 'error');
  }
}

function atualizarFrotaETA() {
  const container = document.getElementById('eta-result-container');
  if (container && container.querySelector('.eta-result-card')) {
    calcularETA();
  }
}

/* ══════════════════════════════════════════════
INIT
══════════════════════════════════════════════ */
restaurarEstadoReal();
renderFrentes();
update();
carregarDadosGATEC();
atualizarSelectCenarios();

setTimeout(() => {
  if (typeof _garantirSafraCarregada === 'function') {
    _garantirSafraCarregada('26_27');
    _garantirSafraCarregada('25_26');
  }
}, 1500);

restaurarDarkMode();
atualizarRelogio();
setInterval(atualizarRelogio, 30000);

document.getElementById('meta_val').addEventListener('input', () => { if (!modoSimulacao) salvarEstadoReal(); });
document.getElementById('diesel_val').addEventListener('input', () => { if (!modoSimulacao) salvarEstadoReal(); });

const _addFrenteOrig = addFrente;
addFrente = function() { _addFrenteOrig(); if (!modoSimulacao) salvarEstadoReal(); };

const _removeFrenteOrig = removeFrente;
removeFrente = function(id) { _removeFrenteOrig(id); if (!modoSimulacao) salvarEstadoReal(); };

const GATEC_POLL_INTERVAL = 3 * 60 * 1000;
setInterval(async () => {
  if (!navigator.onLine) return;
  await carregarDadosGATEC();
  await carregarDadosConfOS();
}, GATEC_POLL_INTERVAL);

atualizarStatusConexao();

function toggleCard(id) {
  const card = document.getElementById(id);
  if (!card) return;
  card.classList.toggle('open');
}

function toggleTratosCard(headerEl) {
  const card = headerEl.closest('.tratos-card-collapsible');
  if (!card) return;
  card.classList.toggle('open');
}

/* ══════════════════════════════════════════════
SERVICE WORKER — SUPORTE OFFLINE / PWA
══════════════════════════════════════════════ */
(function() {
  const jaInstalado = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || document.referrer.includes('android-app://');
  if (jaInstalado) return;
  
  let deferredPrompt = null;
  const STORAGE_KEY = 'ctt_pwa_banner_dismissed';
  
  function bannerJaDismissed() {
    try {
      const ts = localStorage.getItem(STORAGE_KEY);
      if (!ts) return false;
      return (Date.now() - parseInt(ts)) < 7 * 24 * 60 * 60 * 1000;
    } catch(e) { return false; }
  }
  
  window.pwaInstalar = function() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') pwaOcultarBanner();
      deferredPrompt = null;
    });
  };
  
  window.pwaFecharBanner = function() {
    pwaOcultarBanner();
    try { localStorage.setItem(STORAGE_KEY, Date.now().toString()); } catch(e) {}
  };
  
  function pwaMostrarBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) setTimeout(() => banner.classList.add('visible'), 3000);
  }
  
  function pwaOcultarBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.remove('visible');
  }
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!bannerJaDismissed()) pwaMostrarBanner();
  });
  
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
  if (isIOS && isSafari && !bannerJaDismissed()) {
    window.addEventListener('DOMContentLoaded', () => {
      const btnInstalar = document.getElementById('pwa-btn-instalar');
      const textoSub = document.querySelector('.pwa-banner-text span');
      if (btnInstalar) {
        btnInstalar.innerHTML = '<i class="fas fa-share-square"></i> Como instalar';
        btnInstalar.onclick = () => {
          if (typeof showToast === 'function') showToast('No Safari: toque em Compartilhar → "Adicionar à Tela Inicial"', 'info', 5000);
          pwaFecharBanner();
        };
      }
      if (textoSub) textoSub.textContent = 'Adicione à tela inicial para acesso rápido';
      pwaMostrarBanner();
    });
  }
})();

if ('serviceWorker' in navigator) {
  const SW_CHECK_INTERVAL_MS = 15 * 60 * 1000;
  let atualizacaoEmAndamento = false;
  
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[SW] Registrado com sucesso. Escopo:', reg.scope);
        
        function assumirNovaVersao(worker) {
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              atualizacaoEmAndamento = true;
              showToast('🔄 Nova versão encontrada, atualizando…', 'info', 4000);
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
        
        if (reg.waiting) assumirNovaVersao(reg.waiting);
        if (reg.installing) assumirNovaVersao(reg.installing);
        reg.addEventListener('updatefound', () => assumirNovaVersao(reg.installing));
        
        setInterval(() => reg.update().catch(() => {}), SW_CHECK_INTERVAL_MS);
        
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch(err => console.warn('[SW] Falha no registro:', err));
      
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!atualizacaoEmAndamento) return;
      setTimeout(() => window.location.reload(), 500);
    });
  });
}

iniciarSabedoria();

(function() {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const ontemStr = ontem.toISOString().split('T')[0];
  const inpIni = document.getElementById('historico-data-ini');
  const inpFim = document.getElementById('historico-data-fim');
  if (inpIni) { inpIni.max = ontemStr; inpIni.min = '1940-01-01'; }
  if (inpFim) { inpFim.max = ontemStr; inpFim.min = '1940-01-01'; inpFim.value = ontemStr; }
})();

/* ══════════════════════════════════════════════
MÓDULO TRATOS CULTURAIS
══════════════════════════════════════════════ */
(function() {
  'use strict';
  const URL_TRATOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTIIUGH-g6vlowVBAAkgoPwZd1EPJPJS8PzgOEWyDPito38Ii8qzOHaSh1PioGGMLNbwFJPDMzwsA7/pub?gid=724202507&single=true&output=csv';
  const ALERTA_DOSE_PCT = 10;
  
  window._tratosDados     = null;
  window._tratosFiltrados = null;
  window._tratosCols      = null;
  let   _tratosIniciado   = false;
  
  window.iniciarModuloTratos     = iniciarModuloTratos;
  window.carregarDadosTratos     = carregarDadosTratos;
  window.filtrarTratos           = filtrarTratos;
  window.exportarTratosExcel     = exportarTratosExcel;
  window.gerarRelatorioTratos    = gerarRelatorioTratos;
  window.exportarPDFRelatorioAgrupado = exportarPDFRelatorioAgrupado;
  window.sincronizarTratosSupabase    = sincronizarTratosSupabase;
  
  function _txtOuNull(v) {
    const s = (v == null ? '' : String(v)).trim();
    return s === '' ? null : s;
  }
  
  function _numOuNull(v) {
    const n = parseNum(v);
    return isNaN(n) ? null : n;
  }
  
  function _dataISOOuNull(v) {
    const d = parseData(v);
    if (!d) return null;
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  
  async function _sha256Hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  async function _montarRegistroTratosSupabase(row, cols) {
    const reg = {
      data_aplicacao   : _dataISOOuNull(row[cols.colData]),
      nr_os            : _txtOuNull(row[cols.colOS]),
      cod_produto      : _txtOuNull(row[cols.colCodProd]),
      desc_produto     : _txtOuNull(row[cols.colDescProd]),
      cod_operacao     : _txtOuNull(row[cols.colCodOp]),
      desc_operacao    : _txtOuNull(row[cols.colDescOp]),
      cod_fazenda      : _txtOuNull(row[cols.colCodFazenda]),
      desc_fazenda     : _txtOuNull(row[cols.colFazenda]),
      cod_empresa      : _txtOuNull(row[cols.colCodEmpresa]),
      abv_empresa      : _txtOuNull(row[cols.colAbvEmpresa]),
      nro_lancamento   : _txtOuNull(row[cols.colLancamento]),
      safra            : _txtOuNull(row[cols.colSafra]),
      cod_funcionario  : _txtOuNull(row[cols.colCodFuncionario]),
      nome_funcionario : _txtOuNull(row[cols.colFuncionario]),
      cod_processo     : _txtOuNull(row[cols.colCodProcesso]),
      desc_processo    : _txtOuNull(row[cols.colDescProcesso]),
      cod_subprocesso  : _txtOuNull(row[cols.colCodSubprocesso]),
      desc_subprocesso : _txtOuNull(row[cols.colDescSubprocesso]),
      cod_grupo_op     : _txtOuNull(row[cols.colCodGrupoOp]),
      desc_grupo_op    : _txtOuNull(row[cols.colDescGrupoOp]),
      unidade          : _txtOuNull(row[cols.colUnidade]),
      cod_setor        : _txtOuNull(row[cols.colCodSetor]),
      desc_setor       : _txtOuNull(row[cols.colDescSetor]),
      cod_bloco        : _txtOuNull(row[cols.colCodBloco]),
      desc_bloco       : _txtOuNull(row[cols.colDescBloco]),
      cod_talhao       : _txtOuNull(row[cols.colCodTalhao]),
      municipio        : _txtOuNull(row[cols.colMunicipio]),
      variedade        : _txtOuNull(row[cols.colVariedade]),
      situacao_talhao  : _txtOuNull(row[cols.colSituacaoTalhao]),
      area_aplicada    : _numOuNull(row[cols.colArea]),
      dose_recomendada : _numOuNull(row[cols.colDoseRec]),
      dose_aplicada    : _numOuNull(row[cols.colDoseAplic]),
    };
    const base = Object.keys(reg).sort().map(k => `${k}=${reg[k] ?? ''}`).join('|');
    reg.linha_hash = await _sha256Hex(base);
    return reg;
  }
  
  async function sincronizarTratosSupabase() {
    if (typeof _sbClient === 'undefined') {
      if (typeof showToast === 'function') showToast('⚠️ Cliente Supabase não encontrado.', 'error', 3000);
      return;
    }
    
    const btn = document.getElementById('btn-tratos-sync-supabase');
    if (btn) { btn.disabled = true; btn.dataset.textoOriginal = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando planilha...'; }
    
    try {
      const { dados, cols } = await _tratosCarregarCSVFonte();
      const total = dados.length;
      const registros = [];
      
      for (let i = 0; i < total; i += 1000) {
        const bloco = dados.slice(i, i + 1000);
        const blocoPronto = await Promise.all(bloco.map(row => _montarRegistroTratosSupabase(row, cols)));
        registros.push(...blocoPronto);
        if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Preparando... ${Math.min(i + 1000, total)}/${total}`;
      }
      
      const LOTE = 300;
      let enviados = 0, erros = 0;
      
      for (let i = 0; i < registros.length; i += LOTE) {
        const lote = registros.slice(i, i + LOTE);
        const { error } = await _sbClient.from('tratos_pcp').upsert(lote, { onConflict: 'linha_hash' });
        if (error) { erros++; console.error('[Tratos→Supabase] erro no lote', i, error); }
        enviados += lote.length;
        if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Enviando... ${enviados}/${registros.length}`;
      }
      
      if (erros === 0) {
        if (typeof showToast === 'function') showToast(`✅ Supabase sincronizado: ${registros.length} linhas.`, 'success', 4000);
      } else {
        if (typeof showToast === 'function') showToast(`⚠️ Sincronizado com ${erros} lote(s) com erro — veja o console (F12).`, 'error', 5000);
      }
      
      await carregarDadosTratos();
    } catch (e) {
      console.error('[Tratos→Supabase] erro geral', e);
      if (typeof showToast === 'function') showToast('❌ Erro ao sincronizar com o Supabase — veja o console (F12).', 'error', 5000);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.textoOriginal || '<i class="fas fa-cloud-arrow-up"></i>'; }
    }
  }
  
  function _tratosNiveisDisponiveis() {
    const c = window._tratosCols || {};
    return {
      produto: { key: r => (r[c.colDescProd] || r[c.colCodProd] || '').trim(), label: r => [r[c.colCodProd], r[c.colDescProd]].filter(Boolean).join(' · ') || 'Sem produto' },
      fazenda: { key: r => (r[c.colFazenda] || r[c.colCodFazenda] || '').trim(), label: r => [r[c.colCodFazenda], r[c.colFazenda]].filter(Boolean).join(' · ') || 'Sem fazenda' },
      setor: { key: r => (r[c.colDescSetor] || r[c.colCodSetor] || '').trim(), label: r => (r[c.colDescSetor] || r[c.colCodSetor] || 'Sem setor').trim() },
      talhao: { key: r => (r[c.colCodTalhao] || '').trim(), label: r => (r[c.colCodTalhao] || 'Sem talhão').trim() },
      grupoOp: { key: r => (r[c.colCodGrupoOp] || r[c.colDescGrupoOp] || '').trim(), label: r => [r[c.colCodGrupoOp], r[c.colDescGrupoOp]].filter(Boolean).join(' - ') || 'Sem grupo' },
      subgrupo: { key: r => (r[c.colCodSubprocesso] || r[c.colDescSubprocesso] || '').trim(), label: r => [r[c.colCodSubprocesso], r[c.colDescSubprocesso]].filter(Boolean).join(' - ') || 'Sem subprocesso' },
      operacao: { key: r => (r[c.colDescOp] || r[c.colCodOp] || '').trim(), label: r => [r[c.colCodOp], r[c.colDescOp]].filter(Boolean).join(' · ') || 'Sem operação' },
    };
  }
  
  const TRATOS_RELATORIO_TITULOS = {
    fazenda : 'Aplicação por Fazenda',
    setor   : 'Aplicação por Setor',
    talhao  : 'Aplicação por Talhão',
    produto : 'Aplicação por Produto',
    operacao: 'Aplicação por Operação',
  };
  
  function _tratosNiveisRelatorio(tipo) {
    const filtroProdutoUnico = (window._tratosMultiSel?.produto?.size || 0) === 1;
    switch (tipo) {
      case 'fazenda':  return filtroProdutoUnico ? ['fazenda'] : ['produto', 'fazenda'];
      case 'setor':    return ['setor'];
      case 'talhao':   return ['fazenda', 'talhao'];
      case 'produto':  return ['produto'];
      case 'operacao': return ['subgrupo', 'grupoOp', 'operacao'];
      default:         return null;
    }
  }
  
  function gerarRelatorioTratos(tipo) {
    if (!window._tratosDados || !window._tratosDados.length) {
      if (typeof showToast === 'function') showToast('⚠️ Aguarde os dados carregarem e tente novamente.', 'error', 2500);
      return;
    }
    const niveis = _tratosNiveisRelatorio(tipo);
    if (!niveis) return;
    const dados = window._tratosFiltrados && window._tratosFiltrados.length ? window._tratosFiltrados : window._tratosDados;
    _mostrarResultadoHierarquico(tipo, niveis, dados);
  }
  
  function _tratosFiltrosAtivosTexto() {
    const pares = [['Aplicador', 'tratos-filtro-aplicador'], ['Empresa', 'tratos-filtro-empresa']];
    const ativos = pares.map(([lbl, id]) => {
      const v = selectVal(id);
      return v ? `${lbl}: ${v}` : null;
    }).filter(Boolean);
    
    const selSafra = window._tratosMultiSel?.safra || new Set();
    const selProd  = window._tratosMultiSel?.produto || new Set();
    const selFaz   = window._tratosMultiSel?.fazenda || new Set();
    const selOp    = window._tratosMultiSel?.operacao || new Set();
    const selSub   = window._tratosMultiSel?.subprocesso || new Set();
    const selGrOp  = window._tratosMultiSel?.grupoOp || new Set();
    
    if (selSafra.size) ativos.unshift(`Safra: ${[...selSafra].join(', ')}`);
    if (selProd.size) ativos.unshift(`Produto: ${[...selProd].join(', ')}`);
    if (selFaz.size)  ativos.unshift(`Fazenda: ${[...selFaz].join(', ')}`);
    if (selSub.size)  ativos.push(`Subprocesso: ${[...selSub].join(', ')}`);
    if (selGrOp.size) ativos.push(`Grupo de Operação: ${[...selGrOp].join(', ')}`);
    if (selOp.size)   ativos.push(`Operação: ${[...selOp].join(', ')}`);
    
    const bIni = document.getElementById('tratos-filtro-data-ini')?.value || '';
    const bFim = document.getElementById('tratos-filtro-data-fim')?.value || '';
    if (bIni || bFim) ativos.push('Período: ' + (bIni || '…') + ' a ' + (bFim || '…'));
    
    return ativos.length ? ativos.join(' · ') : 'Sem filtros aplicados — todos os registros';
  }
  
  function _tratosProdutoLinhaHTML(row, mostrarTalhao, contagem) {
    const { colCodProd, colDescProd, colDoseRec, colDoseAplic, colCodTalhao } = window._tratosCols || {};
    const dr = parseNum(row[colDoseRec]);
    const da = parseNum(row[colDoseAplic]);
    let difHtml = '';
    
    if (!isNaN(dr) && dr > 0 && !isNaN(da)) {
      const pct = ((da - dr) / dr) * 100;
      const difStr = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
      const cor = Math.abs(pct) > ALERTA_DOSE_PCT ? 'var(--red)' : 'var(--green-700)';
      difHtml = `<b style="color:${cor}">(${difStr})</b>`;
    }
    
    const produto = [row[colCodProd], row[colDescProd]].filter(Boolean).join(' · ') || 'Produto não identificado';
    const talhaoHtml = (mostrarTalhao && colCodTalhao) ? `<span class="tpl-talhao">Talhão ${esc((row[colCodTalhao] || '—').trim() || '—')}</span>` : '';
    const contagemHtml = (contagem && contagem > 1) ? `<span class="tpl-talhao">× ${contagem} talhões</span>` : '';
    
    return `<div class="tratos-produto-linha">
      <div class="tpl-topo">
        <span class="tpl-produto">${esc(produto)}</span> ${talhaoHtml}${contagemHtml}
      </div>
      <div class="tpl-dose">
        <span class="tpl-dose-item">Recomendada: <b>${esc(row[colDoseRec] || '—')}</b></span>
        <span class="tpl-dose-item">Aplicada: <b>${esc(row[colDoseAplic] || '—')}</b>${difHtml}</span>
      </div>
    </div>`;
  }
  
  function _tratosProdutoLinhasDedup(osRows, mostrarTalhao) {
    const { colCodProd, colDescProd, colDoseRec, colDoseAplic, colCodTalhao } = window._tratosCols || {};
    const grupos = new Map();
    
    osRows.forEach(row => {
      const chave = mostrarTalhao
        ? [row[colCodProd], row[colDescProd], row[colDoseRec], row[colDoseAplic], row[colCodTalhao]].join('§')
        : [row[colCodProd], row[colDescProd], row[colDoseRec], row[colDoseAplic]].join('§');
      if (!grupos.has(chave)) grupos.set(chave, { row, contagem: 0 });
      grupos.get(chave).contagem++;
    });
    
    return [...grupos.values()].map(({ row, contagem }) => _tratosProdutoLinhaHTML(row, mostrarTalhao, contagem)).join('');
  }
  
  function _tratosOSCardHTML(osRows, colOS, colArea, colCodTalhao, mostrarTalhao) {
    const { colData } = window._tratosCols || {};
    const os = (osRows[0][colOS] || '—').trim() || '—';
    const dataLinha = osRows.find(r => (r[colData] || '').trim())?.[colData] || '—';
    const areaMap = _calcAreaOS(osRows, colOS, colArea, colCodTalhao);
    const area = Object.values(areaMap).reduce((s, v) => s + v, 0);
    const linhas = _tratosProdutoLinhasDedup(osRows, mostrarTalhao);
    
    return `<div class="tratos-os-card">
      <div class="toc-topo">
        <span class="toc-os">O.S. ${esc(os)}</span>
        <span class="toc-data">${esc(dataLinha)}</span>
        <span class="toc-area">${formatarNumeroCurto(area)} ha</span>
      </div>
      <div class="toc-produtos">${linhas}</div>
    </div>`;
  }
  
  function _tratosRenderNivel(rows, niveisDefs, niveisChaves, idx, colOS, colArea, colCodTalhao) {
    if (idx >= niveisChaves.length) {
      const mostrarTalhao = niveisChaves.includes('talhao');
      const { colData } = window._tratosCols || {};
      const porOS = new Map();
      
      rows.forEach(row => {
        const chave = (row[colOS] || '').trim() || '—';
        if (!porOS.has(chave)) porOS.set(chave, []);
        porOS.get(chave).push(row);
      });
      
      const cardsHtml = [...porOS.values()]
        .sort((a, b) => (a[0][colData] || '').localeCompare(b[0][colData] || '', 'pt-BR'))
        .map(osRows => _tratosOSCardHTML(osRows, colOS, colArea, colCodTalhao, mostrarTalhao))
        .join('');
        
      const totalOS = porOS.size;
      const uid = 'osdet-' + Math.random().toString(36).slice(2, 10);
      
      return `<div class="tratos-os-detalhe-toggle" onclick="_tratosToggleDetalheOS('${uid}', this)" data-total="${totalOS}">
        <i class="fas fa-chevron-right toggle-chevron"></i> <span>Ver ${totalOS} O.S.</span>
      </div>
      <div class="tratos-os-detalhe-corpo" id="${uid}" style="display:none;">${cardsHtml}</div>`;
    }
    
    const nivelDef = niveisDefs[niveisChaves[idx]];
    const grupos = new Map();
    
    [...rows].sort((a, b) => nivelDef.key(a).localeCompare(nivelDef.key(b), 'pt-BR', { numeric: true })).forEach(row => {
      const key = nivelDef.key(row) || '—';
      if (!grupos.has(key)) grupos.set(key, { label: nivelDef.label(row), rows: [] });
      grupos.get(key).rows.push(row);
    });
    
    let html = '';
    grupos.forEach(({ label, rows: gRows }) => {
      const areaMap = _calcAreaOS(gRows, colOS, colArea, colCodTalhao);
      const area = Object.values(areaMap).reduce((s, v) => s + v, 0);
      const statsExtra = _tratosStatsDoseGrupo(gRows);
      
      html += `<div class="tratos-grupo-bar nivel-${idx}">
        <span class="tgb-label">${esc(label)}</span>
        <span class="tgb-stats">${formatarNumeroCurto(area)} ha${statsExtra}</span>
      </div>
      <div class="tratos-grupo-corpo nivel-${idx}">
        ${_tratosRenderNivel(gRows, niveisDefs, niveisChaves, idx + 1, colOS, colArea, colCodTalhao)}
      </div>`;
    });
    
    return html;
  }
  
  function _tratosStatsDoseGrupo(gRows) {
    const { colCodProd, colDescProd, colDoseRec, colDoseAplic } = window._tratosCols || {};
    const produtos = new Set(gRows.map(r => [r[colCodProd], r[colDescProd]].filter(Boolean).join('§')));
    if (produtos.size !== 1) return '';
    
    let somaRec = 0, nRec = 0, somaApl = 0, nApl = 0;
    gRows.forEach(r => {
      const dr = parseNum(r[colDoseRec]);
      const da = parseNum(r[colDoseAplic]);
      if (!isNaN(dr)) { somaRec += dr; nRec++; }
      if (!isNaN(da)) { somaApl += da; nApl++; }
    });
    
    if (!nRec && !nApl) return '';
    
    const fmt = v => formatarNumeroCurto(v);
    const partes = [];
    if (nApl) partes.push(`dose média aplicada: <b>${fmt(somaApl / nApl)}</b>`);
    if (nRec) partes.push(`dose média recomendada: <b>${fmt(somaRec / nRec)}</b>`);
    
    return partes.length ? `· ${partes.join(' × ')}` : '';
  }
  
  function _tratosToggleDetalheOS(uid, btnEl) {
    const corpo = document.getElementById(uid);
    if (!corpo) return;
    const abrindo = corpo.style.display === 'none';
    corpo.style.display = abrindo ? 'block' : 'none';
    btnEl.classList.toggle('open', abrindo);
    const label = btnEl.querySelector('span');
    if (label) {
      const totalOS = btnEl.dataset.total || '';
      label.textContent = abrindo ? 'Ocultar O.S.' : `Ver ${totalOS} O.S.`;
    }
  }
  window._tratosToggleDetalheOS = _tratosToggleDetalheOS;
  
  const TRATOS_LIMITE_REGISTROS = 800;
  
  function _mostrarResultadoHierarquico(tipo, niveisChaves, dadosFiltrados) {
    const card = document.getElementById('card-tratos-relatorio-resultado');
    const titulo = document.getElementById('tr-resultado-titulo');
    const filtrosEl = document.getElementById('tr-resultado-filtros');
    const corpo = document.getElementById('tr-resultado-corpo');
    if (!card || !corpo) return;
    
    const { colOS, colArea, colCodTalhao } = window._tratosCols || {};
    const excedeu = dadosFiltrados.length > TRATOS_LIMITE_REGISTROS;
    const base = excedeu ? dadosFiltrados.slice(0, TRATOS_LIMITE_REGISTROS) : dadosFiltrados;
    
    titulo.textContent = TRATOS_RELATORIO_TITULOS[tipo] || 'Relatório';
    const areaGeralMap = _calcAreaOS(dadosFiltrados, colOS, colArea, colCodTalhao);
    const areaGeral = Object.values(areaGeralMap).reduce((s, v) => s + v, 0);
    
    filtrosEl.textContent = `${dadosFiltrados.length} registro${dadosFiltrados.length !== 1 ? 's' : ''} no filtro`
      + (excedeu ? ` — processando os primeiros ${TRATOS_LIMITE_REGISTROS} (refine os filtros pra ver o restante)` : '')
      + ` · ${_tratosFiltrosAtivosTexto()}`;
      
    const niveisDefs = _tratosNiveisDisponiveis();
    const pillArea = `<div class="tratos-area-pill"><i class="fas fa-ruler-combined"></i> Área total aplicada: <b>${formatarNumeroCurto(areaGeral)} ha</b></div>`;
    corpo.innerHTML = pillArea + `<div class="tratos-hierarquia">${_tratosRenderNivel(base, niveisDefs, niveisChaves, 0, colOS, colArea, colCodTalhao)}</div>`;
    
    window._tratosRelatorioAtual = { tipo, niveisChaves, dados: dadosFiltrados };
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  function exportarPDFRelatorioAgrupado() {
    const atual = window._tratosRelatorioAtual;
    if (!atual) { if (typeof showToast === 'function') showToast('⚠️ Gere um relatório primeiro.', 'error', 2500); return; }
    
    const { tipo, niveisChaves, dados } = atual;
    const { colData, colOS, colArea, colCodTalhao, colCodProd, colDescProd, colDoseRec, colDoseAplic } = window._tratosCols || {};
    const niveisDefs = _tratosNiveisDisponiveis();
    
    const ordenado = [...dados].sort((a, b) => {
      for (const nk of niveisChaves) {
        const cmp = niveisDefs[nk].key(a).localeCompare(niveisDefs[nk].key(b), 'pt-BR', { numeric: true });
        if (cmp !== 0) return cmp;
      }
      return (a[colOS] || '').localeCompare(b[colOS] || '', 'pt-BR');
    });
    
    const grupos = new Map();
    ordenado.forEach(row => {
      const chaveNiveis = niveisChaves.map(nk => niveisDefs[nk].key(row)).join('§');
      const os = (row[colOS] || '').trim() || '—';
      const chave = chaveNiveis + '§§' + os;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(row);
    });
    
    const nomesNiveis = { produto: 'Produto', fazenda: 'Fazenda', setor: 'Setor', talhao: 'Talhão', grupoOp: 'Grupo de Operação', subgrupo: 'Subprocesso', operacao: 'Operação' };
    const head = [[...niveisChaves.map(nk => nomesNiveis[nk] || nk), 'Data', 'Nº O.S.', 'Área (ha)', 'Produtos aplicados — dose recomendada → dose aplicada']];
    
    const body = [...grupos.values()].map(osRows => {
      const first = osRows[0];
      const areaMap = _calcAreaOS(osRows, colOS, colArea, colCodTalhao);
      const area = Object.values(areaMap).reduce((s, v) => s + v, 0);
      
      const produtosTxt = osRows.map(r => {
        const dr = parseNum(r[colDoseRec]);
        const da = parseNum(r[colDoseAplic]);
        const difStr = (!isNaN(dr) && dr > 0 && !isNaN(da))
          ? ' (' + (((da - dr) / dr) * 100 >= 0 ? '+' : '') + (((da - dr) / dr) * 100).toFixed(1) + '%)' : '';
        const nome = [r[colCodProd], r[colDescProd]].filter(Boolean).join(' · ') || 'Produto não identificado';
        return `${nome}: ${r[colDoseRec] || '—'} → ${r[colDoseAplic] || '—'}${difStr}`;
      }).join('\n');
      
      return [
        ...niveisChaves.map(nk => niveisDefs[nk].label(first)),
        first[colData] || '—', first[colOS] || '—',
        formatarNumeroCurto(area),
        produtosTxt,
      ];
    });
    
    const areaTotalMap = _calcAreaOS(dados, colOS, colArea, colCodTalhao);
    const areaTotalPDF = Object.values(areaTotalMap).reduce((s, v) => s + v, 0);
    
    const { pdf, y } = _novoPDFRelatorio(
      `Tratos Culturais — ${TRATOS_RELATORIO_TITULOS[tipo] || 'Relatório'}`,
      `Área total aplicada: ${formatarNumeroCurto(areaTotalPDF)} ha · ${_tratosFiltrosAtivosTexto()}`,
      'landscape'
    );
    
    pdf.autoTable({ ...(_PDF_TABLE_ESTILO), startY: y, head, body, bodyStyles: { ...(_PDF_TABLE_ESTILO.bodyStyles || {}), valign: 'top' } });
    _finalizarPDFRelatorio(pdf, `Tratos_${(TRATOS_RELATORIO_TITULOS[tipo] || 'relatorio').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`);
  }
  
  window.tratosSSAbrir       = tratosSSAbrir;
  window.tratosSSFiltrar     = tratosSSFiltrar;
  window.tratosSSLimpar      = tratosSSLimpar;
  
  function _calcAreaOS(dados, colOS, colArea, colTalhao) {
    const osGrupos = {};
    dados.forEach(row => {
      const os = (row[colOS] || '').trim();
      if (!os) return;
      const talhaoKey = colTalhao ? ((row[colTalhao] || '').trim() || 'semtalhao') : 'semtalhao';
      const area = parseNum(row[colArea]) || 0;
      if (!osGrupos[os]) osGrupos[os] = {};
      if (!osGrupos[os][talhaoKey]) osGrupos[os][talhaoKey] = [];
      osGrupos[os][talhaoKey].push(area);
    });
    
    const areaOS = {};
    Object.entries(osGrupos).forEach(([os, porTalhao]) => {
      let total = 0;
      Object.values(porTalhao).forEach(areas => {
        const unicas = new Set(areas.map(a => Math.round(a * 10000)));
        total += unicas.size === 1 ? areas[0] : areas.reduce((s, v) => s + v, 0);
      });
      areaOS[os] = total;
    });
    return areaOS;
  }
  
  function iniciarModuloTratos() {
    if (!_tratosIniciado) {
      _tratosIniciado = true;
      carregarDadosTratos();
    }
  }
  
  function parseData(str) {
    if (!str) return null;
    str = str.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [d, m, y] = str.split('/');
      return new Date(+y, +m - 1, +d);
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str.substring(0, 10));
    return null;
  }
  
  function parseNum(v) {
    if (v === null || v === undefined || v === '') return NaN;
    return parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
  }
  
  function esc(v) {
    return String(v == null ? '—' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  
  function detectarColunas(fields) {
    const norm = s => String(s).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'');
    function findCol(candidates) {
      for (const kw of candidates) {
        const kwn = norm(kw);
        const f = fields.find(c => norm(c) === kwn);
        if (f) return f;
      }
      for (const kw of candidates) {
        const kwn = norm(kw);
        const f = fields.find(c => norm(c).includes(kwn));
        if (f) return f;
      }
      return '';
    }
    return {
      colData: findCol(['DATA APLICACAO','DATAAPLIC','DT APLIC','DATA']),
      colOS: findCol(['NR OS','NROS','NR. O.S.','N OS','NUMEROOS','OS']),
      colCodProd: findCol(['COD PRODUTO','CODPROD','CODIGO PRODUTO','COD PROD']),
      colDescProd: findCol(['DESC PRODUTO','DESCPROD','DESCRICAO PRODUTO','NOME PRODUTO','PRODUTO']),
      colCodOp: findCol(['COD OPERACAO','CODOP','CODIGO OPERACAO','COD OP']),
      colDescOp: findCol(['DESC OPERACAO AGR','DESCOPERACAOAGR','OPERACAO AGR','DESCOPERACAO','OPERACAO AGRICOLA','OPERACAO']),
      colCodFazenda: findCol(['COD FAZENDA','CODFAZENDA','CODIGO FAZENDA','COD FAZ','CODFAZ']),
      colFazenda: findCol(['DESCRICAO FAZENDA','DESCRICAOFAZENDA','DESCRICAO FAZ','DESC FAZENDA','DESCFAZENDA','NOME FAZENDA','NOMEFAZENDA','FAZENDA','FARM','PROPRIEDADE']),
      colArea: findCol(['AREA APLICADA','AREAAPLIC','AREA APLIC','AREA','HA']),
      colDoseRec: findCol(['DOSE RECOMENDADA','DOSEREC','DOSE REC','RECOMENDADA']),
      colDoseAplic: findCol(['DOSE APLICADA','DOSEAPLIC','DOSE APLIC','APLICADA']),
      colCodEmpresa: findCol(['COD EMPRESA','CODIGO EMPRESA']),
      colAbvEmpresa: findCol(['ABV EMPRESA','ABREVIACAO EMPRESA']),
      colLancamento: findCol(['NRO LANCAMENTO','NUMERO LANCAMENTO','LANCAMENTO']),
      colSafra: findCol(['SAFRA']),
      colCodFuncionario: findCol(['COD FUNCIONARIO','CODIGO FUNCIONARIO']),
      colFuncionario: findCol(['NOME FUNCIONARIO','FUNCIONARIO','APLICADOR']),
      colCodProcesso: findCol(['COD PROCESSO','CODIGO PROCESSO']),
      colDescProcesso: findCol(['DESC PROCESSO','PROCESSO']),
      colCodSubprocesso: findCol(['COD SUBPROCESSO','CODIGO SUBPROCESSO']),
      colDescSubprocesso: findCol(['DESC SUBPROCESSO','SUBPROCESSO']),
      colCodGrupoOp: findCol(['COD GRUPO OP','CODIGO GRUPO OPERACAO']),
      colDescGrupoOp: findCol(['DESC GRUPO OP','GRUPO OPERACAO']),
      colUnidade: findCol(['UNIDADE']),
      colCodSetor: findCol(['COD SETOR','CODIGO SETOR']),
      colDescSetor: findCol(['DESC SETOR','SETOR']),
      colCodBloco: findCol(['COD BLOCO','CODIGO BLOCO']),
      colDescBloco: findCol(['DESC BLOCO','BLOCO']),
      colCodTalhao: findCol(['COD TALHAO','CODIGO TALHAO','TALHAO']),
      colMunicipio: findCol(['MUNICIPIO']),
      colVariedade: findCol(['VARIEDADE']),
      colPrimeiraEntradaCana: findCol(['PRIMEIRA ENTRADA CANA']),
      colUltimaEntradaCana: findCol(['ULTIMA ENTRADA CANA']),
      colAbvEstagioCorte: findCol(['ABV ESTAGIO CORTE']),
      colCodEstagioCorte: findCol(['COD ESTAGIO CORTE','CODIGO ESTAGIO CORTE']),
      colDtCorteAtual: findCol(['DT CORTE ATUAL']),
      colDtPlantio: findCol(['DT PLANTIO']),
      colDtPrimCorte: findCol(['DT PRIM CORTE']),
      colDtUltCorte: findCol(['DT ULT CORTE']),
      colMesAplic: findCol(['MES APLIC']),
      colMesAnoAplic: findCol(['MES ANO APLIC']),
      colSituacaoTalhao: findCol(['SITUACAO TALHAO']),
    };
  }
  
  function popularSelect(id, dados, col, defaultLabel) {
    const sel = document.getElementById(id);
    if (!sel || !col) return;
    const anterior = sel.value;
    const unicos = [...new Set(dados.map(r => (r[col] || '').trim()))].filter(Boolean).sort();
    sel.innerHTML = `<option value="">${defaultLabel}</option>`;
    unicos.forEach(v => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      if (v === anterior) o.selected = true;
      sel.appendChild(o);
    });
  }
  
  function popularSelectCodDesc(id, dados, colCod, colDesc, defaultLabel) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const colValor = colDesc || colCod;
    if (!colValor) return;
    const anterior = sel.value;
    const mapa = {};
    
    dados.forEach(r => {
      const val = (r[colValor] || '').trim();
      const cod = (colCod && colCod !== colValor) ? (r[colCod] || '').trim() : '';
      if (val && !mapa[val]) mapa[val] = cod;
    });
    
    const vals = Object.keys(mapa).sort((a, b) => {
      const codA = parseInt(mapa[a], 10);
      const codB = parseInt(mapa[b], 10);
      if (!isNaN(codA) && !isNaN(codB) && codA !== codB) return codA - codB;
      if (!isNaN(codA) && isNaN(codB)) return -1;
      if (isNaN(codA) && !isNaN(codB)) return 1;
      return a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true });
    });
    
    sel.innerHTML = `<option value="">${defaultLabel}</option>`;
    vals.forEach(val => {
      const o = document.createElement('option');
      o.value = val;
      const cod = mapa[val];
      o.textContent = cod ? `${cod} · ${val}` : val;
      if (val === anterior) o.selected = true;
      sel.appendChild(o);
    });
    
    if (anterior && !vals.includes(anterior)) sel.value = '';
  }
  
  function selectVal(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    return (el.options[el.selectedIndex]?.value || '').trim();
  }
  
  function _tratosSSRefs(selectId) {
    const sel    = document.getElementById(selectId);
    const wrap   = document.getElementById('ss-' + selectId);
    if (!sel || !wrap) return null;
    return {
      sel, wrap,
      input: wrap.querySelector('.tratos-ss-input'),
      lista: wrap.querySelector('.tratos-ss-lista'),
      clearBtn: wrap.querySelector('.tratos-ss-clear'),
    };
  }
  
  function _tratosSSRenderLista(selectId, termo) {
    const r = _tratosSSRefs(selectId);
    if (!r) return;
    const { sel, lista } = r;
    const termoNorm = (termo || '').trim().toLowerCase();
    const opts = Array.from(sel.options).filter(o => o.value !== '');
    const filtradas = !termoNorm ? opts : opts.filter(o => o.textContent.toLowerCase().includes(termoNorm));
    
    if (filtradas.length === 0) {
      lista.innerHTML = `<div class="tratos-ss-opt ss-empty">Nenhum resultado</div>`;
      return;
    }
    
    lista.innerHTML = filtradas.map(o => {
      const selecionado = o.value === sel.value && sel.value !== '';
      return `<div class="tratos-ss-opt${selecionado ? ' selected' : ''}" data-val="${esc(o.value)}">${o.innerHTML}</div>`;
    }).join('');
    
    lista.querySelectorAll('.tratos-ss-opt[data-val]').forEach(div => {
      div.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        _tratosSSEscolher(selectId, div.dataset.val);
      });
    });
  }
  
  function tratosSSAbrir(selectId) {
    const r = _tratosSSRefs(selectId);
    if (!r) return;
    document.querySelectorAll('.tratos-ss.open').forEach(el => {
      if (el.id !== 'ss-' + selectId) el.classList.remove('open');
    });
    r.wrap.classList.add('open');
    r.input.select();
    _tratosSSRenderLista(selectId, '');
  }
  
  function tratosSSFiltrar(selectId) {
    const r = _tratosSSRefs(selectId);
    if (!r) return;
    r.wrap.classList.add('open');
    if (r.clearBtn) r.clearBtn.style.display = r.input.value ? 'block' : 'none';
    _tratosSSRenderLista(selectId, r.input.value);
  }
  
  function _tratosSSEscolher(selectId, val) {
    const r = _tratosSSRefs(selectId);
    if (!r) return;
    r.sel.value = val;
    if (val) {
      const optLabel = Array.from(r.sel.options).find(o => o.value === val);
      r.input.value = optLabel ? optLabel.textContent : val;
      r.clearBtn.style.display = 'block';
    } else {
      r.input.value = '';
      r.clearBtn.style.display = 'none';
    }
    r.wrap.classList.remove('open');
    r.sel.dispatchEvent(new Event('change'));
  }
  
  function tratosSSLimpar(selectId) {
    _tratosSSEscolher(selectId, '');
  }
  
  function _tratosSSSync(selectId) {
    const r = _tratosSSRefs(selectId);
    if (!r) return;
    const val = r.sel.value;
    const optLabel = Array.from(r.sel.options).find(o => o.value === val);
    r.input.value = (val && optLabel) ? optLabel.textContent : '';
    if (r.clearBtn) r.clearBtn.style.display = val ? 'block' : 'none';
  }
  
  document.addEventListener('click', (ev) => {
    document.querySelectorAll('.tratos-ss.open').forEach(wrap => {
      if (!wrap.contains(ev.target)) wrap.classList.remove('open');
    });
  });
  
  window._tratosMultiSel    = { fazenda: new Set(), operacao: new Set(), produto: new Set(), grupoOp: new Set(), subprocesso: new Set(), libFazenda: new Set(), safra: new Set() };
  window._tratosMultiOpcoes = { fazenda: [], operacao: [], produto: [], grupoOp: [], subprocesso: [], libFazenda: [], safra: [] };
  
  function _tratosMSPopular(campo, dados, colCod, colDesc) {
    const colValor = colDesc || colCod;
    if (!colValor) { window._tratosMultiOpcoes[campo] = []; return; }
    
    const mapa = {};
    dados.forEach(r => {
      const val = (r[colValor] || '').trim();
      const cod = (colCod && colCod !== colValor) ? (r[colCod] || '').trim() : '';
      if (val && !mapa[val]) mapa[val] = cod;
    });
    
    const vals = Object.keys(mapa).sort((a, b) => {
      const codA = parseInt(mapa[a], 10);
      const codB = parseInt(mapa[b], 10);
      if (!isNaN(codA) && !isNaN(codB) && codA !== codB) return codA - codB;
      if (!isNaN(codA) && isNaN(codB)) return -1;
      if (isNaN(codA) && !isNaN(codB)) return 1;
      return a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true });
    });
    
    window._tratosMultiOpcoes[campo] = vals.map(v => ({ value: v, label: mapa[v] ? `${mapa[v]} · ${v}` : v }));
    
    const validos = new Set(vals);
    [...window._tratosMultiSel[campo]].forEach(v => { if (!validos.has(v)) window._tratosMultiSel[campo].delete(v); });
    _tratosMSSyncDisplay(campo);
  }
  
  function _tratosMSRenderLista(campo, termo) {
    const cont = document.getElementById('ms-opcoes-' + campo);
    if (!cont) return;
    const termoNorm = (termo || '').trim().toLowerCase();
    const opcoes = window._tratosMultiOpcoes[campo] || [];
    const filtradas = !termoNorm ? opcoes : opcoes.filter(o => o.label.toLowerCase().includes(termoNorm));
    
    if (!filtradas.length) {
      cont.innerHTML = `<div class="tratos-ms-opt ss-empty">Nenhum resultado</div>`;
      return;
    }
    
    const sel = window._tratosMultiSel[campo];
    cont.innerHTML = filtradas.map(o => `<label class="tratos-ms-opt"> <input type="checkbox" value="${esc(o.value)}" ${sel.has(o.value) ? 'checked' : ''} onchange="tratosMSToggle('${campo}', this.value, this.checked)"> <span>${esc(o.label)}</span> </label>`).join('');
  }
  
  function tratosMSAbrir(campo) {
    const wrap = document.getElementById('ms-tratos-filtro-' + campo);
    if (!wrap) return;
    document.querySelectorAll('.tratos-ms.open').forEach(el => { if (el !== wrap) el.classList.remove('open'); });
    document.querySelectorAll('.tratos-ss.open').forEach(el => el.classList.remove('open'));
    const abrindo = !wrap.classList.contains('open');
    wrap.classList.toggle('open', abrindo);
    if (abrindo) _tratosMSRenderLista(campo, '');
  }
  
  function tratosMSFiltrarTexto(campo, termo) {
    _tratosMSRenderLista(campo, termo);
  }
  
  function tratosMSToggle(campo, val, marcado) {
    const sel = window._tratosMultiSel[campo];
    if (marcado) sel.add(val); else sel.delete(val);
    _tratosMSSyncDisplay(campo);
    if (campo === 'libFazenda' && typeof filtrarTabela === 'function') filtrarTabela();
  }
  
  function tratosMSLimpar(campo) {
    window._tratosMultiSel[campo].clear();
    _tratosMSRenderLista(campo, '');
    _tratosMSSyncDisplay(campo);
    if (campo === 'libFazenda' && typeof filtrarTabela === 'function') filtrarTabela();
  }
  
  window.tratosMSAbrir = tratosMSAbrir;
  window.tratosMSFiltrarTexto = tratosMSFiltrarTexto;
  window.tratosMSToggle = tratosMSToggle;
  window.tratosMSLimpar = tratosMSLimpar;
  window._tratosMSSyncDisplay = _tratosMSSyncDisplay;
  
  function _tratosMSSyncDisplay(campo) {
    const disp = document.getElementById('ms-display-' + campo);
    const clearBtn = document.getElementById('ms-clear-' + campo);
    if (!disp) return;
    
    const sel = window._tratosMultiSel[campo];
    const opcoes = window._tratosMultiOpcoes[campo] || [];
    
    if (sel.size === 0) {
      disp.textContent = '— Todas —';
      disp.classList.remove('tem-valor');
      if (clearBtn) clearBtn.style.display = 'none';
    } else if (sel.size === 1) {
      const [v] = sel;
      const opt = opcoes.find(o => o.value === v);
      disp.textContent = opt ? opt.label : v;
      disp.classList.add('tem-valor');
      if (clearBtn) clearBtn.style.display = 'block';
    } else {
      disp.textContent = `${sel.size} selecionadas`;
      disp.classList.add('tem-valor');
      if (clearBtn) clearBtn.style.display = 'block';
    }
  }
  
  document.addEventListener('click', (ev) => {
    document.querySelectorAll('.tratos-ms.open').forEach(wrap => {
      if (!wrap.contains(ev.target)) wrap.classList.remove('open');
    });
  });
  
  function _tratosCarregarCSVFonte() {
    return new Promise((resolve, reject) => {
      Papa.parse(URL_TRATOS, {
        download: true, header: true, skipEmptyLines: true,
        complete: function(results) {
          if (!results.data || results.data.length === 0) {
            reject(new Error('Nenhum dado encontrado na aba PCP.'));
            return;
          }
          const cols = detectarColunas(results.meta.fields || []);
          resolve({ dados: results.data, cols });
        },
        error: function(err) { reject(err); }
      });
    });
  }
  
  const TRATOS_SUPABASE_COLS = {
    colData: 'data_aplicacao', colOS: 'nr_os',
    colCodProd: 'cod_produto', colDescProd: 'desc_produto',
    colCodOp: 'cod_operacao', colDescOp: 'desc_operacao',
    colCodFazenda: 'cod_fazenda', colFazenda: 'desc_fazenda',
    colArea: 'area_aplicada', colDoseRec: 'dose_recomendada', colDoseAplic: 'dose_aplicada',
    colCodEmpresa: 'cod_empresa', colAbvEmpresa: 'abv_empresa',
    colLancamento: 'nro_lancamento', colSafra: 'safra',
    colCodFuncionario: 'cod_funcionario', colFuncionario: 'nome_funcionario',
    colCodProcesso: 'cod_processo', colDescProcesso: 'desc_processo',
    colCodSubprocesso: 'cod_subprocesso', colDescSubprocesso: 'desc_subprocesso',
    colCodGrupoOp: 'cod_grupo_op', colDescGrupoOp: 'desc_grupo_op',
    colUnidade: 'unidade', colCodSetor: 'cod_setor', colDescSetor: 'desc_setor',
    colCodBloco: 'cod_bloco', colDescBloco: 'desc_bloco', colCodTalhao: 'cod_talhao',
    colMunicipio: 'municipio', colVariedade: 'variedade', colSituacaoTalhao: 'situacao_talhao',
  };
  
  function _numParaBR(v) {
    if (v === null || v === undefined || v === '') return '';
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? '' : String(n).replace('.', ',');
  }
  
  async function _tratosBuscarSupabasePaginado() {
    const PAGINA = 1000;
    const { count, error: erroCount } = await _sbClient.from('tratos_pcp').select('id', { count: 'exact', head: true });
    if (erroCount) throw erroCount;
    const total = count || 0;
    if (!total) return [];
    
    const totalPaginas = Math.ceil(total / PAGINA);
    const pedidos = [];
    for (let p = 0; p < totalPaginas; p++) {
      const de = p * PAGINA;
      pedidos.push(_sbClient.from('tratos_pcp').select('*').order('id', { ascending: true }).range(de, de + PAGINA - 1));
    }
    
    const respostas = await Promise.all(pedidos);
    const todas = [];
    for (const { data, error } of respostas) {
      if (error) throw error;
      if (data) todas.push(...data);
    }
    return todas;
  }
  
  async function carregarDadosTratos() {
    _tratosIniciado = true;
    const contador    = document.getElementById('tratos-contador');
    const corpoTabela = document.getElementById('corpo-tabela-tratos');
    
    if (contador) contador.textContent = 'Carregando...';
    if (corpoTabela) corpoTabela.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--text-3);padding:24px;font-size:12px;"><i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Carregando dados de Tratos...</td></tr>`;
    
    if (typeof _sbClient === 'undefined') {
      if (contador) contador.textContent = 'Erro ao carregar';
      if (typeof showToast === 'function') showToast('⚠️ Cliente Supabase não encontrado.', 'error', 3500);
      return;
    }
    
    try {
      const brutos = await _tratosBuscarSupabasePaginado();
      if (!brutos.length) {
        if (corpoTabela) corpoTabela.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--text-3);padding:24px;font-size:12px;"><i class="fas fa-info-circle" style="margin-right:6px;"></i>Nenhum dado sincronizado ainda. Use o ícone de nuvem para sincronizar.</td></tr>`;
        if (contador) contador.textContent = '0 registros';
        return;
      }
      
      const dados = brutos.map(r => ({
        ...r,
        area_aplicada   : _numParaBR(r.area_aplicada),
        dose_recomendada: _numParaBR(r.dose_recomendada),
        dose_aplicada   : _numParaBR(r.dose_aplicada),
      }));
      
      const cols = TRATOS_SUPABASE_COLS;
      window._tratosCols      = cols;
      window._tratosDados     = dados;
      window._tratosFiltrados = dados;
      
      _tratosMSPopular('produto',     dados, cols.colCodProd, cols.colDescProd);
      _tratosMSPopular('fazenda',     dados, cols.colCodFazenda, cols.colFazenda);
      _tratosMSPopular('operacao',    dados, cols.colCodOp, cols.colDescOp);
      _tratosMSPopular('subprocesso', dados, cols.colCodSubprocesso, cols.colDescSubprocesso);
      _tratosMSPopular('grupoOp',     dados, cols.colCodGrupoOp, cols.colDescGrupoOp);
      _tratosMSPopular('safra', dados, null, cols.colSafra);
      
      popularSelectCodDesc('tratos-filtro-aplicador', dados, cols.colCodFuncionario, cols.colFuncionario, '— Todos —');
      popularSelectCodDesc('tratos-filtro-empresa',   dados, cols.colCodEmpresa, cols.colAbvEmpresa, '— Todas —');
      _tratosSSSync('tratos-filtro-aplicador');
      
      renderizarTratos(dados);
      if (typeof showToast === 'function') showToast('✅ Tratos Culturais carregados!', 'success', 2000);
    } catch (err) {
      console.error('[Tratos] Erro Supabase:', err);
      if (corpoTabela) corpoTabela.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--red);padding:24px;font-size:12px;"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>Erro ao carregar dados do Supabase. Verifique se está logado e tente de novo.</td></tr>`;
      if (contador) contador.textContent = 'Erro ao carregar';
    }
  }
  
  function exportarPDFTratos() {
    const dados = window._tratosFiltrados || window._tratosDados;
    if (!dados || !dados.length) { showToast('⚠️ Nenhum dado carregado para exportar.', 'error', 2500); return; }
    
    const { colData, colOS, colCodProd, colDescProd, colCodOp, colDescOp, colCodFazenda, colFazenda, colArea, colDoseRec, colDoseAplic, colCodTalhao } = window._tratosCols || {};
    const filtrosTxt = _tratosFiltrosAtivosTexto();
    const areaOSMap = _calcAreaOS(dados, colOS, colArea, colCodTalhao);
    const somaArea = Object.values(areaOSMap).reduce((s, v) => s + v, 0);
    
    const { pdf, y } = _novoPDFRelatorio('Tratos Culturais', `${dados.length} registros · ${filtrosTxt} · Área total: ${formatarNumeroCurto(somaArea)} ha`, 'landscape');
    
    pdf.autoTable({
      ...(_PDF_TABLE_ESTILO),
      startY: y,
      head: [['Data', 'Nº O.S.', 'Fazenda', 'Talhão', 'Produto', 'Operação', 'Área (ha)', 'Dose Rec.', 'Dose Aplic.', 'Dif. (%)']],
      body: dados.map(row => {
        const dr = parseNum(row[colDoseRec]);
        const da = parseNum(row[colDoseAplic]);
        let difPct = '—';
        if (!isNaN(dr) && dr > 0 && !isNaN(da)) {
          const pct = ((da - dr) / dr) * 100;
          difPct = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
        }
        return [
          row[colData] || '—',
          row[colOS] || '—',
          [row[colCodFazenda], row[colFazenda]].filter(Boolean).join(' · ') || row[colFazenda] || row[colCodFazenda] || '—',
          row[colCodTalhao] || '—',
          [row[colCodProd], row[colDescProd]].filter(Boolean).join(' · ') || '—',
          [row[colCodOp], row[colDescOp]].filter(Boolean).join(' · ') || '—',
          formatarNumeroCurto(row[colArea]),
          formatarNumeroCurto(row[colDoseRec]),
          formatarNumeroCurto(row[colDoseAplic]),
          difPct,
        ];
      }),
      columnStyles: { 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 9) {
          const raw = String(data.cell.raw || '');
          if (raw.includes('-')) { data.cell.styles.textColor = [198, 40, 40]; data.cell.styles.fontStyle = 'bold'; }
          else if (raw !== '—') { data.cell.styles.textColor = [46, 125, 50]; data.cell.styles.fontStyle = 'bold'; }
        }
      },
    });
    
    _finalizarPDFRelatorio(pdf, `Tratos_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`);
  }
  window.exportarPDFTratos = exportarPDFTratos;
  
  function filtrarTratos() {
    if (!window._tratosDados) return;
    
    const { colData, colDescProd, colCodProd, colFazenda, colCodFazenda, colDescOp, colFuncionario, colCodFuncionario, colDescGrupoOp, colCodGrupoOp, colDescSubprocesso, colCodSubprocesso, colAbvEmpresa, colCodEmpresa, colSafra } = window._tratosCols || {};
    
    const colProdEfetivo   = colDescProd || colCodProd;
    const colFazEfetiva    = colFazenda || colCodFazenda;
    const colAplicEfetivo  = colFuncionario || colCodFuncionario;
    const colEmpresaEfetiva= colAbvEmpresa || colCodEmpresa;
    const colGrupoOpEfetivo= colDescGrupoOp || colCodGrupoOp;
    const colSubprocEfetivo= colDescSubprocesso || colCodSubprocesso;
    
    const selProd    = window._tratosMultiSel?.produto || new Set();
    const selGrupoOp = window._tratosMultiSel?.grupoOp || new Set();
    const selSubproc = window._tratosMultiSel?.subprocesso || new Set();
    const selFaz     = window._tratosMultiSel?.fazenda || new Set();
    const selOp      = window._tratosMultiSel?.operacao || new Set();
    const selSafra   = window._tratosMultiSel?.safra || new Set();
    
    const bAplicador = selectVal('tratos-filtro-aplicador');
    const bEmpresa   = selectVal('tratos-filtro-empresa');
    const bDataIni = (document.getElementById('tratos-filtro-data-ini')?.value || '').trim();
    const bDataFim = (document.getElementById('tratos-filtro-data-fim')?.value || '').trim();
    
    const dIni = bDataIni ? new Date(bDataIni + 'T00:00:00') : null;
    const dFim = bDataFim ? new Date(bDataFim + 'T23:59:59') : null;
    
    const filtrados = window._tratosDados.filter(row => {
      if (selProd.size && !selProd.has((row[colProdEfetivo] || '').trim())) return false;
      if (selGrupoOp.size && !selGrupoOp.has((row[colGrupoOpEfetivo] || '').trim())) return false;
      if (selSubproc.size && !selSubproc.has((row[colSubprocEfetivo] || '').trim())) return false;
      if (selFaz.size && !selFaz.has((row[colFazEfetiva] || '').trim())) return false;
      if (selOp.size && !selOp.has((row[colDescOp] || '').trim())) return false;
      if (selSafra.size && !selSafra.has((row[colSafra] || '').trim())) return false;
      if (bAplicador && (row[colAplicEfetivo] || '').trim() !== bAplicador) return false;
      if (bEmpresa && (row[colEmpresaEfetiva] || '').trim() !== bEmpresa) return false;
      
      if (dIni || dFim) {
        const dRow = parseData(row[colData]);
        if (dRow) {
          if (dIni && dRow < dIni) return false;
          if (dFim && dRow > dFim) return false;
        }
      }
      return true;
    });
    
    window._tratosFiltrados = filtrados;
    
    const contador = document.getElementById('tratos-contador');
    if (contador) {
      const total = window._tratosDados.length;
      contador.textContent = filtrados.length === total ? `${total} registros` : `${filtrados.length} de ${total} registros`;
    }
    
    renderizarTratos(filtrados);
  }
  
  function toggleMaisFiltrosTratos(el) {
    const bloco = document.getElementById('tratos-filtros-mais');
    if (!bloco) return;
    const aberto = bloco.style.display !== 'none';
    bloco.style.display = aberto ? 'none' : 'grid';
    el.classList.toggle('open', !aberto);
  }
  window.toggleMaisFiltrosTratos = toggleMaisFiltrosTratos;
  
  function renderizarTratos(dados) {
    const contador = document.getElementById('tratos-contador');
    if (contador) contador.textContent = `${dados.length} registro${dados.length !== 1 ? 's' : ''} encontrado${dados.length !== 1 ? 's' : ''}`;
    
    const cardResultado = document.getElementById('card-tratos-relatorio-resultado');
    if (cardResultado) cardResultado.style.display = 'none';
  }
  
  function exportarTratosExcel() {
    const dados = window._tratosFiltrados;
    if (!dados || dados.length === 0) {
      if (typeof showToast === 'function') showToast('⚠️ Nenhum dado para exportar.', 'error', 2500);
      return;
    }
    
    const { colData, colOS, colCodProd, colDescProd, colCodOp, colDescOp, colCodFazenda, colFazenda, colArea, colDoseRec, colDoseAplic } = window._tratosCols || {};
    const colFazDescExport = colFazenda || colCodFazenda;
    
    const cab = ['Data Aplicação','Nº O.S.','Cód. Fazenda','Desc. Fazenda','Cód. Produto','Desc. Produto','Cód. Operação','Desc. Operação Agr.','Área Aplic. (ha)','Dose Recomendada','Dose Aplicada','Diferença (%)'];
    
    const linhas = dados.map(row => {
      const dr = parseNum(row[colDoseRec]);
      const da = parseNum(row[colDoseAplic]);
      const dif = (!isNaN(dr) && dr > 0 && !isNaN(da)) ? (((da-dr)/dr)*100).toFixed(1)+'%' : '';
      return [
        row[colData], row[colOS], row[colCodFazenda], row[colFazDescExport],
        row[colCodProd], row[colDescProd], row[colCodOp], row[colDescOp],
        formatarNumeroCurto(row[colArea]), formatarNumeroCurto(row[colDoseRec]), formatarNumeroCurto(row[colDoseAplic]), dif
      ].map(v => `"${String(v || '').replace(/"/g,'""')}"`).join(';');
    });
    
    const csv  = '\uFEFF' + cab.map(c=>`"${c}"`).join(';') + '\n' + linhas.join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `tratos_culturais_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv` });
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (typeof showToast === 'function') showToast(`✅ ${dados.length} registros exportados!`, 'success', 2500);
  }
})();

/* ══════════════════════════════════════════════
MÓDULO PLANEJAMENTO DE SAFRA
══════════════════════════════════════════════ */
(function() {
  'use strict';
  const PLS_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQnWeCRljGl3qJ5B_NZ3Pz2jTrzdhRKhA-8me0HH40TstK-acRv3w4QKTvYKPEKqkWf0OnOSiijeuNv/pub';
  const PLS_URLS = {
    '401': PLS_BASE + '?gid=413102496&single=true&output=csv',
    '402': PLS_BASE + '?gid=1906371632&single=true&output=csv',
    '403': PLS_BASE + '?gid=1980138572&single=true&output=csv',
    '404': PLS_BASE + '?gid=1281974991&single=true&output=csv',
  };
  const PLS_URL_TIRO = PLS_BASE + '?gid=1448262477&single=true&output=csv';
  const PLS_URL_DIST = PLS_BASE + '?gid=352483918&single=true&output=csv';
  
  let _plsDados   = { '401': [], '402': [], '403': [], '404': [] };
  let _plsTiro    = [];
  let _plsDist    = [];
  let _plsLoaded  = false;
  let _plsLoading = false;
  
  window.abrirPlanejamentoSafra  = abrirPlanejamentoSafra;
  window.fecharPlanejamentoSafra = fecharPlanejamentoSafra;
  window.carregarPlanejamentoSafra = carregarPlanejamentoSafra;
  window.filtrarPlanejamentoTimeline = filtrarPlanejamentoTimeline;
  window.popularTalhoesBusca = popularTalhoesBusca;
  window.buscarTalhaoPlanejamento = buscarTalhaoPlanejamento;
  
  function _norm(s) {
    return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
  }
  
  function _num(v) {
    if (v == null || v === '') return NaN;
    return parseFloat(String(v).trim().replace(',', '.'));
  }
  
  function _fmtData(d) {
    if (!d || !(d instanceof Date) || isNaN(d)) return '—';
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }
  
  function _parseData(str) {
    if (!str) return null;
    str = String(str).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [d,m,y] = str.split('/');
      return new Date(+y, +m-1, +d);
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str.substring(0,10));
    return null;
  }
  
  function abrirPlanejamentoSafra() {
    document.getElementById('planejamento-safra-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    if (!_plsLoaded && !_plsLoading) carregarPlanejamentoSafra();
    else if (_plsLoaded) _plsRenderizarTudo();
  }
  
  function fecharPlanejamentoSafra() {
    document.getElementById('planejamento-safra-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }
  
  function _plsParseCsv(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true, header: false, skipEmptyLines: true,
        complete: r => resolve(r.data),
        error: e => reject(e),
      });
    });
  }
  
  async function carregarPlanejamentoSafra() {
    _plsLoading = true;
    const kpiEl = document.getElementById('pls-kpi-grid');
    const tlEl  = document.getElementById('pls-timeline-container');
    
    if (kpiEl) kpiEl.innerHTML = '<div class="pla-empty"><i class="fas fa-spinner fa-spin"></i>Carregando...</div>';
    if (tlEl)  tlEl.innerHTML  = '<div class="pla-empty"><i class="fas fa-spinner fa-spin"></i>Carregando...</div>';
    
    try {
      const [r401, r402, r403, r404, rTiro, rDist] = await Promise.all([
        _plsParseCsv(PLS_URLS['401']), _plsParseCsv(PLS_URLS['402']),
        _plsParseCsv(PLS_URLS['403']), _plsParseCsv(PLS_URLS['404']),
        _plsParseCsv(PLS_URL_TIRO), _plsParseCsv(PLS_URL_DIST),
      ]);
      
      _plsDados['401'] = _plsNormalizarFrente(r401);
      _plsDados['402'] = _plsNormalizarFrente(r402);
      _plsDados['403'] = _plsNormalizarFrente(r403);
      _plsDados['404'] = _plsNormalizarFrente(r404);
      _plsTiro = _plsNormalizarTiro(rTiro);
      _plsDist = _plsNormalizarDist(rDist);
      
      _plsLoaded  = true;
      _plsLoading = false;
      _plsRenderizarTudo();
      
      if (typeof registrarSync === 'function') registrarSync('ok', 'Planejamento de Safra');
    } catch(err) {
      _plsLoading = false;
      console.error('[PLANEJAMENTO SAFRA]', err);
      if (typeof showToast === 'function') showToast('❌ Erro ao carregar planejamento de safra', 'error');
    }
  }
  
  function _plsNormalizarFrente(rows) {
    if (!rows || !rows.length) return [];
    let headerLine = -1;
    for (let i = 0; i < Math.min(4, rows.length); i++) {
      const vals = rows[i].map(v => _norm(String(v||'')));
      if (vals.includes('FRENTE') && vals.includes('SEQUENCIA') && vals.some(v => v.startsWith('DESCRI'))) {
        headerLine = i; break;
      }
    }
    if (headerLine < 0) headerLine = 0;
    
    const header   = rows[headerLine].map(v => _norm(String(v||'')));
    const dataRows = rows.slice(headerLine + 1);
    
    const iFrente   = header.findIndex(v => v === 'FRENTE');
    const iSeq      = header.findIndex(v => v === 'SEQUENCIA');
    const iLocal    = header.findIndex(v => v === 'LOCAL');
    const iDesc     = header.findIndex(v => v.startsWith('DESCRI'));
    const iTalhao   = header.findIndex(v => v === 'TALHAO');
    const iBloco    = header.findIndex(v => v === 'BLOCO');
    const iVar      = header.findIndex(v => v === 'VARIEDADE');
    const iData     = header.findIndex(v => v.includes('DATA') && v.includes('COLHEITA'));
    const iTch      = header.findIndex(v => v === 'TCH');
    const iMoagem   = header.findIndex(v => v.includes('MOAGEM'));
    const iTc       = header.findIndex(v => v === 'TC');
    const iRaio     = header.findIndex(v => v === 'RAIO');
    const iTiro     = header.findIndex(v => v.includes('TIRO') && v.includes('MEDIO'));
    const iVel      = header.findIndex(v => v === 'VEL');
    const iTonH     = header.findIndex(v => v.includes('TON') && v.includes('H'));
    const iHrProd   = header.findIndex(v => v.includes('HR') && v.includes('PROD'));
    const iColheit  = header.findIndex(v => v.includes('COLHEITABILIDADE'));
    
    return dataRows.map(r => {
      if (!r || r.length < 5) return null;
      const frente = String(iFrente >= 0 ? r[iFrente] : '').trim();
      const talhao = String(iTalhao >= 0 ? r[iTalhao] : '').trim();
      if (!frente || !talhao) return null;
      
      const data = _parseData(String(iData >= 0 ? r[iData] : ''));
      return {
        frente, seq: _num(iSeq >= 0 ? r[iSeq] : '') || 0,
        codFazenda: String(iLocal >= 0 ? r[iLocal] : '').trim(),
        fazenda: String(iDesc >= 0 ? r[iDesc] : '').trim(),
        talhao, bloco: String(iBloco >= 0 ? r[iBloco] : '').trim(),
        variedade: String(iVar >= 0 ? r[iVar] : '').trim(),
        data, tch: _num(iTch >= 0 ? r[iTch] : ''),
        moagem: _num(iMoagem >= 0 ? r[iMoagem] : ''),
        tc: _num(iTc >= 0 ? r[iTc] : ''),
        raio: _num(iRaio >= 0 ? r[iRaio] : ''),
        tiroMedio: _num(iTiro >= 0 ? r[iTiro] : ''),
        vel: _num(iVel >= 0 ? r[iVel] : ''),
        tonH: _num(iTonH >= 0 ? r[iTonH] : ''),
        hrProd: _num(iHrProd >= 0 ? r[iHrProd] : ''),
        colheitabilidade: _num(iColheit >= 0 ? r[iColheit] : ''),
      };
    }).filter(Boolean);
  }
  
  function _plsNormalizarTiro(rows) {
    if (!rows || !rows.length) return [];
    const header = rows[0].map(v => _norm(String(v||'')));
    const dataRows = rows.slice(1);
    const iCod  = header.findIndex(v => v.includes('COD') && v.includes('FAZ'));
    const iDesc = header.findIndex(v => v.startsWith('DESC'));
    const iTiro = header.findIndex(v => v.includes('TIROMEDIO') && !v.includes('POND'));
    const iPond = header.findIndex(v => v.includes('TIROMEDIOPOND'));
    
    return dataRows.map(r => ({
      codFazenda: String(iCod >= 0 ? r[iCod] : '').trim(),
      fazenda: String(iDesc >= 0 ? r[iDesc] : '').trim(),
      tiroMedio: _num(iTiro >= 0 ? r[iTiro] : ''),
      tiroMedioPond: _num(iPond >= 0 ? r[iPond] : ''),
    })).filter(r => r.fazenda);
  }
  
  function _plsNormalizarDist(rows) {
    if (!rows || !rows.length) return [];
    const header = rows[0].map(v => _norm(String(v||'')));
    const dataRows = rows.slice(1);
    const iCod  = header.findIndex(v => v.includes('COD'));
    const iDesc = header.findIndex(v => v.startsWith('DESC'));
    const iDist = header.findIndex(v => v.includes('DISTANCIA'));
    
    return dataRows.map(r => ({
      codFazenda: String(iCod >= 0 ? r[iCod] : '').trim(),
      fazenda: String(iDesc >= 0 ? r[iDesc] : '').trim(),
      distancia: _num(iDist >= 0 ? r[iDist] : ''),
    })).filter(r => r.fazenda);
  }
  
  function _plsExtrairFazenda(desc) {
    const s = String(desc || '').trim();
    const m = s.match(/^(\d+)\s-\s*(.+)$/);
    if (m) return { cod: m[1], nome: m[2].trim() };
    return { cod: '', nome: s };
  }
  
  function _plsStatusTalhao(frente, fazenda, talhao, codFazenda) {
    const rows = window._gatecDados;
    if (!rows || !rows.length) return 'pendente';
    
    const talhaoNorm = String(talhao).trim().replace(/^0+/, '') || '0';
    const codNorm = String(codFazenda || '').trim().replace(/^0+/, '');
    const fazendaNomeNorm = _norm(fazenda);
    
    const match = rows.find(row => {
      const rFrente = String(row['FRENTE'] || '').trim();
      if (rFrente !== String(frente).trim()) return false;
      
      const rFazendaRaw = String(row['DESC.FAZENDA'] || '').trim();
      const { cod: rCod, nome: rNome } = _plsExtrairFazenda(rFazendaRaw);
      const rCodNorm = rCod.replace(/^0+/, '');
      
      const bateCod = codNorm && rCodNorm && codNorm === rCodNorm;
      const bateNome = _norm(rNome) === fazendaNomeNorm;
      if (!bateCod && !bateNome) return false;
      
      const rTalhoes = String(row['LISTAGEM TALHAO'] || '');
      const talhoesArr = rTalhoes.split(/[,;\s]+/).map(t => t.trim().replace(/^0+/, '') || '0').filter(Boolean);
      return talhoesArr.includes(talhaoNorm);
    });
    
    if (!match) return 'pendente';
    const status = String(match['STATUS OS'] || '').toUpperCase();
    if (status.includes('ENCERRADA')) return 'encerrada';
    return 'aberta';
  }
  
  window.plsDebugStatus = function() {
    const rows = window._gatecDados;
    if (!rows || !rows.length) { console.log('window._gatecDados vazio ou não carregado'); return; }
    console.group('[PLS DEBUG] Amostra de Liberações (_gatecDados)');
    rows.slice(0, 5).forEach(r => console.log({ FRENTE: r['FRENTE'], 'DESC.FAZENDA': r['DESC.FAZENDA'], 'LISTAGEM TALHAO': r['LISTAGEM TALHAO'], 'STATUS OS': r['STATUS OS'] }));
    console.groupEnd();
  };
  
  function _plsRenderizarTudo() {
    _plsRenderizarKpis();
    _plsPopularBuscaFazenda();
    filtrarPlanejamentoTimeline();
  }
  
  function _plsRenderizarKpis() {
    const cont = document.getElementById('pls-kpi-grid');
    if (!cont) return;
    
    let html = '';
    ['401','402','403','404'].forEach(frente => {
      const dados = _plsDados[frente];
      if (!dados.length) return;
      
      const tchVals = dados.map(r => r.tch).filter(v => !isNaN(v) && v > 0);
      const tchMedio = tchVals.length ? tchVals.reduce((s,v) => s+v,0) / tchVals.length : NaN;
      
      let sumTcTiro = 0, sumTc = 0;
      dados.forEach(r => {
        const tc = isNaN(r.tc) ? 0 : r.tc;
        const tm = isNaN(r.tiroMedio) ? 0 : r.tiroMedio;
        if (tc > 0 && tm > 0) { sumTcTiro += tc * tm; sumTc += tc; }
      });
      const tiroMedioFrente = sumTc > 0 ? sumTcTiro / sumTc : NaN;
      
      let jaColhidos = 0, jaLiberados = 0;
      dados.forEach(r => {
        const st = _plsStatusTalhao(frente, r.fazenda, r.talhao, r.codFazenda);
        if (st === 'encerrada') jaColhidos++;
        else if (st === 'aberta') jaLiberados++;
      });
      
      const pct = dados.length > 0 ? (jaColhidos / dados.length * 100) : 0;
      
      html += `<div class="pls-kpi-card">
        <div class="pls-kpi-frente">FRENTE ${frente}</div>
        <div class="pls-kpi-linha"><span>Talhões</span><b>${dados.length}</b></div>
        <div class="pls-kpi-linha"><span>TCH médio est.</span><b>${!isNaN(tchMedio) ? formatarNumeroCurto(tchMedio) : '—'}</b></div>
        <div class="pls-kpi-linha"><span>Tiro médio</span><b>${!isNaN(tiroMedioFrente) ? formatarNumeroCurto(tiroMedioFrente)+' m' : '—'}</b></div>
        <div class="pls-kpi-progress-bg"><div class="pls-kpi-progress-fill" style="width:${pct.toFixed(1)}%"></div></div>
        <div class="pls-kpi-pct">${jaColhidos} colhidos · ${jaLiberados} em aberto · ${pct.toFixed(1)}%</div>
      </div>`;
    });
    cont.innerHTML = html;
  }
  
  function filtrarPlanejamentoTimeline() {
    const frente = document.getElementById('pls-filtro-frente')?.value || '401';
    const statusFiltro = document.getElementById('pls-filtro-status')?.value || '';
    const cont = document.getElementById('pls-timeline-container');
    const contador = document.getElementById('pls-timeline-contador');
    
    if (!cont) return;
    
    const dados = (_plsDados[frente] || []).slice().sort((a,b) => a.seq - b.seq);
    const comStatus = dados.map(r => ({ ...r, status: _plsStatusTalhao(frente, r.fazenda, r.talhao, r.codFazenda) }));
    const filtrado = statusFiltro ? comStatus.filter(r => r.status === statusFiltro) : comStatus;
    
    if (contador) contador.textContent = `${filtrado.length} talhão${filtrado.length !== 1 ? 'ões' : ''} · Frente ${frente}`;
    
    if (!filtrado.length) {
      cont.innerHTML = '<div class="pla-empty"><i class="fas fa-route"></i>Nenhum talhão encontrado para este filtro.</div>';
      return;
    }
    
    const porFaz = {};
    filtrado.forEach(r => {
      const key = r.codFazenda ? `${r.codFazenda} · ${r.fazenda}` : r.fazenda;
      if (!porFaz[key]) porFaz[key] = { talhoes: [], minSeq: r.seq };
      porFaz[key].talhoes.push(r);
      if (r.seq < porFaz[key].minSeq) porFaz[key].minSeq = r.seq;
    });
    
    const statusLabel = { aberta: 'Liberado', encerrada: 'Colhido', pendente: 'Não liberado' };
    const fazSorted = Object.entries(porFaz).sort((a,b) => a[1].minSeq - b[1].minSeq);
    
    let html = '';
    fazSorted.forEach(([fazNome, { talhoes }], idxFaz) => {
      const idBody = `pls-faz-body-${idxFaz}`;
      const colhidos = talhoes.filter(r => r.status === 'encerrada').length;
      const liberados = talhoes.filter(r => r.status === 'aberta').length;
      const pendentes = talhoes.filter(r => r.status === 'pendente').length;
      
      const chipsHtml = (colhidos > 0 ? `<span class="pls-tl-status-badge encerrada">${colhidos} colhido${colhidos>1?'s':''}</span>` : '') +
        (liberados > 0 ? `<span class="pls-tl-status-badge aberta" style="margin-left:4px">${liberados} liberado${liberados>1?'s':''}</span>` : '') +
        (pendentes > 0 ? `<span class="pls-tl-status-badge pendente" style="margin-left:4px">${pendentes} pendente${pendentes>1?'s':''}</span>` : '');
        
      let talhoesHtml = '';
      talhoes.forEach(r => {
        talhoesHtml += `<div class="pls-timeline-item status-${r.status}" style="margin-bottom:4px;">
          <div class="pls-tl-row1">
            <span class="pls-tl-seq">#${r.seq}</span>
            <span class="pls-tl-faz">Talhão ${r.talhao}</span>
            <span class="pls-tl-data">${_fmtData(r.data)}</span>
          </div>
          <div class="pls-tl-row2">
            ${!isNaN(r.tch) ? `<span><b>TCH</b> ${formatarNumeroCurto(r.tch)}</span>` : ''}
            ${!isNaN(r.moagem) ? `<span><b>Moagem</b> ${formatarNumeroCurto(r.moagem)} mil t</span>` : ''}
            ${!isNaN(r.tiroMedio) ? `<span><b>Tiro médio</b> ${formatarNumeroCurto(r.tiroMedio)} m</span>` : ''}
            ${r.variedade ? `<span><b>Var.</b> ${r.variedade}</span>` : ''}
            <span class="pls-tl-status-badge ${r.status}">${statusLabel[r.status]}</span>
          </div>
        </div>`;
      });
      
      html += `<div class="pla-pipeline-fazenda" style="margin-bottom:8px;">
        <div class="pla-pipeline-header" onclick="plsToggleFazenda('${idBody}', this)">
          <span class="pla-pipeline-fazenda-nome">
            <i class="fas fa-map-marker-alt" style="margin-right:6px;color:var(--text-3);font-size:10px;"></i>${fazNome}
            <span style="font-size:10px;font-weight:600;color:var(--text-3);margin-left:4px;">(${talhoes.length} ${talhoes.length===1?'talhão':'talhões'})</span>
          </span>
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
            ${chipsHtml}<i class="fas fa-chevron-down" style="font-size:10px;color:var(--text-3);margin-left:4px;"></i>
          </div>
        </div>
        <div class="pla-pipeline-talhoes" id="${idBody}" style="padding:8px;">${talhoesHtml}</div>
      </div>`;
    });
    cont.innerHTML = html;
  }
  
  window.plsToggleFazenda = function(id, headerEl) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('open');
    const ch = headerEl?.querySelector('.fa-chevron-down');
    if (ch) ch.style.transform = el.classList.contains('open') ? 'rotate(180deg)' : '';
  };
  
  window.plsModoTalhao = function(modo) {
    document.getElementById('pls-modo-unico')?.classList.toggle('active', modo === 'unico');
    document.getElementById('pls-modo-intervalo')?.classList.toggle('active', modo === 'intervalo');
    const elU = document.getElementById('pls-busca-modo-unico');
    const elI = document.getElementById('pls-busca-modo-intervalo');
    if (elU) elU.style.display = modo === 'unico' ? 'block' : 'none';
    if (elI) elI.style.display = modo === 'intervalo' ? 'block' : 'none';
    const r = document.getElementById('pls-busca-resultado');
    if (r) r.innerHTML = '';
  };
  
  function _plsPopularBuscaFazenda() {
    const sel = document.getElementById('pls-busca-fazenda');
    if (!sel) return;
    
    const todasFazendas = new Set();
    ['401','402','403','404'].forEach(f => {
      _plsDados[f].forEach(r => {
        const nome = r.codFazenda ? `${r.codFazenda} · ${r.fazenda}` : r.fazenda;
        if (nome) todasFazendas.add(nome);
      });
    });
    
    const lista = [...todasFazendas].sort((a,b) => {
      const na = parseInt(a), nb = parseInt(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b,'pt-BR');
    });
    
    sel.innerHTML = '<option value="">— Selecione a fazenda —</option>' + lista.map(f => `<option value="${f}">${f}</option>`).join('');
  }
  
  function popularTalhoesBusca() {
    const fazendaSel = document.getElementById('pls-busca-fazenda')?.value || '';
    const selTalhao  = document.getElementById('pls-busca-talhao');
    const resultDiv  = document.getElementById('pls-busca-resultado');
    
    if (selTalhao) selTalhao.innerHTML = '<option value="">— Selecione o talhão —</option>';
    if (resultDiv) resultDiv.innerHTML = '';
    if (!fazendaSel) return;
    
    const nomeSemCod = fazendaSel.includes(' · ') ? fazendaSel.split(' · ')[1] : fazendaSel;
    const talhoes = new Set();
    
    ['401','402','403','404'].forEach(f => {
      _plsDados[f].forEach(r => { if (_norm(r.fazenda) === _norm(nomeSemCod)) talhoes.add(r.talhao); });
    });
    
    const lista = [...talhoes].sort((a,b) => (parseInt(a)||0)-(parseInt(b)||0));
    if (selTalhao) selTalhao.innerHTML += lista.map(t => `<option value="${t}">Talhão ${t}</option>`).join('');
  }
  
  function _plsCardTalhao(r, frenteEncontrada, nomeSemCod) {
    const status = _plsStatusTalhao(frenteEncontrada, r.fazenda, r.talhao, r.codFazenda);
    const statusLabel = { aberta: 'Liberado (OS aberta)', encerrada: 'Já colhido', pendente: 'Ainda não liberado' };
    const distInfo = _plsDist.find(d => _norm(d.fazenda) === _norm(nomeSemCod));
    const tiroInfo = _plsTiro.find(d => _norm(d.fazenda) === _norm(nomeSemCod));
    
    return `<div class="pls-busca-resultado" style="margin-top:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:12px;font-weight:800;color:var(--text);">Frente ${frenteEncontrada} · Tal. ${r.talhao}</span>
        <span class="pls-tl-status-badge ${status}">${statusLabel[status]}</span>
      </div>
      <div class="pls-busca-grid">
        <div class="pls-busca-col">
          <div class="pls-busca-col-title">Planejamento</div>
          <div class="pls-busca-linha"><span>Sequência</span><b>#${r.seq}</b></div>
          <div class="pls-busca-linha"><span>Data prevista</span><b>${_fmtData(r.data)}</b></div>
          <div class="pls-busca-linha"><span>Variedade</span><b>${r.variedade||'—'}</b></div>
          <div class="pls-busca-linha"><span>TCH est.</span><b>${!isNaN(r.tch) ? formatarNumeroCurto(r.tch) : '—'}</b></div>
          <div class="pls-busca-linha"><span>Moagem</span><b>${!isNaN(r.moagem) ? formatarNumeroCurto(r.moagem)+' mil t' : '—'}</b></div>
        </div>
        <div class="pls-busca-col">
          <div class="pls-busca-col-title">Logística</div>
          <div class="pls-busca-linha"><span>Tiro médio</span><b>${!isNaN(r.tiroMedio) ? formatarNumeroCurto(r.tiroMedio)+' m' : '—'}</b></div>
          <div class="pls-busca-linha"><span>Tiro pond. faz.</span><b>${tiroInfo&&!isNaN(tiroInfo.tiroMedioPond) ? formatarNumeroCurto(tiroInfo.tiroMedioPond)+' m' : '—'}</b></div>
          <div class="pls-busca-linha"><span>Dist. usina</span><b>${distInfo&&!isNaN(distInfo.distancia) ? formatarNumeroCurto(distInfo.distancia)+' km' : '—'}</b></div>
          <div class="pls-busca-linha"><span>Raio</span><b>${!isNaN(r.raio) ? formatarNumeroCurto(r.raio) : '—'}</b></div>
        </div>
      </div>
    </div>`;
  }
  
  function buscarTalhaoPlanejamento() {
    const fazendaSel = document.getElementById('pls-busca-fazenda')?.value || '';
    const talhaoSel  = document.getElementById('pls-busca-talhao')?.value || '';
    const resultDiv  = document.getElementById('pls-busca-resultado');
    
    if (!resultDiv || !fazendaSel || !talhaoSel) { if (resultDiv) resultDiv.innerHTML = ''; return; }
    
    const nomeSemCod = fazendaSel.includes(' · ') ? fazendaSel.split(' · ')[1] : fazendaSel;
    let encontrado = null, frenteEncontrada = null;
    
    for (const f of ['401','402','403','404']) {
      const m = _plsDados[f].find(r => _norm(r.fazenda) === _norm(nomeSemCod) && r.talhao === talhaoSel);
      if (m) { encontrado = m; frenteEncontrada = f; break; }
    }
    
    if (!encontrado) {
      resultDiv.innerHTML = '<div class="pla-empty"><i class="fas fa-search"></i>Talhão não encontrado.</div>';
      return;
    }
    
    resultDiv.innerHTML = _plsCardTalhao(encontrado, frenteEncontrada, nomeSemCod);
  }
  
  window.buscarIntervaloPlanejamento = function() {
    const fazendaSel = document.getElementById('pls-busca-fazenda')?.value || '';
    const de  = parseInt(document.getElementById('pls-intervalo-de')?.value);
    const ate = parseInt(document.getElementById('pls-intervalo-ate')?.value);
    const resultDiv = document.getElementById('pls-busca-resultado');
    
    if (!resultDiv) return;
    if (!fazendaSel || isNaN(de) || isNaN(ate) || de > ate) { resultDiv.innerHTML = ''; return; }
    
    const nomeSemCod = fazendaSel.includes(' · ') ? fazendaSel.split(' · ')[1] : fazendaSel;
    const encontrados = [];
    
    for (const f of ['401','402','403','404']) {
      _plsDados[f]
        .filter(r => _norm(r.fazenda) === _norm(nomeSemCod))
        .filter(r => { const n = parseInt(r.talhao); return n >= de && n <= ate; })
        .forEach(r => encontrados.push({ ...r, frenteEncontrada: f }));
    }
    
    encontrados.sort((a,b) => (parseInt(a.talhao)||0)-(parseInt(b.talhao)||0));
    
    if (!encontrados.length) {
      resultDiv.innerHTML = '<div class="pla-empty"><i class="fas fa-search"></i>Nenhum talhão no intervalo.</div>';
      return;
    }
    
    resultDiv.innerHTML = `<div style="font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px;margin:10px 0 6px;">${encontrados.length} talhão${encontrados.length>1?'ões':'ão'} encontrado${encontrados.length>1?'s':''}</div>` +
      encontrados.map(r => _plsCardTalhao(r, r.frenteEncontrada, nomeSemCod)).join('');
  };
})();

/* ══════════════════════════════════════════════
MÓDULO PLANTIO
══════════════════════════════════════════════ */
(function() {
  'use strict';
  const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTIIUGH-g6vlowVBAAkgoPwZd1EPJPJS8PzgOEWyDPito38Ii8qzOHaSh1PioGGMLNbwFJPDMzwsA7/pub';
  const URLS = {
    '26_27': { diario: BASE_URL + '?gid=409434796&single=true&output=csv', base: BASE_URL + '?gid=1046721215&single=true&output=csv' },
    '25_26': { diario: BASE_URL + '?gid=1655110352&single=true&output=csv', base: BASE_URL + '?gid=1840703975&single=true&output=csv' },
  };
  const URL_PCP = BASE_URL + '?gid=724202507&single=true&output=csv';
  const MESES_NOME = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  
  const _cache = {
    '26_27': { diario: null, base: null, loaded: false },
    '25_26': { diario: null, base: null, loaded: false },
  };
  
  let _safraAtual  = null;
  let _compararAberto = false;
  let _ultimoComparativoMeses = null;
  
  const _d = () => _cache[_safraAtual]?.diario || [];
  const _b = () => _cache[_safraAtual]?.base   || [];
  
  window.iniciarModuloPlantio    = iniciarModuloPlantio;
  window.plantioAbrirSafra       = plantioAbrirSafra;
  window.plantioVoltarSeletor    = plantioVoltarSeletor;
  window.plantioAbrirComparar    = plantioAbrirComparar;
  window.carregarDadosPlantio    = carregarDadosPlantio;
  window.filtrarPlantioAvanco    = filtrarPlantioAvanco;
  window.filtrarPlantioComparar  = filtrarPlantioComparar;
  window.togglePlantioCard       = togglePlantioCard;
  window.plantioSelecionarTalhao   = plantioSelecionarTalhao;
  window.plantioSelecionarFazenda  = plantioSelecionarFazenda;
  window.plantioToggleNaoIniciadas = plantioToggleNaoIniciadas;
  window.atualizarCardPlantioHome  = atualizarCardPlantioHome;
  window._garantirSafraCarregada   = _garantirSafraCarregada;
  
  window.plantioDebug = function() {
    const safras = ['26_27','25_26'];
    safras.forEach(s => {
      const d = _cache[s].diario || [];
      const b = _cache[s].base   || [];
      const haD = d.reduce((acc,r) => acc + r.area, 0);
      const haB = b.reduce((acc,r) => acc + r.area, 0);
      console.group(`[PLANTIO DEBUG] ${s}`);
      console.log(`Diário: ${d.length} registros, total = ${formatarNumeroCurto(haD)} ha`);
      console.log(`Base: ${b.length} talhões, total = ${formatarNumeroCurto(haB)} ha`);
      console.groupEnd();
    });
  };
  
  function iniciarModuloPlantio() {
    _carregarSubTextosSafra();
  }
  
  function plantioAbrirSafra(safra) {
    _safraAtual = safra;
    _compararAberto = false;
    document.getElementById('plantio-seletor-safra').style.display = 'none';
    document.getElementById('plantio-comparar').style.display      = 'none';
    document.getElementById('plantio-conteudo').style.display      = 'block';
    document.getElementById('plantio-safra-label').textContent     = safra === '26_27' ? 'Safra 26/27' : 'Safra 25/26';
    
    if (!_cache[safra].loaded) {
      carregarDadosPlantio();
    } else {
      _renderizarTudo();
    }
  }
  
  function plantioVoltarSeletor() {
    document.getElementById('plantio-seletor-safra').style.display = 'flex';
    document.getElementById('plantio-conteudo').style.display      = 'none';
    document.getElementById('plantio-comparar').style.display      = 'none';
    _compararAberto = false;
  }
  
  function plantioAbrirComparar() {
    _compararAberto = true;
    document.getElementById('plantio-seletor-safra').style.display = 'none';
    document.getElementById('plantio-conteudo').style.display      = 'none';
    document.getElementById('plantio-comparar').style.display      = 'block';
    _garantirSafraCarregada('25_26');
    _garantirSafraCarregada('26_27');
  }
  
  async function _carregarSubTextosSafra() {
    Promise.all([ _garantirSafraCarregada('25_26'), _garantirSafraCarregada('26_27') ]);
  }
  
  function _plantioTxtOuNull(v) {
    const s = (v ?? '').toString().trim();
    return s === '' ? null : s;
  }
  
  function _plantioDataISO(d) {
    if (!d || !(d instanceof Date) || isNaN(d)) return null;
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  
  async function _plantioSha256Hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  async function _plantioMontarRegistroDiario(r, safra) {
    const reg = {
      safra, data_plantio: _plantioDataISO(r.data), cod_fazenda: _plantioTxtOuNull(r.codFazenda),
      desc_fazenda: _plantioTxtOuNull(r.fazenda), talhao: _plantioTxtOuNull(r.talhao),
      area: isNaN(r.area) ? null : r.area, tipo_plantio: _plantioTxtOuNull(r.tipo), variedade: _plantioTxtOuNull(r.variedade),
    };
    reg.linha_hash = await _plantioSha256Hex(Object.keys(reg).sort().map(k => `${k}=${reg[k] ?? ''}`).join('|'));
    return reg;
  }
  
  async function _plantioMontarRegistroBase(r, safra) {
    const reg = {
      safra, cod_fazenda: _plantioTxtOuNull(r.codFazenda), desc_fazenda: _plantioTxtOuNull(r.fazenda),
      talhao: _plantioTxtOuNull(r.talhao), variedade_atual: _plantioTxtOuNull(r.variedade),
      ambiente: _plantioTxtOuNull(r.ambiente), area_total: isNaN(r.area) ? null : r.area,
      estagio: _plantioTxtOuNull(r.estagio), ref_ciclo: _plantioTxtOuNull(r.refCiclo),
      motivo_reforma: _plantioTxtOuNull(r.motivo), modelo_plantio: _plantioTxtOuNull(r.modelo),
      frente: _plantioTxtOuNull(r.frente), data_plantio: _plantioDataISO(r.dataPlant),
      mes_plantio: r.mes || null, tipo_plantio: _plantioTxtOuNull(r.tipo),
    };
    reg.linha_hash = await _plantioSha256Hex(Object.keys(reg).sort().map(k => `${k}=${reg[k] ?? ''}`).join('|'));
    return reg;
  }
  
  async function _plantioEnviarLotes(tabela, registros) {
    const LOTE = 300;
    for (let i = 0; i < registros.length; i += LOTE) {
      const lote = registros.slice(i, i + LOTE);
      const { error } = await _sbClient.from(tabela).upsert(lote, { onConflict: 'linha_hash' });
      if (error) console.error(`[Plantio→Supabase] erro lote ${tabela} ${i}`, error);
    }
  }
  
  async function sincronizarPlantioSupabase() {
    if (typeof _sbClient === 'undefined') { if (typeof showToast === 'function') showToast('⚠️ Cliente Supabase não encontrado.', 'error', 3000); return; }
    
    const btn = document.getElementById('btn-plantio-sync-supabase');
    if (btn) { btn.disabled = true; btn.dataset.textoOriginal = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    
    try {
      for (const safra of ['26_27', '25_26']) {
        const [rDiario, rBase] = await Promise.all([ _parseCsvSemHeader(URLS[safra].diario), _parseCsvSemHeader(URLS[safra].base) ]);
        const diarioNorm = _normalizarDiario(rDiario);
        const baseNorm   = _normalizarBase(rBase);
        const regsDiario = await Promise.all(diarioNorm.map(r => _plantioMontarRegistroDiario(r, safra)));
        const regsBase   = await Promise.all(baseNorm.map(r => _plantioMontarRegistroBase(r, safra)));
        await _plantioEnviarLotes('plantio_diario', regsDiario);
        await _plantioEnviarLotes('plantio_base', regsBase);
      }
      
      if (typeof showToast === 'function') showToast('✅ Plantio sincronizado com o Supabase!', 'success', 4000);
      _cache[_safraAtual].loaded = false;
      await _garantirSafraCarregada(_safraAtual);
      if (_cache[_safraAtual].loaded) _renderizarTudo();
    } catch (e) {
      console.error('[Plantio→Supabase] erro geral', e);
      if (typeof showToast === 'function') showToast('❌ Erro ao sincronizar Plantio — veja o console (F12).', 'error', 5000);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.textoOriginal || '<i class="fas fa-cloud-arrow-up"></i>'; }
    }
  }
  window.sincronizarPlantioSupabase = sincronizarPlantioSupabase;
  
  async function _plantioBuscarSupabase(tabela, safra) {
    const PAGINA = 1000;
    let de = 0, todas = [];
    while (true) {
      const { data, error } = await _sbClient.from(tabela).select('*').eq('safra', safra).order('id', { ascending: true }).range(de, de + PAGINA - 1);
      if (error) throw error;
      if (!data || !data.length) break;
      todas.push(...data);
      if (data.length < PAGINA) break;
      de += PAGINA;
    }
    return todas;
  }
  
  function _plantioParseDataSupa(s) {
    if (!s) return null;
    const d = new Date(s + 'T00:00:00');
    return isNaN(d) ? null : d;
  }
  
  async function _plantioCarregarDiarioSupabase(safra) {
    const brutos = await _plantioBuscarSupabase('plantio_diario', safra);
    return brutos.map(r => ({
      data: _plantioParseDataSupa(r.data_plantio), codFazenda: r.cod_fazenda || '', fazenda: r.desc_fazenda || '',
      talhao: r.talhao || '', area: parseFloat(r.area) || 0, tipo: r.tipo_plantio || 'Mecanizado', variedade: r.variedade || '',
    })).filter(r => r.data && r.area > 0);
  }
  
  async function _plantioCarregarBaseSupabase(safra) {
    const brutos = await _plantioBuscarSupabase('plantio_base', safra);
    return brutos.map(r => ({
      codFazenda: r.cod_fazenda || '', fazenda: r.desc_fazenda || '', talhao: r.talhao || '',
      variedade: r.variedade_atual || '', ambiente: r.ambiente || '', area: parseFloat(r.area_total) || 0,
      estagio: r.estagio || '', refCiclo: r.ref_ciclo || '', motivo: r.motivo_reforma || '', modelo: r.modelo_plantio || '',
      frente: r.frente || '', dataPlant: _plantioParseDataSupa(r.data_plantio), mes: r.mes_plantio || 0, tipo: r.tipo_plantio || '',
    })).filter(r => r.fazenda);
  }
  
  async function _garantirSafraCarregada(safra) {
    if (_cache[safra].loaded) return;
    try {
      const [diarioNorm, baseNorm] = await Promise.all([ _plantioCarregarDiarioSupabase(safra), _plantioCarregarBaseSupabase(safra) ]);
      _cache[safra].diario = diarioNorm;
      _cache[safra].base   = baseNorm;
      _cache[safra].loaded = true;
      _atualizarSubTextoSafra(safra);
      if (typeof registrarSync === 'function') registrarSync('ok', 'Plantio ' + safra.replace('_','/'));
    } catch(err) {
      console.error('[PLANTIO]', safra, err);
    }
  }
  
  async function carregarDadosPlantio() {
    ['pla-resumo-container'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<div class="pla-empty"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
    });
    _cache[_safraAtual].loaded = false;
    await _garantirSafraCarregada(_safraAtual);
    if (_cache[_safraAtual].loaded) _renderizarTudo();
  }
  
  function _atualizarSubTextoSafra(safra) {
    const base = _cache[safra].base || [];
    const diario = _cache[safra].diario || [];
    const fazendas = new Set(base.map(r => r.fazenda).filter(Boolean));
    const totalHa  = base.reduce((s, r) => s + r.area, 0);
    const plantHa  = diario.reduce((s, r) => s + r.area, 0);
    
    const elId = safra === '26_27' ? 'psb-sub-2627' : 'psb-sub-2526';
    const el = document.getElementById(elId);
    if (el) el.textContent = `${fazendas.size} fazendas · ${formatarNumeroCurto(totalHa)} ha planejados`;
    atualizarCardPlantioHome();
  }
  
  function _parseCsvSemHeader(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, { download: true, header: false, skipEmptyLines: true, complete: r => resolve(r.data), error: e => reject(e) });
    });
  }
  
  function _parseCsvComHeader(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, { download: true, header: true, skipEmptyLines: true, complete: r => resolve(r.data), error: e => reject(e) });
    });
  }
  
  function _detectarHeader(rows, palavrasChave) {
    for (let i = 0; i < Math.min(8, rows.length); i++) {
      const vals = rows[i].map(v => String(v || ''));
      const hits = palavrasChave.filter(kw => vals.some(v => _norm(v).includes(_norm(kw)))).length;
      if (hits >= palavrasChave.length) return i;
    }
    return 0;
  }
  
  function _findIdx(headerRow, candidates) {
    for (const kw of candidates) {
      const kwn = _norm(kw);
      const idx = headerRow.findIndex(h => _norm(h) === kwn);
      if (idx >= 0) return idx;
    }
    for (const kw of candidates) {
      const kwn = _norm(kw);
      const idx = headerRow.findIndex(h => _norm(h).includes(kwn));
      if (idx >= 0) return idx;
    }
    return -1;
  }
  
  function _findCol(fields, candidates) {
    for (const kw of candidates) {
      const kwn = _norm(kw);
      const f = fields.find(c => _norm(c) === kwn);
      if (f) return f;
    }
    for (const kw of candidates) {
      const kwn = _norm(kw);
      const f = fields.find(c => _norm(c).includes(kwn));
      if (f) return f;
    }
    return '';
  }
  
  function _numArea(v) {
    if (v == null || v === '') return NaN;
    return parseFloat(String(v).trim().replace(',', '.'));
  }
  
  function _nomeFaz(cod, nome) {
    const c = String(cod || '').trim();
    const n = String(nome || '').trim();
    if (!n) return c || '—';
    if (!c || c === '0' || c === 'nan') return n;
    return `${c} · ${n}`;
  }
  
  function _fmtHa(v) {
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    return n.toFixed(2).replace('.', ',') + ' ha';
  }
  
  function _val(row, idx) {
    return idx >= 0 && idx < row.length ? String(row[idx] || '').trim() : '';
  }
  
  function _normalizarDiario(rows) {
    if (!rows || !rows.length) return [];
    let headerLine = -1;
    for (let i = 0; i < Math.min(4, rows.length); i++) {
      const vals = rows[i].map(v => _norm(String(v||'')));
      if (vals.some(v => v === 'DATA') && vals.some(v => v === 'AREA') && vals.some(v => v.startsWith('DESCRI'))) {
        headerLine = i; break;
      }
    }
    if (headerLine < 0) { console.warn('[PLANTIO] Header diário não encontrado, usando 0'); headerLine = 0; }
    
    const header   = rows[headerLine].map(v => _norm(String(v||'')));
    const dataRows = rows.slice(headerLine + 1);
    
    const iData      = header.findIndex(v => v === 'DATA');
    const iDescricao = header.findIndex(v => v.startsWith('DESCRI') && !v.includes('3'));
    const iTalhao    = header.findIndex(v => (v === 'TALHAO') && !v.includes('4'));
    const iArea      = header.findIndex(v => v === 'AREA');
    const iLocalCod  = header.findIndex(v => v === 'LOCAL' && !v.includes('2'));
    const iPlantio   = header.findIndex(v => v === 'PLANTIO');
    const iVariedade = header.findIndex(v => v === 'VARIEDADE');
    
    return dataRows.map(r => {
      if (!r || r.length < 5) return null;
      const unidade = String(r[1] || '').trim();
      if (!unidade || _norm(unidade) === '' || _norm(unidade) === 'UNIDADE') return null;
      
      const area = _numArea(iArea >= 0 ? r[iArea] : r[9]);
      if (isNaN(area) || area <= 0) return null;
      
      let data = null;
      const rawData = iData >= 0 ? r[iData] : r[3];
      if (rawData instanceof Date || (typeof rawData === 'object' && rawData !== null)) {
        data = new Date(rawData);
      } else {
        data = _parseData(String(rawData || ''));
      }
      if (!data || isNaN(data.getTime())) return null;
      
      return {
        data, codFazenda: String(iLocalCod >= 0 ? r[iLocalCod] : '').trim(),
        fazenda: String(iDescricao >= 0 ? r[iDescricao] : '').trim(),
        talhao: String(iTalhao >= 0 ? r[iTalhao] : '').trim(),
        area, tipo: String(iPlantio >= 0 ? r[iPlantio] : 'Mecanizado').trim() || 'Mecanizado',
        variedade: String(iVariedade >= 0 ? r[iVariedade] : '').trim(),
      };
    }).filter(Boolean);
  }
  
  function _normalizarBase(rows) {
    if (!rows || !rows.length) return [];
    let headerLine = -1;
    for (let i = 0; i < Math.min(8, rows.length); i++) {
      const vals = rows[i].map(v => _norm(String(v||'')));
      if (vals.includes('UNIDADE') && vals.some(v => v.startsWith('DESCRI')) && vals.some(v => v.startsWith('TALH'))) {
        headerLine = i; break;
      }
    }
    if (headerLine < 0) { console.warn('[PLANTIO] Header base não encontrado'); headerLine = 0; }
    
    const header   = rows[headerLine].map(v => _norm(String(v||'')));
    const dataRows = rows.slice(headerLine + 1);
    
    const iLocal    = header.findIndex(v => v === 'LOCAL');
    const iDescricao= header.findIndex(v => v.startsWith('DESCRI') && !v.includes('3'));
    const iTalhao   = header.findIndex(v => v === 'TALHAO' && !v.includes('4'));
    const iVarAtual = header.findIndex(v => v.includes('VARIEDADE') && (v.includes('ATUAL') || v.includes('PRINCIPAL')));
    const iAmbiente = header.findIndex(v => v === 'AMBIENTE');
    const iAreaTot  = header.findIndex(v => v.includes('REA') && v.includes('TOTAL'));
    const iEstagio  = header.findIndex(v => v.includes('ESTAGIO'));
    const iRefCiclo = header.findIndex(v => v.includes('REF') && v.includes('CICLO'));
    const iMotivo   = header.findIndex(v => v.includes('MOTIVO') && v.includes('REF'));
    const iModelo   = header.findIndex(v => v.includes('MODELO') && v.includes('PLANTIO'));
    const iFrente   = header.findIndex(v => v === 'FRENTE');
    const iDataPl   = header.findIndex(v => v.includes('DATA') && v.includes('PLANTIO') && !v.includes('RUA') && !v.includes('MAE') && !v.includes('PREP'));
    const iMes      = header.findIndex(v => v.includes('MES') && v.includes('PLANTIO') && !v.includes('MAE') && !v.includes('PREP'));
    const iTipo     = header.findIndex(v => v.includes('TIPO') && v.includes('PLANTIO') && v.includes('DESDOBRA'));
    
    const _limpa = v => {
      const s = String(v || '').trim();
      const n = _norm(s);
      if (!s || n === '' || n === 'NAN' || n === 'NAOCADASTRADO' || n === 'ADEFINIR') return '';
      return s;
    };
    
    return dataRows.map(r => {
      if (!r || r.length < 5) return null;
      const unidade = String(r[1] || '').trim().toUpperCase();
      if (!unidade || unidade === 'UNIDADE' || unidade === '') return null;
      
      const area = _numArea(iAreaTot >= 0 ? r[iAreaTot] : r[20]);
      if (isNaN(area) || area <= 0) return null;
      
      const mesRaw = String(iMes >= 0 ? r[iMes] : '').trim().replace(',','.');
      const mes    = parseInt(mesRaw) || 0;
      
      let dataPlant = null;
      const rawDP = iDataPl >= 0 ? r[iDataPl] : null;
      if (rawDP) {
        if (rawDP instanceof Date || (typeof rawDP === 'object' && rawDP !== null)) {
          dataPlant = new Date(rawDP);
          if (isNaN(dataPlant.getTime())) dataPlant = null;
        } else {
          dataPlant = _parseData(String(rawDP));
        }
      }
      
      return {
        codFazenda: String(iLocal >= 0 ? r[iLocal] : '').trim(),
        fazenda: _limpa(iDescricao >= 0 ? r[iDescricao] : ''),
        talhao: String(iTalhao >= 0 ? r[iTalhao] : '').trim(),
        variedade: _limpa(iVarAtual >= 0 ? r[iVarAtual] : ''),
        ambiente: _limpa(iAmbiente >= 0 ? r[iAmbiente] : ''),
        area, estagio: _limpa(iEstagio >= 0 ? r[iEstagio] : ''),
        refCiclo: _limpa(iRefCiclo >= 0 ? r[iRefCiclo] : ''),
        motivo: _limpa(iMotivo >= 0 ? r[iMotivo] : ''),
        modelo: _limpa(iModelo >= 0 ? r[iModelo] : ''),
        frente: _limpa(iFrente >= 0 ? r[iFrente] : ''),
        dataPlant, mes, tipo: _limpa(iTipo >= 0 ? r[iTipo] : ''),
      };
    }).filter(r => r !== null && r.fazenda);
  }
  
  function _normalizarPcp(rows) {
    if (!rows || !rows.length) return [];
    const fields = Object.keys(rows[0]);
    const cData    = _findCol(fields, ['DATA APLICACAO','DATA APLIC','DATA']);
    const cCodOp   = _findCol(fields, ['COD OPERACAO','CODOP','COD OP','CODIGO OPERACAO','COD. OPERACAO']);
    const cFazenda = _findCol(fields, ['DESCRICAO FAZENDA','DESC FAZENDA','DESCFAZENDA','FAZENDA']);
    const cTalhao  = _findCol(fields, ['TALHAO','TALHÃO','TALHON']);
    
    return rows.map(r => {
      const codOp = String(r[cCodOp] || '').trim();
      if (!['1013','1014','1045'].includes(codOp)) return null;
      return { data: _parseData(r[cData]), codOp, fazenda: String(r[cFazenda] || '').trim(), talhao: String(r[cTalhao] || '').trim() };
    }).filter(r => r !== null && r.data);
  }
  
  function _renderizarTudo() {
    if (!_cache[_safraAtual].loaded) return;
    _renderizarKpis();
    _atualizarSubTextoSafra(_safraAtual);
    _popularFazendaSelect();
    filtrarPlantioAvanco();
    atualizarCardPlantioHome();
  }
  
  function _renderizarKpis() {
    const diario = _d();
    const base   = _b();
    const totalBase  = base.reduce((s, r) => s + r.area, 0);
    const totalPlant = diario.reduce((s, r) => s + r.area, 0);
    const pct        = totalBase > 0 ? Math.min((totalPlant / totalBase) * 100, 100) : 0;
    const agora      = new Date();
    const totalMes   = diario.filter(r => r.data && r.data.getMonth() === agora.getMonth() && r.data.getFullYear() === agora.getFullYear()).reduce((s, r) => s + r.area, 0);
    
    const $ = id => document.getElementById(id);
    if ($('pla-kpi-total'))    $('pla-kpi-total').textContent    = formatarNumeroCurto(totalBase) + ' ha';
    if ($('pla-kpi-plantado')) $('pla-kpi-plantado').textContent = formatarNumeroCurto(totalPlant) + ' ha';
    if ($('pla-kpi-mes'))      $('pla-kpi-mes').textContent      = formatarNumeroCurto(totalMes) + ' ha';
    if ($('pla-kpi-mes-sub'))  $('pla-kpi-mes-sub').textContent  = MESES_NOME[agora.getMonth() + 1] + '/' + agora.getFullYear();
    if ($('pla-progress-fill')) $('pla-progress-fill').style.width = pct.toFixed(1) + '%';
    if ($('pla-progress-pct'))  $('pla-progress-pct').textContent  = pct.toFixed(1) + '%';
  }
  
  function atualizarCardPlantioHome() {
    const diario = _cache['26_27'].diario || [];
    const base   = _cache['26_27'].base   || [];
    const totalBase  = base.reduce((s, r) => s + r.area, 0);
    const totalPlant = diario.reduce((s, r) => s + r.area, 0);
    const pct = totalBase > 0 ? Math.min((totalPlant / totalBase) * 100, 100) : 0;
    
    const pctEl = document.getElementById('hre-plantio-pct');
    const subEl = document.getElementById('hre-plantio-sub');
    const barEl = document.getElementById('hre-plantio-bar');
    
    if (pctEl) pctEl.textContent = pct.toFixed(1) + '%';
    if (subEl) subEl.textContent = _fmtHa(totalPlant) + ' de ' + _fmtHa(totalBase) + ' · 26/27';
    if (barEl) barEl.style.width = pct.toFixed(1) + '%';
  }
  
  function _normCod(c) {
    const s = String(c || '').trim().replace(/^0+/, '');
    return s || '0';
  }
  
  function _chaveFaz(cod, nome) {
    return _normCod(cod) + '|' + _norm(nome);
  }
  
  function _chaveTalhao(t) {
    const s = String(t || '').trim().replace(/^0+/, '');
    return s || String(t || '').trim();
  }
  
  function _popularFazendaSelect() {
    const sel = document.getElementById('pla-filtro-fazenda');
    if (!sel) return;
    
    const mapa = new Map();
    _b().forEach(r => {
      const k = _chaveFaz(r.codFazenda, r.fazenda);
      if (!mapa.has(k)) mapa.set(k, _nomeFaz(r.codFazenda, r.fazenda));
    });
    _d().forEach(r => {
      const k = _chaveFaz(r.codFazenda, r.fazenda);
      if (!mapa.has(k)) mapa.set(k, _nomeFaz(r.codFazenda, r.fazenda));
    });
    
    const fazendas = [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR', { sensitivity: 'base', numeric: true }));
    const anterior = sel.value;
    sel.innerHTML  = '<option value="">— Todas —</option>';
    
    fazendas.forEach(([chave, label]) => {
      const o = document.createElement('option');
      o.value = chave; o.textContent = label;
      if (chave === anterior) o.selected = true;
      sel.appendChild(o);
    });
  }
  
  let _mapaTalhoesAtual = [];
  let _rankingFazendasAtual = [];
  
  function filtrarPlantioAvanco() {
    _renderizarMapaPlantio();
  }
  
  function _montarTalhoesFazenda(fazendaChave) {
    const base   = _b().filter(r => _chaveFaz(r.codFazenda, r.fazenda) === fazendaChave);
    const diario = _d().filter(r => _chaveFaz(r.codFazenda, r.fazenda) === fazendaChave);
    const porTalhao = new Map();
    
    base.forEach(r => {
      const key = _chaveTalhao(r.talhao) || ('_' + porTalhao.size);
      const existente = porTalhao.get(key);
      if (existente) {
        existente.areaTotal += (r.area || 0);
      } else {
        porTalhao.set(key, {
          talhao: r.talhao || '—', status: 'pendente', areaTotal: r.area || 0, areaPlantada: 0,
          variedade: r.variedade, ultimaData: null, refCiclo: r.refCiclo, motivo: r.motivo, datas: []
        });
      }
    });
    
    diario.forEach(r => {
      const key = _chaveTalhao(r.talhao) || ('_d' + Math.random());
      const existente = porTalhao.get(key);
      if (existente) {
        existente.areaPlantada += (r.area || 0);
        existente.variedade     = r.variedade || existente.variedade;
        if (r.data) existente.datas.push(r.data);
      } else {
        porTalhao.set(key, {
          talhao: r.talhao || '—', status: 'ok', areaTotal: r.area, areaPlantada: r.area,
          variedade: r.variedade, ultimaData: r.data, refCiclo: '', motivo: '', datas: r.data ? [r.data] : []
        });
      }
    });
    
    const TOLERANCIA_HA = 0.05;
    porTalhao.forEach(t => {
      t.ultimaData = t.datas.length ? new Date(Math.max(...t.datas.map(d => d.getTime()))) : null;
      if (t.areaPlantada <= 0) {
        t.status = 'pendente';
      } else if (t.areaPlantada + TOLERANCIA_HA >= t.areaTotal) {
        t.status = 'ok';
      } else {
        t.status = 'parcial';
      }
    });
    
    const ordemStatus = { pendente: 0, parcial: 1, ok: 2 };
    return Array.from(porTalhao.values()).sort((a, b) =>
      (a.status === b.status) ? String(a.talhao).localeCompare(String(b.talhao), 'pt-BR', { numeric: true }) : ordemStatus[a.status] - ordemStatus[b.status]
    );
  }
  
  function _renderizarMapaPlantio() {
    const cont = document.getElementById('pla-resumo-container');
    if (!cont) return;
    
    const fazFiltro = document.getElementById('pla-filtro-fazenda')?.value || '';
    if (!fazFiltro) {
      _renderizarRankingFazendas(cont);
      return;
    }
    
    const talhoes = _montarTalhoesFazenda(fazFiltro);
    _mapaTalhoesAtual = talhoes;
    
    if (!talhoes.length) {
      cont.innerHTML = '<div class="pla-empty"><i class="fas fa-seedling"></i>Nenhum talhão encontrado para esta fazenda.</div>';
      return;
    }
    
    const totalPlanejado = talhoes.reduce((s, r) => s + (r.areaTotal || 0), 0);
    const totalPlantado  = talhoes.reduce((s, r) => s + (r.areaPlantada || 0), 0);
    const pct = totalPlanejado > 0 ? Math.min((totalPlantado / totalPlanejado) * 100, 100) : 0;
    
    const ciclos  = [...new Set(talhoes.map(r => r.refCiclo).filter(Boolean))];
    const motivos = [...new Set(talhoes.map(r => r.motivo).filter(Boolean))];
    
    let html = '';
    if (ciclos.length || motivos.length) {
      if (ciclos.length) html += `<div class="pla-mapa-tags-row"><span class="pla-mapa-tags-label">CICLO</span>${ciclos.map(c => `<span class="pla-mapa-tag">${c}</span>`).join('')}</div>`;
      if (motivos.length) html += `<div class="pla-mapa-tags-row"><span class="pla-mapa-tags-label">MOTIVO</span>${motivos.map(m => `<span class="pla-mapa-tag motivo${_norm(m) === 'EXPANSAO' ? ' expansao' : ''}">${m}</span>`).join('')}</div>`;
    }
    
    html += `
      <div class="pla-progress-wrap" style="margin:10px 0 12px;">
        <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:700; color:var(--text-3); margin-bottom:4px;">
          <span>PROGRESSO · ${talhoes.length} TALHÕES</span><span style="color:var(--green-900);">${pct.toFixed(0)}% · ${_fmtHa(totalPlantado)} de ${_fmtHa(totalPlanejado)}</span>
        </div>
        <div class="pla-progress-bg"><div class="pla-progress-fill" style="width:${pct.toFixed(1)}%"></div></div>
      </div>
      <div class="pla-mapa-legenda">
        <span><span class="pla-mapa-legenda-dot ok"></span>Plantado</span>
        <span><span class="pla-mapa-legenda-dot parcial"></span>Parcial</span>
        <span><span class="pla-mapa-legenda-dot pendente"></span>Pendente</span>
      </div>
      <div class="pla-mapa-grid">
        ${talhoes.map((t, i) => `
          <div class="pla-mapa-tile ${t.status}" onclick="plantioSelecionarTalhao(${i})">
            ${t.refCiclo ? `<div class="pla-mapa-tile-ciclo">${_abreviaCiclo(t.refCiclo)}</div>` : ''}
            <div class="pla-mapa-tile-id">${t.talhao}</div>
            <div class="pla-mapa-tile-sub">${t.status === 'pendente' ? 'pendente' : t.status === 'parcial' ? 'parcial' : (t.variedade || '—')}</div>
          </div>`).join('')}
      </div>
      <div class="pla-mapa-painel" id="pla-mapa-painel">Toque em um talhão para ver os detalhes</div>
    `;
    cont.innerHTML = html;
  }
  
  function _abreviaCiclo(c) {
    const s = String(c || '').trim();
    const mNum = s.match(/(\d+)/);
    if (mNum) return mNum[1] + 'M';
    return s.slice(0, 3).toUpperCase();
  }
  
  function plantioSelecionarTalhao(idx) {
    const t = _mapaTalhoesAtual[idx];
    const painel = document.getElementById('pla-mapa-painel');
    if (!t || !painel) return;
    
    const falta = Math.max(t.areaTotal - t.areaPlantada, 0);
    let statusHtml;
    
    if (t.status === 'ok') {
      statusHtml = `<div>Plantado em ${t.ultimaData ? _fmtData(t.ultimaData) : '—'}</div>`;
    } else if (t.status === 'parcial') {
      statusHtml = `<div style="color:var(--amber); font-weight:600;">Plantio parcial — última execução em ${t.ultimaData ? _fmtData(t.ultimaData) : '—'}</div>
        <div style="margin-top:2px;">Plantado: <b>${_fmtHa(t.areaPlantada)}</b> · Falta: <b style="color:var(--amber);">${_fmtHa(falta)}</b></div>`;
    } else {
      statusHtml = `<div class="pla-mapa-painel-pendente">Ainda não plantado — ${_fmtHa(t.areaTotal)} a plantar</div>`;
    }
    
    painel.innerHTML = `<div class="pla-mapa-painel-titulo">Talhão ${t.talhao} · ${_fmtHa(t.areaTotal || 0)}</div>
      <div style="margin-bottom:4px;">Variedade: <b>${t.variedade || '—'}</b>${t.refCiclo ? ` · Ciclo: <b>${t.refCiclo}</b>` : ''}</div>
      ${statusHtml}`;
  }
  
  function _renderizarRankingFazendas(cont) {
    const base   = _b();
    const diario = _d();
    if (!base.length) {
      cont.innerHTML = '<div class="pla-empty"><i class="fas fa-seedling"></i>Nenhum dado encontrado.</div>';
      return;
    }
    
    const porFaz = {};
    base.forEach(r => {
      const chave = _chaveFaz(r.codFazenda, r.fazenda);
      if (!porFaz[chave]) porFaz[chave] = { label: _nomeFaz(r.codFazenda, r.fazenda), planejado: 0, plantado: 0, talhoes: 0 };
      porFaz[chave].planejado += (r.area || 0);
      porFaz[chave].talhoes++;
    });
    
    diario.forEach(r => {
      const chave = _chaveFaz(r.codFazenda, r.fazenda);
      if (!porFaz[chave]) porFaz[chave] = { label: _nomeFaz(r.codFazenda, r.fazenda), planejado: 0, plantado: 0, talhoes: 0 };
      porFaz[chave].plantado += (r.area || 0);
    });
    
    const sorted = Object.entries(porFaz).sort((a, b) => {
      const pctA = a[1].planejado > 0 ? a[1].plantado / a[1].planejado : 0;
      const pctB = b[1].planejado > 0 ? b[1].plantado / b[1].planejado : 0;
      return pctA - pctB;
    });
    
    const iniciadas    = sorted.filter(([, d]) => d.plantado > 0);
    const naoIniciadas = sorted.filter(([, d]) => d.plantado <= 0);
    _rankingFazendasAtual = sorted;
    
    const linhaFazenda = ([chave, d]) => {
      const pct = d.planejado > 0 ? Math.min((d.plantado / d.planejado) * 100, 100) : 0;
      return `
        <div class="pla-rank-row" onclick="plantioSelecionarFazenda('${chave.replace(/'/g, "\\'")}')">
          <div class="pla-rank-row-header">
            <span class="pla-rank-fazenda"><i class="fas fa-map-marker-alt" style="margin-right:5px;color:var(--text-3);font-size:10px;"></i>${d.label}</span>
            <span class="pla-rank-pct">${pct.toFixed(0)}%</span>
          </div>
          <div class="pla-progress-bg"><div class="pla-progress-fill" style="width:${pct.toFixed(1)}%"></div></div>
          <div class="pla-rank-sub">${d.talhoes} talhõe${d.talhoes !== 1 ? 's' : ''} · ${_fmtHa(d.plantado)} de ${_fmtHa(d.planejado)}</div>
        </div>`;
    };
    
    let html = '';
    if (!iniciadas.length) {
      html += '<div class="pla-empty"><i class="fas fa-seedling"></i>Nenhuma fazenda com plantio iniciado ainda.</div>';
    } else {
      html += iniciadas.map(linhaFazenda).join('');
    }
    
    if (naoIniciadas.length) {
      html += `
        <div class="pla-rank-naoiniciadas-toggle" onclick="plantioToggleNaoIniciadas(this)">
          <i class="fas fa-chevron-right"></i> ${naoIniciadas.length} fazenda${naoIniciadas.length !== 1 ? 's' : ''} ainda não iniciada${naoIniciadas.length !== 1 ? 's' : ''}
        </div>
        <div class="pla-rank-naoiniciadas-wrap">${naoIniciadas.map(linhaFazenda).join('')}</div>`;
    }
    cont.innerHTML = html;
  }
  
  function plantioToggleNaoIniciadas(el) {
    const wrap = el.nextElementSibling;
    if (!wrap) return;
    const aberto = wrap.classList.toggle('open');
    el.querySelector('i').style.transform = aberto ? 'rotate(90deg)' : '';
  }
  
  function plantioSelecionarFazenda(faz) {
    const sel = document.getElementById('pla-filtro-fazenda');
    if (!sel) return;
    sel.value = faz;
    filtrarPlantioAvanco();
  }
  
  function exportarPDFMapaPlantio() {
    const fazFiltro = document.getElementById('pla-filtro-fazenda')?.value || '';
    const fazLabel  = document.getElementById('pla-filtro-fazenda')?.selectedOptions?.[0]?.textContent || '';
    
    if (fazFiltro) {
      if (!_mapaTalhoesAtual.length) { showToast('⚠️ Nenhum talhão para exportar.', 'error', 2500); return; }
      
      const totalPlanejado = _mapaTalhoesAtual.reduce((s, r) => s + (r.areaTotal || 0), 0);
      const totalPlantado  = _mapaTalhoesAtual.reduce((s, r) => s + (r.areaPlantada || 0), 0);
      const pct = totalPlanejado > 0 ? Math.min((totalPlantado / totalPlanejado) * 100, 100) : 0;
      const subtitulo = `${fazLabel} · ${_mapaTalhoesAtual.length} talhões · ${pct.toFixed(0)}% concluído · ${_fmtHa(totalPlantado)} de ${_fmtHa(totalPlanejado)}`;
      
      const { pdf, y } = _novoPDFRelatorio('O que foi plantado — por talhão', subtitulo, 'portrait');
      const statusLabel = { ok: 'PLANTADO', parcial: 'PARCIAL', pendente: 'PENDENTE' };
      
      pdf.autoTable({
        ...(_PDF_TABLE_ESTILO),
        startY: y,
        head: [['Talhão', 'Status', 'Variedade', 'Ciclo', 'Área Total', 'Plantado', 'Falta', 'Última Data']],
        body: _mapaTalhoesAtual.map(t => [
          t.talhao, statusLabel[t.status] || t.status, t.variedade || '—', t.refCiclo || '—',
          _fmtHa(t.areaTotal || 0), _fmtHa(t.areaPlantada || 0),
          _fmtHa(Math.max((t.areaTotal || 0) - (t.areaPlantada || 0), 0)),
          t.ultimaData ? _fmtData(t.ultimaData) : '—',
        ]),
        columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const raw = String(data.cell.raw || '');
            data.cell.styles.fontStyle = 'bold';
            if (raw === 'PLANTADO') data.cell.styles.textColor = [46, 125, 50];
            else if (raw === 'PARCIAL') data.cell.styles.textColor = [230, 81, 0];
            else data.cell.styles.textColor = [120, 120, 120];
          }
        },
      });
      
      _finalizarPDFRelatorio(pdf, `Plantio_${fazLabel.replace(/[^a-zA-Z0-9]/g,'_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`);
    } else {
      if (!_rankingFazendasAtual.length) { showToast('⚠️ Nenhum dado para exportar.', 'error', 2500); return; }
      
      const totalPlanejado = _rankingFazendasAtual.reduce((s, [, d]) => s + d.planejado, 0);
      const totalPlantado  = _rankingFazendasAtual.reduce((s, [, d]) => s + d.plantado, 0);
      const subtitulo = `${_rankingFazendasAtual.length} fazendas · ${_fmtHa(totalPlantado)} de ${_fmtHa(totalPlanejado)} plantados`;
      
      const { pdf, y } = _novoPDFRelatorio('O que foi plantado — por fazenda', subtitulo, 'portrait');
      
      pdf.autoTable({
        ...(_PDF_TABLE_ESTILO),
        startY: y,
        head: [['Fazenda', '% Concluído', 'Talhões', 'Planejado', 'Plantado']],
        body: _rankingFazendasAtual.map(([, d]) => {
          const pct = d.planejado > 0 ? Math.min((d.plantado / d.planejado) * 100, 100) : 0;
          return [d.label, pct.toFixed(0) + '%', d.talhoes, _fmtHa(d.planejado), _fmtHa(d.plantado)];
        }),
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      });
      
      _finalizarPDFRelatorio(pdf, `Plantio_Ranking_Fazendas_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`);
    }
  }
  window.exportarPDFMapaPlantio = exportarPDFMapaPlantio;
  
  function filtrarPlantioComparar() {
    const iniVal = document.getElementById('pla-comp-ini')?.value;
    const fimVal = document.getElementById('pla-comp-fim')?.value;
    const dIni   = iniVal ? new Date(iniVal + 'T00:00:00') : null;
    const dFim   = fimVal ? new Date(fimVal + 'T23:59:59') : null;
    
    const filtrar = (safra) => {
      const diario = _cache[safra].diario || [];
      return diario.filter(r => {
        if (dIni && r.data < dIni) return false;
        if (dFim && r.data > dFim) return false;
        return true;
      });
    };
    
    const f2526 = filtrar('25_26');
    const f2627 = filtrar('26_27');
    const ha2526 = f2526.reduce((s, r) => s + r.area, 0);
    const ha2627 = f2627.reduce((s, r) => s + r.area, 0);
    
    const $ = id => document.getElementById(id);
    if ($('pla-comp-ha-2526')) $('pla-comp-ha-2526').textContent = _fmtHa(ha2526);
    if ($('pla-comp-reg-2526')) $('pla-comp-reg-2526').textContent = `${f2526.length} registro${f2526.length !== 1 ? 's' : ''}`;
    if ($('pla-comp-ha-2627')) $('pla-comp-ha-2627').textContent = _fmtHa(ha2627);
    if ($('pla-comp-reg-2627')) $('pla-comp-reg-2627').textContent = `${f2627.length} registro${f2627.length !== 1 ? 's' : ''}`;
    
    const total = ha2526 + ha2627;
    if ($('pla-comp-contador')) $('pla-comp-contador').textContent = `25/26: ${_fmtHa(ha2526)} · 26/27: ${_fmtHa(ha2627)} · Total: ${_fmtHa(total)}`;
    
    if (!iniVal && !fimVal) { _ultimoComparativoMeses = null; return; }
    
    const mesMap = {};
    const addAoMes = (regs, campo) => {
      regs.forEach(r => {
        if (!r.data) return;
        const key   = `${r.data.getFullYear()}-${String(r.data.getMonth()+1).padStart(2,'0')}`;
        const label = MESES_NOME[r.data.getMonth()+1] + '/' + r.data.getFullYear();
        if (!mesMap[key]) mesMap[key] = { label, a: 0, b: 0, fazendas: {} };
        mesMap[key][campo] += r.area;
        const faz = _nomeFaz(r.codFazenda, r.fazenda) || 'Sem fazenda';
        if (!mesMap[key].fazendas[faz]) mesMap[key].fazendas[faz] = { a: 0, b: 0 };
        mesMap[key].fazendas[faz][campo] += r.area;
      });
    };
    
    addAoMes(f2526, 'a');
    addAoMes(f2627, 'b');
    
    const maxHa = Math.max(...Object.values(mesMap).map(m => Math.max(m.a, m.b)), 1);
    const mesesSorted = Object.entries(mesMap).sort(([a], [b]) => a.localeCompare(b));
    _ultimoComparativoMeses = mesesSorted;
    
    let htmlMeses = '';
    if (!mesesSorted.length) {
      htmlMeses = '<div class="pla-empty"><i class="fas fa-seedling"></i>Nenhum registro no período.</div>';
    } else {
      mesesSorted.forEach(([key, m], idx) => {
        const wA = ((m.a / maxHa) * 100).toFixed(1);
        const wB = ((m.b / maxHa) * 100).toFixed(1);
        const idFaz = `pla-mes-faz-${idx}`;
        
        const fazSorted = Object.entries(m.fazendas).sort((x, y) => (y[1].a + y[1].b) - (x[1].a + x[1].b));
        let fazHtml = '';
        fazSorted.forEach(([faz, vals]) => {
          const parts = [];
          if (vals.a > 0) parts.push(`<span class="pla-comp-mes-faz-a">25/26 ${_fmtHa(vals.a)}</span>`);
          if (vals.b > 0) parts.push(`<span class="pla-comp-mes-faz-b">26/27 ${_fmtHa(vals.b)}</span>`);
          fazHtml += `
            <div class="pla-comp-mes-faz-item">
              <span class="pla-comp-mes-faz-nome"><i class="fas fa-map-marker-alt" style="margin-right:5px;color:var(--text-3);font-size:9px;"></i>${faz}</span>
              <div class="pla-comp-mes-faz-safras">${parts.join('')}</div>
            </div>`;
        });
        
        const totalFaz = fazSorted.length;
        htmlMeses += `
          <div class="pla-comp-mes-row" onclick="plaToggleMesFaz('${idFaz}', this)">
            <span class="pla-comp-mes-label">${m.label}</span>
            <div class="pla-comp-safra-bar">
              <div class="pla-comp-bar-label">25/26 <span class="pla-comp-bar-ha pla-comp-bar-ha-a">${_fmtHa(m.a)}</span></div>
              <div class="pla-comp-bar-wrap"><div class="pla-comp-bar-fill-a" style="width:${wA}%"></div></div>
            </div>
            <div class="pla-comp-safra-bar">
              <div class="pla-comp-bar-label">26/27 <span class="pla-comp-bar-ha pla-comp-bar-ha-b">${_fmtHa(m.b)}</span></div>
              <div class="pla-comp-bar-wrap"><div class="pla-comp-bar-fill-b" style="width:${wB}%"></div></div>
            </div>
            <span style="font-size:9px;color:var(--text-3);display:flex;align-items:center;gap:4px;grid-column:1/-1;margin-top:2px;">
              ${totalFaz} fazenda${totalFaz !== 1 ? 's' : ''} · toque para ver <i class="fas fa-chevron-down pla-comp-mes-toggle"></i>
            </span>
            <div class="pla-comp-mes-fazendas" id="${idFaz}">${fazHtml}</div>
          </div>`;
      });
    }
    
    if ($('pla-comp-meses')) $('pla-comp-meses').innerHTML = htmlMeses;
  }
  
  function plaToggleMesFaz(id, rowEl) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('open');
    rowEl.classList.toggle('open');
  }
  window.plaToggleMesFaz = plaToggleMesFaz;
  
  function exportarExcelComparar() {
    if (!_ultimoComparativoMeses || !_ultimoComparativoMeses.length) {
      showToast('⚠️ Selecione um período com dados antes de exportar.', 'error', 2500);
      return;
    }
    
    const cabecalho = ['Mês', 'Fazenda', 'Safra 25/26 (ha)', 'Safra 26/27 (ha)'];
    const linhas = [];
    
    _ultimoComparativoMeses.forEach(([, m]) => {
      const fazendas = Object.entries(m.fazendas).sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { numeric: true }));
      fazendas.forEach(([faz, d]) => {
        linhas.push([
          m.label, faz,
          d.a ? d.a.toFixed(2).replace('.', ',') : '0,00',
          d.b ? d.b.toFixed(2).replace('.', ',') : '0,00',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));
      });
      linhas.push([
        m.label, 'TOTAL DO MÊS',
        m.a.toFixed(2).replace('.', ','),
        m.b.toFixed(2).replace('.', ','),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    });
    
    const csv  = '\uFEFF' + cabecalho.map(c => `"${c}"`).join(';') + '\n' + linhas.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `comparativo_safras_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ Excel exportado!', 'success', 2500);
  }
  window.exportarExcelComparar = exportarExcelComparar;
  
  function exportarPDFComparar() {
    if (!_ultimoComparativoMeses || !_ultimoComparativoMeses.length) {
      showToast('⚠️ Selecione um período com dados antes de exportar.', 'error', 2500);
      return;
    }
    
    const iniVal = document.getElementById('pla-comp-ini')?.value || '';
    const fimVal = document.getElementById('pla-comp-fim')?.value || '';
    const totalA = _ultimoComparativoMeses.reduce((s, [, m]) => s + m.a, 0);
    const totalB = _ultimoComparativoMeses.reduce((s, [, m]) => s + m.b, 0);
    const subtitulo = `Período: ${iniVal || '…'} a ${fimVal || '…'} · Safra 25/26: ${_fmtHa(totalA)} · Safra 26/27: ${_fmtHa(totalB)}`;
    
    const { pdf, y } = _novoPDFRelatorio('Consulta entre Safras — Mês × Fazenda', subtitulo, 'portrait');
    const linhas = [];
    
    _ultimoComparativoMeses.forEach(([, m]) => {
      const fazendas = Object.entries(m.fazendas).sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { numeric: true }));
      fazendas.forEach(([faz, d]) => {
        linhas.push([m.label, faz, _fmtHa(d.a || 0), _fmtHa(d.b || 0), '']);
      });
      linhas.push([
        { content: m.label, styles: { fontStyle: 'bold' } },
        { content: 'TOTAL DO MÊS', styles: { fontStyle: 'bold' } },
        { content: _fmtHa(m.a), styles: { fontStyle: 'bold' } },
        { content: _fmtHa(m.b), styles: { fontStyle: 'bold' } },
        ''
      ]);
    });
    
    pdf.autoTable({
      ...(_PDF_TABLE_ESTILO),
      startY: y,
      head: [['Mês', 'Fazenda', 'Safra 25/26', 'Safra 26/27']],
      body: linhas.map(l => l.slice(0, 4)),
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
      didParseCell: (data) => {
        if (data.section === 'body' && String(data.row.raw[1]?.content || data.row.raw[1]) === 'TOTAL DO MÊS') {
          data.cell.styles.fillColor = [232, 245, 233];
        }
      },
    });
    
    _finalizarPDFRelatorio(pdf, `Comparativo_Safras_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`);
  }
  window.exportarPDFComparar = exportarPDFComparar;
  
  function togglePlantioCard(headerEl) {
    const card = headerEl.closest('.plantio-card-collapsible');
    if (card) card.classList.toggle('open');
  }
})();

/* ══════════════════════════════════════════════
AUTH
══════════════════════════════════════════════ */
(async function iniciarAuth() {
  const lembrar = localStorage.getItem('ctt_lembrar') === '1';
  if (lembrar) {
    const emailSalvo = localStorage.getItem('ctt_email_salvo') || '';
    if (emailSalvo) document.getElementById('login-email').value = emailSalvo;
    document.getElementById('login-lembrar').checked = true;
  }
  
  const { data: { session } } = await _sbClient.auth.getSession();
  if (session) {
    _onLoginSuccess(session.user);
  }
  
  _sbClient.auth.onAuthStateChange((_event, session) => {
    if (session) {
      _onLoginSuccess(session.user);
    } else {
      _onLogout();
    }
  });
})();

function mostrarLogin() {
  document.getElementById('painel-login').style.display      = 'block';
  document.getElementById('painel-cadastro').style.display   = 'none';
  document.getElementById('painel-confirmacao').style.display = 'none';
  document.getElementById('login-erro').textContent = '';
}

function mostrarCadastro() {
  document.getElementById('painel-login').style.display      = 'none';
  document.getElementById('painel-cadastro').style.display   = 'block';
  document.getElementById('painel-confirmacao').style.display = 'none';
  document.getElementById('cad-erro').textContent = '';
  setTimeout(() => document.getElementById('cad-email').focus(), 100);
}

function mostrarConfirmacao(email) {
  document.getElementById('painel-login').style.display      = 'none';
  document.getElementById('painel-cadastro').style.display   = 'none';
  document.getElementById('painel-confirmacao').style.display = 'block';
  document.getElementById('cad-email-label').textContent     = email;
}

function toggleSenhaVisivel(inputId, iconeId) {
  const input = document.getElementById(inputId);
  const icone = document.getElementById(iconeId);
  if (!input || !icone) return;
  if (input.type === 'password') {
    input.type = 'text';
    icone.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icone.className = 'fas fa-eye';
  }
}

async function fazerLogin() {
  const email  = (document.getElementById('login-email').value || '').trim();
  const senha  = document.getElementById('login-senha').value || '';
  const lembrar = document.getElementById('login-lembrar').checked;
  const erroEl = document.getElementById('login-erro');
  const btn    = document.getElementById('btn-login-submit');
  
  erroEl.textContent = '';
  if (!email || !senha) {
    erroEl.textContent = '⚠️ Preencha e-mail e senha.';
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando…';
  
  const { error } = await _sbClient.auth.signInWithPassword({ email, password: senha });
  
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
  
  if (error) {
    erroEl.textContent = '❌ E-mail ou senha incorretos.';
    document.getElementById('login-senha').value = '';
    document.getElementById('login-senha').focus();
    return;
  }
  
  if (lembrar) {
    localStorage.setItem('ctt_lembrar', '1');
    localStorage.setItem('ctt_email_salvo', email);
  } else {
    localStorage.removeItem('ctt_lembrar');
    localStorage.removeItem('ctt_email_salvo');
  }
}

async function fazerCadastro() {
  const email    = (document.getElementById('cad-email').value || '').trim();
  const senha    = document.getElementById('cad-senha').value || '';
  const confirma = document.getElementById('cad-confirma').value || '';
  const erroEl   = document.getElementById('cad-erro');
  const btn      = document.getElementById('btn-cad-submit');
  
  erroEl.textContent = '';
  if (!email || !senha || !confirma) {
    erroEl.textContent = '⚠️ Preencha todos os campos.';
    return;
  }
  if (senha.length < 6) {
    erroEl.textContent = '⚠️ A senha deve ter pelo menos 6 caracteres.';
    return;
  }
  if (senha !== confirma) {
    erroEl.textContent = '❌ As senhas não coincidem.';
    document.getElementById('cad-confirma').value = '';
    document.getElementById('cad-confirma').focus();
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando conta…';
  
  const { error } = await _sbClient.auth.signUp({
    email,
    password: senha,
    options: { emailRedirectTo: 'https://martinsdaniel1201-maker.github.io/controle_gestao_agricola' }
  });
  
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-user-plus"></i> Criar conta';
  
  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      erroEl.textContent = '⚠️ Este e-mail já está cadastrado. Faça login.';
    } else {
      erroEl.textContent = '❌ Erro ao criar conta: ' + error.message;
    }
    return;
  }
  
  document.getElementById('cad-senha').value    = '';
  document.getElementById('cad-confirma').value = '';
  mostrarConfirmacao(email);
}

async function fazerLogout() {
  await _sbClient.auth.signOut();
}

function _onLoginSuccess(user) {
  document.getElementById('login-screen').classList.remove('visible');
  const nomeUsuario = user.email.split('@')[0];
  
  const badge = document.getElementById('user-badge');
  if (badge) {
    badge.textContent = nomeUsuario;
    badge.style.display = 'block';
  }
  
  const badgeHeader = document.getElementById('user-badge-header');
  if (badgeHeader) {
    const nomeEl = badgeHeader.querySelector('.ubh-nome');
    if (nomeEl) nomeEl.textContent = '👤 ' + nomeUsuario;
    badgeHeader.classList.add('logado');
  }
  
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.style.display = 'flex';
  
  iniciarWelcomeBar(nomeUsuario);
  
  const _hoje = new Date().toISOString().slice(0, 10);
  const chave = 'ctt_toast_bv' + (user.id || nomeUsuario);
  if (localStorage.getItem(chave) !== _hoje) {
    localStorage.setItem(chave, _hoje);
    const hora = new Date().getHours();
    let saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    const nomeFormatado = nomeUsuario.charAt(0).toUpperCase() + nomeUsuario.slice(1);
    showToast(`🌱 ${saud}, ${nomeFormatado}! Bem-vindo!`, 'success', 3500);
  }
}

function _onLogout() {
  voltarParaHome();
  document.getElementById('login-screen').classList.add('visible');
  mostrarLogin();
  
  const badge = document.getElementById('user-badge');
  if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
  
  const badgeHeader = document.getElementById('user-badge-header');
  if (badgeHeader) {
    const nomeEl = badgeHeader.querySelector('.ubh-nome');
    if (nomeEl) nomeEl.textContent = '';
    badgeHeader.classList.remove('logado');
  }
  
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.style.display = 'none';
  document.getElementById('login-senha').value = '';
}

/* ══════════════════════════════════════════════════════════════════════════
⭐ MICROINTERAÇÃO — feedback tátil sutil em toques (mobile)
══════════════════════════════════════════════════════════════════════════ */
(function () {
  if (!('vibrate' in navigator)) return;
  document.addEventListener('click', function (e) {
    const el = e.target.closest('.tab-btn, .sub-tab-btn, .mapas-sub-btn, button');
    if (!el || el.disabled) return;
    try { navigator.vibrate(8); } catch (_) {}
  }, { passive: true });
})();

/* ══════════════════════════════════════════════════════════════════════════
⭐ MELHORIA UX — botão flutuante "voltar ao menu"
══════════════════════════════════════════════════════════════════════════ */
(function () {
  let ticking = false;
  function _atualizarBotaoVoltarFlutuante() {
    const btn = document.getElementById('btn-voltar-flutuante');
    if (!btn) return;
    const dentroDeSecao = document.body.classList.contains('tab-open');
    const rolouBastante = window.scrollY > 220;
    btn.classList.toggle('visivel', dentroDeSecao && rolouBastante);
  }
  
  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () { _atualizarBotaoVoltarFlutuante(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
})();

/* ══════════════════════════════════════════════════════════════════════════
GESTO EDGE-SWIPE (estilo iOS)
══════════════════════════════════════════════════════════════════════════ */
(function () {
  const EDGE_ZONE     = 24;
  const MIN_DIST      = 90;
  const MAX_VERTICAL  = 60;
  const MAX_DRAG      = 140;
  
  let startX = 0, startY = 0, tracking = false, activeSection = null;
  const hint = () => document.getElementById('swipe-back-hint');
  
  function onStart(e) {
    if (!document.body.classList.contains('tab-open')) return;
    if (document.querySelector('.modal-overlay.open, .mais-sheet-overlay.open')) return;
    
    const t = e.touches[0];
    if (t.clientX > EDGE_ZONE) return;
    
    startX = t.clientX;
    startY = t.clientY;
    tracking = true;
    activeSection = document.querySelector('.section.active');
    if (activeSection) activeSection.classList.add('swipe-tracking');
    
    const h = hint();
    if (h) h.classList.add('dragging');
  }
  
  function onMove(e) {
    if (!tracking) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = Math.abs(t.clientY - startY);
    
    if (dy > MAX_VERTICAL) { onEnd(); return; }
    if (dx <= 0) return;
    
    const drag = Math.min(dx, MAX_DRAG);
    const progress = drag / MIN_DIST;
    
    if (activeSection) activeSection.style.transform = `translateX(${drag}px)`;
    
    const h = hint();
    if (h) {
      h.style.opacity = Math.min(progress, 1);
      h.style.transform = `translate(${-100 + Math.min(progress, 1) * 160}%, -50%)`;
    }
  }
  
  function onEnd(e) {
    if (!tracking) return;
    tracking = false;
    
    const h = hint();
    const dx = e && e.changedTouches ? (e.changedTouches[0].clientX - startX) : 0;
    const dy = e && e.changedTouches ? Math.abs(e.changedTouches[0].clientY - startY) : 999;
    const confirmou = dx > MIN_DIST && dy < MAX_VERTICAL;
    
    if (activeSection) {
      activeSection.classList.remove('swipe-tracking');
      activeSection.classList.add('swipe-snapping');
      activeSection.style.transform = '';
      setTimeout(() => { if (activeSection) activeSection.classList.remove('swipe-snapping'); }, 260);
    }
    
    if (h) {
      h.classList.remove('dragging');
      h.classList.add('snapping');
      h.style.opacity = 0;
      h.style.transform = 'translate(-100%, -50%)';
      setTimeout(() => h.classList.remove('snapping'), 260);
    }
    
    if (confirmou) voltarParaHome();
    activeSection = null;
  }
  
  document.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('touchend', onEnd, { passive: true });
  document.addEventListener('touchcancel', onEnd, { passive: true });
})();
