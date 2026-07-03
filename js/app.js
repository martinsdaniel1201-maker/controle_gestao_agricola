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

  // Configuração por aba: cada entrada = { label, icon, acao }
  const itensComuns = [
    { label: 'Exportar PDF', icon: 'fas fa-file-pdf', acao: 'pdf' },
  ];
  const itensExcelLib  = { label: 'Exportar Excel', icon: 'fas fa-file-excel', acao: 'excel' };
  const itensExcelConf = { label: 'Exportar Excel', icon: 'fas fa-file-excel', acao: 'excel' };
  const itensSincronizar = { label: 'Sincronizar atualização', icon: 'fas fa-sync-alt', acao: 'atualizar' };

  let itens = [];

  if (abaId === 'simulador') {
    itens = [
      { secao: 'Exportar' },
      { label: 'Exportar PDF', icon: 'fas fa-file-pdf', acao: 'pdf' },
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
  } else {
    // Clima, Mapas, Calculadora — só PDF e sincronizar
    itens = [
      { secao: 'Exportar' },
      { label: 'Exportar PDF', icon: 'fas fa-file-pdf', acao: 'pdf' },
      { secao: 'App' },
      { label: 'Sincronizar atualização', icon: 'fas fa-sync-alt', acao: 'atualizar' },
    ];
  }

  menu.innerHTML = itens.map(item => {
    if (item.secao) return `<div class="kebab-section-label">${item.secao}</div>`;
    return `<div class="kebab-item" onclick="kebabAcao('${item.acao}')">
      <i class="${item.icon}"></i> ${item.label}
    </div>`;
  }).join('');
}

function kebabAcao(acao) {
  fecharKebab();
  switch (acao) {
    case 'pdf':
      gerarPDF();
      break;
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
  const bFazenda   = (document.getElementById('filtroFazenda')?.value || '').toLowerCase().trim();
  const bStatus    = (document.getElementById('filtroStatus')?.value  || '');

  // Aplica os mesmos filtros da tabela
  const filtrados = window._gatecDados.filter(row => {
    const frente  = (row['FRENTE']       || '').trim();
    const fazenda = (row['DESC.FAZENDA'] || '').toLowerCase();
    const status  = (row['STATUS OS']    || '').toUpperCase();
    const okFrente  = frentesSel.size === 0 || frentesSel.has(frente);
    const statusOk  = bStatus === '' || (bStatus === 'ENCERRADA' ? status.includes('ENCERRADA') : !status.includes('ENCERRADA'));
    return okFrente && fazenda.includes(bFazenda) && statusOk;
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
    const prodReal = parseFloat(
      String(row['PROD. REAL'] || '0').replace(/\./g, '').replace(',', '.')
    ) || 0;
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

  // Monta descrição dos filtros aplicados
  const filtrosDesc = [
    frentesSel.size > 0 ? `Frente(s): "${[...frentesSel].join(', ')}"` : null,
    bFazenda ? `Fazenda: "${bFazenda.toUpperCase()}"` : null,
    bStatus  ? `Status: ${bStatus}` : null,
  ].filter(Boolean);
  const filtroLabel = filtrosDesc.length > 0 ? `🔍 Filtros: ${filtrosDesc.join(' · ')}` : '📋 Todos os registros';

  const medalhoes = ['🥇','🥈','🥉'];
  const linhasFrente = frentesOrdenadas.map(([frente, dados], idx) => {
    const medalha = idx < 3 ? medalhoes[idx] : `  ${idx+1}º`;
    const prodFmt = dados.prodReal > 0
      ? dados.prodReal.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' t'
      : '—';
    const statusInfo = dados.abertas > 0 && dados.encerradas > 0
      ? `${dados.abertas} aberta(s) · ${dados.encerradas} encerrada(s)`
      : dados.abertas > 0 ? `${dados.abertas} aberta(s)` : `${dados.encerradas} encerrada(s)`;
    return `${medalha} *Frente ${frente}:* ${prodFmt}  _(${statusInfo})_`;
  }).join('\n');

  const totalFmt = totalGeral > 0
    ? totalGeral.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' t'
    : '—';

  const texto =
`🌾 *LIBERAÇÕES — RESUMO POR FRENTE*
📅 ${dataHora}
${filtroLabel}
${'─'.repeat(32)}
${linhasFrente}
${'─'.repeat(32)}
📦 *Total Produzido (frentes monitoradas):* ${totalFmt}
${'─'.repeat(32)}
_Gerado pelo CTT Controle Agrícola_`;

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

    // Executa a busca por um sw.js novo no servidor
    await reg.update();

    // Cenário 1: Já existia uma atualização baixada esperando o app fechar/reiniciar
    if (reg.waiting) {
      showToast('⚡ Nova versão encontrada! Atualizando...', 'success', 3000);
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(() => window.location.reload(), 500);
      return;
    }

    // Cenário 2: O reg.update() achou algo novo e está baixando AGORA
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

    // Cenário 3: O sw.js do servidor é idêntico ao que está rodando
    showToast('✅ Seu app já está na versão mais recente!', 'success', 4000);

  } catch (err) {
    showToast('❌ Erro ao verificar atualização: ' + err.message, 'error', 4000);
  }
}


async function gerarPDF() {
  const secaoAtiva = document.querySelector('.section.active');
  if (!secaoAtiva) {
    showToast('⚠️ Abra uma aba antes de exportar.', 'error', 2500);
    return;
  }

  showToast('📄 Gerando PDF… aguarde', 'info', 8000);

  /* ── 1. Abre cards colapsados temporariamente ── */
  const colapsados = [];
  secaoAtiva.querySelectorAll('.card-collapsible:not(.open)').forEach(card => {
    const body = card.querySelector('.card-collapse-body');
    colapsados.push({ card, body });
    card.classList.add('open');
    if (body) {
      body.style.transition = 'none';
      body.style.maxHeight  = 'none';
      body.style.opacity    = '1';
      body.style.overflow   = 'visible';
    }
  });

  /* ── 2. Esconde elementos que não devem aparecer no PDF ── */
  const escondidos = [];
  secaoAtiva.querySelectorAll(
    '.btn-pdf-contextual, .collapse-hint, .collapse-chevron'
  ).forEach(el => {
    escondidos.push({ el, vis: el.style.visibility });
    el.style.visibility = 'hidden';
  });

  /* Aguarda layout estabilizar após abrir os cards */
  await new Promise(r => setTimeout(r, 220));

  try {
    /* ── 3. html2canvas direto no elemento vivo (preserva todas as cores) ── */
    const dpr   = Math.min(window.devicePixelRatio || 1, 2); // cap 2x
    const scale = Math.max(dpr, 2);                           // mínimo 2x para nitidez

    const canvas = await html2canvas(secaoAtiva, {
      scale,
      useCORS      : true,
      allowTaint   : true,
      logging      : false,
      scrollX      : 0,
      scrollY      : -window.scrollY,
      windowWidth  : document.documentElement.scrollWidth,
      windowHeight : secaoAtiva.scrollHeight,
      /* backgroundColor null = usa o fundo computado do próprio elemento */
      backgroundColor: window.getComputedStyle(secaoAtiva).backgroundColor || null,
    });

    /* ── 4. Monta PDF A4 multi-página via fatiamento do canvas ── */
    const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    const pdf  = new jsPDFClass({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pgW  = pdf.internal.pageSize.getWidth();   // 210 mm
    const pgH  = pdf.internal.pageSize.getHeight();  // 297 mm

    /* Proporção: largura do canvas → largura da página */
    const ratio     = pgW / canvas.width;
    const fatiaHpx  = Math.floor(pgH / ratio);       // altura de 1 página em px do canvas
    let   yPx       = 0;
    let   pagina    = 0;

    while (yPx < canvas.height) {
      const restante = canvas.height - yPx;
      const hPx      = Math.min(fatiaHpx, restante);

      /* Fatia o canvas para esta página */
      const fatia    = document.createElement('canvas');
      fatia.width    = canvas.width;
      fatia.height   = hPx;
      fatia.getContext('2d').drawImage(canvas, 0, -yPx);

      const imgData  = fatia.toDataURL('image/jpeg', 0.96);
      const imgH     = hPx * ratio;

      if (pagina > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pgW, imgH);

      yPx    += fatiaHpx;
      pagina += 1;
    }

    /* ── 5. Salva ── */
    const nomeAba  = secaoAtiva.id.replace('_aba','').replace(/_/g,'-');
    const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
    pdf.save(`CTT_${nomeAba}_${dataHoje}.pdf`);

    showToast(`✅ PDF gerado! (${pagina} página${pagina > 1 ? 's' : ''})`, 'success', 3000);

  } catch (err) {
    showToast('❌ Erro ao gerar PDF: ' + (err.message || err), 'error', 4000);
    console.error('[gerarPDF]', err);
  } finally {
    /* ── 6. Restaura estado original ── */
    colapsados.forEach(({ card, body }) => {
      card.classList.remove('open');
      if (body) {
        body.style.transition  = '';
        body.style.maxHeight   = '';
        body.style.opacity     = '';
        body.style.overflow    = '';
      }
    });
    escondidos.forEach(({ el, vis }) => { el.style.visibility = vis; });
  }
}

/* ══════════════════════════════════════════════
   BARRA DE BOAS-VINDAS (HOME)
══════════════════════════════════════════════ */
function iniciarWelcomeBar(nomeUsuario) {
  const greeting = document.getElementById('home-welcome-greeting');
  const sub = document.getElementById('home-welcome-sub');
  if (!greeting || !sub) return;

  // NOVA FUNCIONALIDADE 2: guarda o nome do login como fallback
  // e usa o nome personalizado salvo no localStorage, se existir.
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

  // NOVA FUNCIONALIDADE 4: dispara a busca do clima de forma assíncrona
  // e automática, imediatamente após o boot/login — sem exigir clique.
  atualizarClimaHomeAutomatico();

  // MELHORIA 3: Buscar dias sem chuva via Open-Meteo
  popularSeletorChuvaCidade();
  buscarDiasSemChuva();
}

/* Popula o seletor de cidade (oculto, sobreposto ao chip visível) do card
   "Dias Sem Chuva" com as mesmas cidades configuradas na aba Clima & Agro.
   Mantém a escolha anterior do usuário (salva em localStorage) entre sessões. */
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

/* Sincroniza o texto do chip visível ("📍 Passos ▾") com a opção
   selecionada no <select> real (que fica invisível por cima do chip). */
function atualizarChipCidadeChuva() {
  const sel = document.getElementById('hre-chuva-cidade-select');
  const label = document.getElementById('hre-chuva-cidade-label');
  if (sel && label && sel.selectedOptions[0]) {
    label.textContent = sel.selectedOptions[0].textContent;
  }
}

/* Dá foco/abre o <select> nativo de cidade quando o usuário toca no chip visível
   (o select real fica posicionado de forma invisível por cima do botão). */
function abrirSeletorCidadeChuva() {
  const sel = document.getElementById('hre-chuva-cidade-select');
  if (!sel) return;
  sel.focus();
  if (typeof sel.showPicker === 'function') {
    try { sel.showPicker(); } catch(e) {}
  }
}

/* Busca o clima atual (Open-Meteo) e popula a welcome-bar. Assíncrona e silenciosa. */
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
  // Atualiza a saudação imediatamente com o nome escolhido
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
    // Força reload ignorando cache local
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

// Registro de histórico de sincronização (máx 5)
window._syncHistorico = [];

function registrarSync(status, fonte) {
  const agora = new Date();
  const hh = String(agora.getHours()).padStart(2,'0');
  const mm = String(agora.getMinutes()).padStart(2,'0');
  const entrada = { hora: `${hh}:${mm}`, status, fonte };
  window._syncHistorico.unshift(entrada);
  if (window._syncHistorico.length > 5) window._syncHistorico.pop();

  // MELHORIA 2: atualiza label da home
  const label = document.getElementById('home-sync-label');
  const dot   = document.getElementById('home-sync-dot');
  if (label) label.textContent = `Sync às ${hh}:${mm}`;
  if (dot)   dot.style.background = status === 'ok' ? 'var(--green-500)' : 'var(--red)';

  // MELHORIA 6: atualiza lista do histórico
  renderSyncHistorico();
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
    </div>`).join('');
}

function atualizarResumoExecutivo() {
  if (!window._gatecDados || window._gatecDados.length === 0) return;

  const frentesPermitidas = ["401", "402", "403", "404", "451"];
  const metasSafra = { "401": 330490.62, "402": 280186.42, "403": 258189.22, "404": 277888.36, "451": 280133.10 };
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

  const elProd  = document.getElementById('hre-producao');
  const elAder  = document.getElementById('hre-aderencia');
  if (elProd)  elProd.textContent  = totalProd.toLocaleString('pt-BR', {maximumFractionDigits:0}) + ' t';
  if (elAder)  { elAder.textContent = aderenciaGeral.toFixed(1) + '%'; elAder.style.color = corAder; }

  // Atualiza card Plantio 26/27 na home (dados de window._plaDiario/_plaBase se disponíveis)
  atualizarCardPlantioHome();

  // MELHORIA 4: preencher chips de frente
  const chips = document.getElementById('home-frentes-chips');
  if (chips && frentesComAbertas.size > 0) {
    chips.style.display = 'flex';
    chips.innerHTML = Array.from(frentesComAbertas).sort().map(f =>
      `<button class="home-frente-chip" onclick="irParaFrente('${f}')">
        <i class="fas fa-tractor" style="font-size:9px; margin-right:4px; opacity:0.7;"></i>${f}
      </button>`
    ).join('');
  }

  // Popula select oculto de fazendas no filtro de Liberações
  popularFazendaLibSelect();
}

// MELHORIA 3: Dias sem chuva via Open-Meteo
async function buscarDiasSemChuva() {
  const elVal = document.getElementById('hre-dias-sem-chuva');
  const elSub = document.getElementById('hre-chuva-sub');
  const elMes = document.getElementById('hre-chuva-mes');
  const selCidade = document.getElementById('hre-chuva-cidade-select');
  const cidade = (selCidade && typeof CIDADES_COORDS !== 'undefined' && CIDADES_COORDS[selCidade.value])
    ? CIDADES_COORDS[selCidade.value]
    : { lat: -20.72, lon: -46.61, nome: 'Passos' };
  try {
    // Usa o endpoint de ARQUIVO HISTÓRICO (dados reais já confirmados),
    // não o de previsão — evita contar o dia de hoje (ainda incompleto)
    // como "sem chuva" antes mesmo de o dia terminar.
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    // Início sempre no 1º dia do mês corrente, para garantir o acumulado
    // mensal completo (independente de cair nos primeiros dias do mês).
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
    // Conta do dia mais recente (ontem) para trás, dias com < 0.1mm
    let dias = 0;
    for (let i = precip.length - 1; i >= 0; i--) {
      if ((precip[i] ?? 0) < 0.1) dias++;
      else break;
    }
    if (elVal) { elVal.textContent = dias; }
    if (elSub) {
      elSub.textContent = dias === 0 ? 'choveu ontem' : dias === 1 ? 'desde ontem' : `sem chuva`;
      // Cor: verde se sem chuva (bom pra colheita), azul se choveu recentemente
      const card = elVal?.closest('.hre-card');
      if (card) card.style.borderColor = dias >= 3 ? 'var(--green-500)' : '#90CAF9';
    }
    // Acumulado de chuva do mês corrente (ex.: "Junho: 25mm até o momento")
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

/* ══════════════════════════════════════════════
   MELHORIA 4 — ATALHO CHIP → ABA PRODUÇÃO
══════════════════════════════════════════════ */
function irParaFrente(frente) {
  // Navega para Liberações e ativa o chip da frente correspondente
  const btn = document.querySelector('[onclick*="liberacoes"]');
  if (btn) btn.click();
  setTimeout(() => {
    const chip = document.querySelector(`.lib-frente-chip[data-frente="${frente}"]`);
    if (chip) libToggleFrente(chip);
  }, 200);
}

/* ══════════════════════════════════════════════
   MELHORIA 5 — SELETOR GLOBAL DE FRENTE
══════════════════════════════════════════════ */


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

  // Aderência média ponderada
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
    const prodFmt = d.prod.toLocaleString('pt-BR', {maximumFractionDigits:0});
    return `  • *Frente ${f}:* ${prodFmt} t — Ader. ${ader}`;
  }).join('\n');

  const texto =
`🌾 *RESUMO SEMANAL — CTT CONTROLE AGRÍCOLA*
📅 Gerado em: ${dataHora}
${'─'.repeat(32)}
📦 *Produção Acumulada por Frente:*
${linhas}
${'─'.repeat(32)}
📊 *Total Acumulado:* ${totalGeral.toLocaleString('pt-BR', {maximumFractionDigits:0})} t
🎯 *Aderência Média:* ${aderMedia}%
🏆 *Frente Destaque:* Frente ${frenteLider.id || '—'} (${frenteLider.prod.toLocaleString('pt-BR', {maximumFractionDigits:0})} t)
${'─'.repeat(32)}
_Gerado pelo CTT Controle Agrícola_`;

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
    // Ao entrar em simulação: salva estado atual como "real" e carrega/inicia o simulado
    dadosReal = JSON.parse(JSON.stringify(frentes));

    if (dadosSimulado === null) {
      // Primeira vez: inicializa o simulado copiando o real
      dadosSimulado = JSON.parse(JSON.stringify(dadosReal));
    }
    // Carrega o estado simulado na tela (NÃO toca dadosReal)
    frentes = JSON.parse(JSON.stringify(dadosSimulado));
    renderFrentes();
    update();

    badge.className = 'mode-badge sim';
    badge.textContent = 'SIMULAÇÃO';
    labelTitulo.textContent = 'Modo Simulação';
    labelDesc.textContent = 'Altere livremente — os dados reais estão protegidos';
  } else {
    // Ao sair da simulação: persiste o estado simulado e restaura o real
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
  // Persiste imediatamente no conjunto simulado para não perder ao alternar
  if (modoSimulacao) dadosSimulado = JSON.parse(JSON.stringify(frentes));
  update();
  // Re-render chart se dashboard visível
  if (document.getElementById('sub_dash').classList.contains('active')) renderChart();
}

function removeFrente(id) {
  frentes = frentes.filter(f => f.id !== id);
  if (modoSimulacao) dadosSimulado = JSON.parse(JSON.stringify(frentes));
  renderFrentes();
  update();
}

/* ══════════════════════════════════════════════
   UPDATE DASHBOARD + INSIGHTS
══════════════════════════════════════════════ */
function update() {
  const prDiesel = parseFloat(document.getElementById('diesel_val').value) || 0;
  const metaG = parseFloat(document.getElementById('meta_val').value) || 1;
  let tTon = 0, tCusto = 0, rankingHtml = '';
  let insights = [];

  document.getElementById('meta_label_total').innerText = metaG.toLocaleString('pt-BR') + ' t';

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
          <b>${Math.round(tonD).toLocaleString('pt-BR')} t</b>
          <span>R$ ${custoTon}/t diesel</span>
        </div>
      </div>`;

    // Insights por frente
    if (f.efc < 80) {
      const efc85ton = ((f.vel * f.larg * 0.85) / 10) * f.tch * f.horas * f.maquinas;
      const economiaDiesel = ((efc85ton - tonD) > 0) ? '' : '';
      insights.push({ type: 'warn', msg: `⚠️ Aumentar a eficiência de <b>${escapeHtml(f.nome)}</b> para 85% aumentaria a produção de ${Math.round(tonD).toLocaleString('pt-BR')} t para ${Math.round(efc85ton).toLocaleString('pt-BR')} t/dia, reduzindo o custo diesel por tonelada.` });
    }
  });

  const pct = (tTon / metaG) * 100;
  document.getElementById('total_ton').innerText = Math.round(tTon).toLocaleString('pt-BR');
  document.getElementById('total_custo').innerText = 'R$ ' + Math.round(tCusto).toLocaleString('pt-BR');
  document.getElementById('meta_pct').innerText = pct.toFixed(1) + '%';
  document.getElementById('meta_fill').style.width = Math.min(pct, 100) + '%';
  document.getElementById('meta_restante').innerText = tTon < metaG
    ? `Faltam ${Math.round(metaG - tTon).toLocaleString('pt-BR')} t`
    : '✓ Meta Atingida!';
  document.getElementById('lista-ranking').innerHTML = rankingHtml || '<p style="font-size:12px;color:var(--text-3);padding:10px 0">Nenhuma frente cadastrada.</p>';

  // Insight de meta
  if (frentes.length > 0 && tTon < metaG * 0.7) {
    insights.push({ type: 'tip', msg: `💡 A produção atual (${Math.round(tTon).toLocaleString('pt-BR')} t/dia) está abaixo de 70% da meta. Considere adicionar +1 máquina por frente ou estender as horas de operação por dia para atingir a meta operacional.` });
  }

  // Renderizar insights
  const insContainer = document.getElementById('insights-container');
  if (insights.length === 0) {
    insContainer.innerHTML = '<div class="insight-item ok"><i class="fas fa-check-circle"></i><span>Todos os indicadores dentro do esperado. Nenhum alerta no momento.</span></div>';
  } else {
    insContainer.innerHTML = insights.map(ins =>
      `<div class="insight-item ${ins.type}"><i class="fas fa-${ins.type === 'warn' ? 'exclamation-triangle' : 'lightbulb'}"></i><span>${ins.msg}</span></div>`
    ).join('');
  }
  // Atualizar comparativo se ativo
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
            label: ctx => ' ' + ctx.parsed.y.toLocaleString('pt-BR') + ' t/dia'
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, weight: '700' }, color: '#4A554A' } },
        y: {
          grid: { color: '#E0E5E0' },
          ticks: { font: { size: 10 }, color: '#7A8A7A', callback: v => v.toLocaleString('pt-BR') + ' t' }
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
    { key: 'ton', label: 'Produção t/dia', fmt: v => Math.round(v).toLocaleString('pt-BR') + ' t', higherBetter: true },
    { key: 'custo', label: 'Custo Diesel R$/dia', fmt: v => 'R$ ' + Math.round(v).toLocaleString('pt-BR'), higherBetter: false },
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

  // Totais globais
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
          <div style="font-size:16px; font-weight:800;">${Math.round(totalSimTon).toLocaleString('pt-BR')} t</div>
          <div style="font-size:10px; opacity:0.8;">${deltaTon >= 0 ? '+' : ''}${pctTon}% vs real</div>
        </div>
        <div>
          <div style="font-size:9px; opacity:0.8; text-transform:uppercase; font-weight:700;">Custo Diesel</div>
          <div style="font-size:16px; font-weight:800;">R$ ${Math.round(totalSimCusto).toLocaleString('pt-BR')}</div>
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
  document.getElementById('res_area_util').innerText = areaUtil.toFixed(2) + ' ha';
  document.getElementById('res_prod_bruta').innerText = Math.round(prodBruta).toLocaleString('pt-BR') + ' t';
  document.getElementById('res_prod_liquida').innerText = Math.round(prodLiquida).toLocaleString('pt-BR') + ' t';
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
  document.getElementById('res_mudas_total').innerText = Math.round(total).toLocaleString('pt-BR') + ' t';
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
  document.getElementById('res_atr_val').innerText = atr.toFixed(1);
  document.getElementById('res_atr_total').innerText = acucarTotal.toFixed(0) + ' t';
  document.getElementById('res_atr_receita').innerText = 'R$ ' + Math.round(receita / 1000) + ' mil';
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
  document.getElementById('res_cc_prod').innerText = Math.round(producao).toLocaleString('pt-BR') + ' t';
  document.getElementById('res_cc_total').innerText = 'R$ ' + Math.round(custoTotal).toLocaleString('pt-BR');
  document.getElementById('res_cc_ton').innerText = 'R$ ' + custoPorTon.toFixed(2);
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
  document.getElementById('res_vr_1corte').innerText = Math.round(prod1Corte).toLocaleString('pt-BR') + ' t';
  document.getElementById('res_vr_total').innerText = Math.round(total).toLocaleString('pt-BR') + ' t';
  document.getElementById('res_vr_media').innerText = Math.round(media).toLocaleString('pt-BR') + ' t';
  document.getElementById('res_vr_container').style.display = 'grid';
}

/* ══════════════════════════════════════════════
   LIBERAÇÕES (GATEC)
══════════════════════════════════════════════ */
async function carregarDadosGATEC() {
  const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTIIUGH-g6vlowVBAAkgoPwZd1EPJPJS8PzgOEWyDPito38Ii8qzOHaSh1PioGGMLNbwFJPDMzwsA7/pub?gid=0&single=true&output=csv";
  Papa.parse(URL_CSV, {
    download: true, header: true, skipEmptyLines: true,
    complete: function(results) {
      window._gatecDados = results.data; // salva para exportação
	 const resumoFrentes = {};
let totalProduzido = 0;

// Lista de frentes permitidas (mantida do filtro anterior)
const frentesPermitidas = ["401", "402", "403", "404", "451"];

results.data.forEach(row => {
    const frente = (row["FRENTE"] || "Sem Frente").trim();

    // Filtro para somar apenas as frentes desejadas
    if (!frentesPermitidas.includes(frente)) {
        return; 
    }

    const prodReal = parseFloat(
        String(row["PROD. REAL"] || "0")
            .replace(/\./g, "")
            .replace(",", ".")
    ) || 0;

    resumoFrentes[frente] = (resumoFrentes[frente] || 0) + prodReal;
    totalProduzido += prodReal;
});

const resumoCards = document.getElementById("resumoCards");

if (resumoCards) {
    resumoCards.innerHTML = "";

    let frenteLider = "-";
    let maiorValor = 0;

    // Ordena do maior valor para o menor e passa o parâmetro 'index' para o ranking
    Object.entries(resumoFrentes)
        .sort((a, b) => b[1] - a[1])
        .forEach(([frente, valor], index) => {

            if (valor > maiorValor) {
                maiorValor = valor;
                frenteLider = frente;
            }

            // Define visualmente as medalhas ou posições conforme o ranking (index inicia em 0)
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

			 // Metas de safra por frente
            const metasSafra = {
                "401": 330490.62,
                "402": 280186.42,
                "403": 258189.22,
                "404": 277888.36,
                "451": 280133.10
            };

            const meta = metasSafra[frente] || null;
            const aderencia = meta ? Math.min((valor / meta) * 100, 999) : null;
            const aderenciaFormatada = aderencia !== null ? aderencia.toFixed(1) + "%" : "—";
            const aderenciaCor = aderencia === null ? "var(--text-3)"
                : aderencia >= 90 ? "#1B5E20"
                : aderencia >= 70 ? "#E65100"
                : "#C62828";
            const metaFormatada = meta ? meta.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " t" : "—";

			
            // Injeta o HTML com as classes CSS mapeadas para a fonte Inter e o layout do app
            resumoCards.innerHTML += `
                <div class="frente-card ${rankClass}">
                    <div class="frente-card-header">
                        ${medalhaHtml}
                        <span class="frente-title">Frente ${frente}</span>
                    </div>
                    <div class="frente-value">
                        ${valor.toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        })} <span class="frente-unit">t</span>
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

    if (totalEl) {
        totalEl.textContent = totalProduzido.toLocaleString('pt-BR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }) + " t";
    }

    if (liderEl) {
        liderEl.textContent = frenteLider;
    }
}
      const corpo = document.getElementById('corpo-tabela-gatec');
      corpo.innerHTML = results.data.map(row => {
        const status = (row["STATUS OS"] || "").toUpperCase().trim();
        const isEncerrada = status.includes("ENCERRADA");
        const prodEst  = row["PROD. ESTIMADA"] || "";
        const prodReal = row["PROD. REAL"]     || "";
        const difProd  = row["DIF PROD."]      || "";
        const tch      = row["TCH"]            || "";
        
        // Colorir DIF PROD.: positivo = verde, negativo = vermelho
        const difNum = parseFloat(String(difProd).replace(",", "."));
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

      // Atualizar badge de abertas no menu home
      const abertas = results.data.filter(row => {
        const s = (row["STATUS OS"] || "").toUpperCase().trim();
        return !s.includes("ENCERRADA");
      }).length;
      const badge = document.getElementById('badge-liberacoes');
      if (badge) {
        badge.textContent = abertas;
        badge.style.display = abertas > 0 ? 'inline-flex' : 'none';
      }

      // Atualizar indicador de última sincronização
      const syncStatus = document.getElementById('gatec-sync-status');
      const syncLabel  = document.getElementById('gatec-sync-label');
      if (syncStatus && syncLabel) {
        const agora = new Date();
        const hh = String(agora.getHours()).padStart(2,'0');
        const mm = String(agora.getMinutes()).padStart(2,'0');
        syncLabel.textContent = `Sync ${hh}:${mm}`;
        syncStatus.style.display = 'inline-flex';
        syncStatus.style.alignItems = 'center';
      }
      // MELHORIA 2+6: registra sincronização no histórico
      registrarSync('ok', 'GATEC/Liberações');
      // MELHORIA 1+4+5: atualiza resumo executivo da home
      atualizarResumoExecutivo();
    }
  });
}

/* ══════════════════════════════════════════════
   CONFERÊNCIA OPERADORES X O.S
══════════════════════════════════════════════ */
async function carregarDadosConfOS() {
  const URL_CONF = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTIIUGH-g6vlowVBAAkgoPwZd1EPJPJS8PzgOEWyDPito38Ii8qzOHaSh1PioGGMLNbwFJPDMzwsA7/pub?gid=781227222&single=true&output=csv";
  const corpo = document.getElementById('corpo-tabela-conf-os');
  const contador = document.getElementById('conf-os-contador');
  if (!corpo) return;
  corpo.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-3);padding:24px;font-size:12px;"><i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Carregando dados...</td></tr>`;
  if (contador) contador.textContent = 'Carregando...';

  Papa.parse(URL_CONF, {
    download: true, header: true, skipEmptyLines: true,
    complete: function(results) {
      if (!results.data || results.data.length === 0) {
        corpo.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-3);padding:24px;font-size:12px;"><i class="fas fa-info-circle" style="margin-right:6px;"></i>Nenhum dado encontrado.</td></tr>`;
        if (contador) contador.textContent = '0 registros';
        return;
      }

      // Descobrir nomes reais das colunas (ignora espaços extras)
      const cols = results.meta.fields || [];
      function findCol(keywords) {
        return cols.find(c => keywords.some(k => c.toUpperCase().includes(k))) || '';
      }
      const colOS        = findCol(['Nº', 'N°', 'NO', 'OS', 'O.S', 'NUMERO', 'NÚMERO']);
      const colData      = findCol(['DATA', 'ENCERR', 'FECHA']);
      const colFazenda   = findCol(['FAZENDA', 'FARM', 'PROPRI']);
      const colOperacao  = findCol(['OPERA', 'AGRICOLA', 'AGRÍCOLA', 'ATIVIDADE', 'SERVIÇO', 'SERVICO']);
      const colObs       = findCol(['OBS', 'OBSERV']);

      window._confOsDados = results.data;
      window._confOsCols  = { colOS, colData, colFazenda, colOperacao, colObs };

      renderTabelaConfOS(results.data);
    },
    error: function() {
      corpo.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:24px;font-size:12px;"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>Erro ao carregar dados. Verifique sua conexão.</td></tr>`;
      if (contador) contador.textContent = 'Erro';
    }
  });
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

  // Montar CSV com BOM para Excel reconhecer UTF-8
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


function exportarExcelLiberacoes() {
  if (!window._gatecDados || window._gatecDados.length === 0) {
    showToast('⚠️ Nenhum dado de Liberações carregado para exportar.', 'error', 2500);
    return;
  }
  const frentesSel = window._libFrentesSelecionadas || new Set();
  const bFazenda   = (document.getElementById('filtroFazenda')?.value || '').toLowerCase();
  const bStatus    = (document.getElementById('filtroStatus')?.value  || '');

  const filtrados = window._gatecDados.filter(row => {
    const frente  = (row['FRENTE']       || '').trim();
    const fazenda = (row['DESC.FAZENDA'] || '').toLowerCase();
    const status  = (row['STATUS OS']    || '').toUpperCase();
    const okFrente = frentesSel.size === 0 || frentesSel.has(frente);
    const statusOk = bStatus === '' || (bStatus === 'ENCERRADA' ? status.includes('ENCERRADA') : !status.includes('ENCERRADA'));
    return okFrente && fazenda.includes(bFazenda) && statusOk;
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

/* ══════════════════════════════════════════════
   CHIPS MULTI-SELEÇÃO DE FRENTES — LIBERAÇÕES
══════════════════════════════════════════════ */
window._libFrentesSelecionadas = new Set();

function libToggleFrente(btn) {
  const frente = btn.dataset.frente;
  const chips  = document.querySelectorAll('#lib-frentes-chips .lib-frente-chip');

  if (frente === '') {
    // "Todas" — limpa tudo
    window._libFrentesSelecionadas.clear();
    chips.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
  } else {
    // Remove o "Todas" se estava ativo
    document.querySelector('.lib-frente-chip[data-frente=""]')?.classList.remove('active');

    if (window._libFrentesSelecionadas.has(frente)) {
      window._libFrentesSelecionadas.delete(frente);
      btn.classList.remove('active');
    } else {
      window._libFrentesSelecionadas.add(frente);
      btn.classList.add('active');
    }

    // Se nenhuma frente específica selecionada, volta para "Todas"
    if (window._libFrentesSelecionadas.size === 0) {
      document.querySelector('.lib-frente-chip[data-frente=""]')?.classList.add('active');
    }
  }
  filtrarTabela();
}

/* ══════════════════════════════════════════════
   APP-SS: Search-Select genérico reutilizável
   (usa mesma lógica do tratos-ss, mas global)
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
  // Dispara onChange no select oculto associado, se existir
  const assocId = r.wrap.dataset.selectId;
  if (assocId) {
    const sel = document.getElementById(assocId);
    if (sel) { sel.value = val; sel.dispatchEvent(new Event('change')); }
  }
  // Fallback: dispara filtro diretamente pelo input oculto (Liberações usa isso)
  const hiddenInp = document.getElementById('filtro' + ssId.charAt(0).toUpperCase() + ssId.slice(1).split('-')[0]);
  if (!assocId && hiddenInp) { hiddenInp.value = val; filtrarTabela(); }
  else if (!assocId) { filtrarTabela(); }
}

function appSSLimpar(ssId) {
  _appSSEscolher(ssId, '', '');
}

// Popula a lista de opções a partir do select oculto associado
function _appSSRenderListaFromSource(ssId, termo) {
  const r = _appSSRefs(ssId);
  if (!r) return;
  const assocId = r.wrap.dataset.selectId;
  let opts = [];
  if (assocId) {
    const sel = document.getElementById(assocId);
    if (sel) opts = Array.from(sel.options).filter(o => o.value).map(o => ({ value: o.value, label: o.textContent }));
  } else {
    // Fonte alternativa: dataset.opts como JSON
    try { opts = JSON.parse(r.wrap.dataset.opts || '[]'); } catch(e) { opts = []; }
  }
  _appSSRenderLista(ssId, termo, opts);
}

// Popular o select oculto de fazendas das liberações a partir dos dados carregados
function popularFazendaLibSelect() {
  const sel = document.getElementById('lib-fazenda-select');
  if (!sel || !window._gatecDados) return;
  const escHtml = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const fazendas = [...new Set(window._gatecDados.map(r => (r['DESC.FAZENDA'] || '').trim()).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">— Todas —</option>' + fazendas.map(f => `<option value="${escHtml(f)}">${escHtml(f)}</option>`).join('');
  // Associa o ss ao select
  const wrap = document.getElementById('ss-lib-fazenda');
  if (wrap) wrap.dataset.selectId = 'lib-fazenda-select';
}

// Fecha dropdowns ao clicar fora
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

function filtrarTabela() {
  // Frentes selecionadas via chips (Set de strings; vazio = todas)
  const frentesSel = window._libFrentesSelecionadas || new Set();
  const bFazenda = (document.getElementById('filtroFazenda')?.value || '').toLowerCase().trim();
  const bStatus  = document.getElementById('filtroStatus')?.value || '';
  document.querySelectorAll('#corpo-tabela-gatec tr').forEach(linha => {
    const frente  = (linha.cells[1]?.innerText || '').trim();
    const fazenda = (linha.cells[2]?.innerText || '').toLowerCase();
    const status  = (linha.cells[8]?.innerText || '').toUpperCase().trim();
    const okFrente  = frentesSel.size === 0 || frentesSel.has(frente);
    const okFazenda = !bFazenda || fazenda.includes(bFazenda);
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
  // Ativar botão correto
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

  // Mostrar loading em todos os painéis
  document.getElementById('forecast5-container').innerHTML = '<div class="clima-loading"><i class="fas fa-spinner fa-spin"></i>Carregando previsão para ' + escapeHtml(cidade.nome) + '...</div>';
  document.getElementById('forecast30-container').innerHTML = '<div class="clima-loading"><i class="fas fa-spinner fa-spin"></i>Carregando tendência...</div>';

  try {
    // API Open-Meteo: previsão 7 dias + temperatura atual (current_weather)
    const url5 = `https://api.open-meteo.com/v1/forecast?latitude=${cidade.lat}&longitude=${cidade.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&current_weather=true&hourly=temperature_2m&timezone=America/Sao_Paulo&forecast_days=7`;
    const r5 = await fetch(url5);
    const d5 = await r5.json();
    renderPrevisao5(d5, cidade.nome);

    // API Open-Meteo: previsão 16 dias + completar com médias
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
  // WMO weather codes
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

  // Temperatura real do momento via current_weather
  const tempAtual = (data.current_weather && data.current_weather.temperature !== undefined)
    ? Math.round(data.current_weather.temperature) : null;

  let html = `<div class="card"><div class="card-title"><i class="fas fa-sun"></i> Previsão — ${escapeHtml(nomeCidade)}</div>`;
  html += '<div class="forecast-grid">';
  dias.forEach((dt, i) => {
    const w = getWeatherIcon(weathercode[i]);
    const hoje = isToday(dt);
    const chuva = (precipitation_sum[i] || 0).toFixed(1);
    const tempatualHtml = (hoje && tempAtual !== null)
      ? `<div style="margin-top:6px;padding:4px 8px;background:linear-gradient(135deg,#1B5E20,#388E3C);border-radius:6px;color:white;font-size:11px;font-weight:800;letter-spacing:0.3px;"><i class="fas fa-thermometer-half" style="margin-right:3px;font-size:9px;"></i>AGORA: ${tempAtual}°C</div>`
      : '';
    html += `
      <div class="forecast-card ${hoje ? 'today' : ''}">
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
    <p style="font-size:11px; color:var(--text-3); margin-bottom:14px; line-height:1.6;">
      Previsão estendida disponível via Open-Meteo. Dados acima de 7 dias são estimativas de modelos climatológicos.
    </p>
    <div class="tendencia-grid">`;

  time.forEach((dt, i) => {
    const w = getWeatherIcon(weathercode[i]);
    const d = new Date(dt + 'T12:00:00');
    const chuva = (precipitation_sum[i] || 0).toFixed(0);
    html += `
      <div class="tend-day">
        <div class="tend-day-num">${d.getDate()}/${d.getMonth()+1}</div>
        <div class="tend-day-icon">${w.icon}</div>
        <div class="tend-day-rain">${chuva}mm</div>
      </div>`;
  });

  html += `</div>`;

  // Resumo estatístico
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

    // Filtrar apenas dias com chuva (mm > 0)
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

    // Totalizador
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

/* ══════════════════════════════════════════════
   COMPARATIVO HISTÓRICO DE CHUVAS — 4 CIDADES
══════════════════════════════════════════════ */
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

    // Ordenar por total decrescente para ranking
    const ordenados = [...resultados].sort((a, b) => b.total - a.total);
    const maxTotal = ordenados[0].total || 1;

    let html = `
      <div style="margin-top:16px; padding:12px 14px; background:var(--surface2); border-radius:var(--radius-md); border:1px solid var(--border); margin-bottom:14px;">
        <div style="font-size:10px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.5px;">
          <i class="fas fa-calendar-alt" style="margin-right:4px; color:var(--blue);"></i>
          Período: ${fmtDate(dIniObj)} a ${fmtDate(dFimObj)}
        </div>
      </div>`;

    // Blocos lado a lado
    html += `<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin-bottom:14px;">`;
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
          <!-- Mini barra proporcional -->
          <div style="margin-top:8px; height:6px; background:${c.cor}20; border-radius:99px; overflow:hidden;">
            <div style="height:100%; width:${Math.round((c.total/maxTotal)*100)}%; background:${c.cor}; border-radius:99px; transition:width 0.8s;"></div>
          </div>
        </div>`;
    });
    html += `</div>`;

    // Mini tabela comparativa
    html += `
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
  fornecedor_25_26: {
    label: "Caderno de Mapas de Fornecedores 25'26",
    arquivo: 'CADERNO_DE_MAPA_FORNACEDOR_25_26.pdf'
  },
  proprio_25_26: {
    label: "Caderno de Mapas Próprio 25'26",
    arquivo: 'CADERNO_MAPA_25_26_PROPRIO.pdf'
  },
  proprio_26_27: {
    label: "Caderno de Mapas Próprio 26'27",
    arquivo: 'CADERNO_MAPA_26_27_PROPRIO.pdf'
  },
  fornecedor_26_27: {
    label: "Caderno de Mapas Fornecedor 26'27",
    arquivo: 'CADERNO_MAPA_FORNECEDOR_26_27.pdf'
  }
};

let mapaAtivo = null;

// Detecta mobile ou iOS (iframe de PDF não funciona no Safari/iOS)
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

  // Esconde tudo primeiro
  iframe.style.display      = 'none';
  placeholder.style.display = 'none';
  mobileOpen.style.display  = 'none';
  iframe.src = '';

  if (!mapa.arquivo) {
    // Caderno ainda não disponível
    placeholder.style.display = 'flex';
    placeholder.innerHTML = `
      <i class="fas fa-clock" style="font-size:36px; color:var(--amber);"></i>
      <p style="color:var(--amber); font-weight:700;">${escapeHtml(mapa.label)}</p>
      <p style="font-size:11px;">Este caderno ainda não foi carregado. Adicione o PDF correspondente na pasta do projeto para ativá-lo.</p>`;
    return;
  }

  if (isMobileOuIOS()) {
    // Mobile / iOS: mostra botão para abrir no leitor nativo
    document.getElementById('mob-nome-pdf').textContent = mapa.label;
    document.getElementById('btn-abrir-pdf-mobile').href = mapa.arquivo;
    mobileOpen.style.display = 'flex';
  } else {
    // Desktop: iframe nativo com toolbar (inclui lupa / Ctrl+F)
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

// Hookar o editData e update para auto-salvar (modo real apenas)
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
  // Calcula a média de horas/dia configuradas nas frentes
  const totalHoras = frentes.length > 0
    ? Math.round(frentes.reduce((s, f) => s + (f.horas || 12), 0) / frentes.length)
    : 12;

  const now   = new Date();
  const horaAtual = now.getHours() + now.getMinutes() / 60;

  // Turno: considera início às 06h (turno diurno padrão)
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
  document.getElementById('jornada-horas-label').textContent =
    `${horasTrab.toFixed(1).replace('.',',')} h de ${totalHoras} h`;
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
    return `  • ${f.nome}: *${Math.round(tonD).toLocaleString('pt-BR')} t/dia* | R$${cTon}/t`;
  }).join('\n');

  const pct = metaG > 0 ? ((tTon / metaG) * 100).toFixed(1) : '—';
  const modo = modoSimulacao ? '📊 SIMULAÇÃO' : '✅ REAL';

  const texto =
`🌾 *CONTROLE TÉCNICO AGRÍCOLA*
📅 ${dataHora} | Modo: ${modo}
${'─'.repeat(32)}
🚜 *FRENTES DE COLHEITA*
${linhasFrente}
${'─'.repeat(32)}
📦 *Produção Total:* ${Math.round(tTon).toLocaleString('pt-BR')} t/dia
⛽ *Custo Diesel:* R$ ${Math.round(tCusto).toLocaleString('pt-BR')}/dia
🎯 *Meta (${metaG.toLocaleString('pt-BR')} t):* ${pct}%
${'─'.repeat(32)}
_Gerado pelo CTT Controle Agrícola_`;

  navigator.clipboard.writeText(texto)
    .then(() => showToast('✅ Resumo copiado! Cole no WhatsApp.'))
    .catch(() => {
      // Fallback para dispositivos sem clipboard API
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

/* filtrarTabela consolidada acima (chips + fazenda + status) */

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

// Hookar confirmarSalvar para mostrar toast
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
  // Alt + 1..5 navega entre abas
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

// Fechar modal ao clicar fora
document.getElementById('modal-cenario').addEventListener('click', function(e) {
  if (e.target === this) fecharModal();
});

// Tecla Enter no modal
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

  const tch = tons / area;                            // t/ha
  const tah = atr > 0 ? (tch * atr) / 1000 : 0;     // t açúcar/ha
  const acucarTotal = atr > 0 ? (tons * atr) / 1000 : 0;

  document.getElementById('res_tch_val').innerText    = tch.toFixed(1) + ' t/ha';
  document.getElementById('res_tah_val').innerText    = tah > 0 ? tah.toFixed(2) + ' t/ha' : '— t/ha';
  document.getElementById('res_tah_acucar').innerText = acucarTotal > 0 ? Math.round(acucarTotal).toLocaleString('pt-BR') + ' t' : '— t';
  document.getElementById('res_tch_container').style.display = 'grid';

  // Insight contextualizado
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
   IA (Claude API) + Fallback fixo
══════════════════════════════════════════════ */

/* ── Lista fixa de fallback (usada quando a API falha) ── */
/* ══════════════════════════════════════════════
   BANCO DE SABEDORIAS — Cana-de-Açúcar (100 itens)
   Seleção aleatória de 5 por sessão, sem API externa
══════════════════════════════════════════════ */
const BANCO_SABEDORIAS = [
  /* ── MATURAÇÃO & QUALIDADE ── */
  { tag: '🍬 ATR & Maturação', texto: 'O ATR (Açúcar Total Recuperável) ideal para colheita está acima de 130 kg/t. Iniciar o corte com ATR abaixo de 120 kg/t pode gerar descontos contratuais e reduzir a receita em até R$ 8/t.' },
  { tag: '🌡️ Amplitude Térmica', texto: 'Noites frescas (abaixo de 20°C) combinadas com dias secos aceleram o acúmulo de sacarose. Variedades tardias podem elevar o ATR em até 15% nessas condições — priorize esses talhões na programação de corte.' },
  { tag: '📊 Graus-Dia', texto: 'O modelo de Graus-Dia (base 18°C) estima o estágio de maturação sem laboratório. Acúmulos entre 1.200 e 1.800 GDA indicam maturação ativa — momento ideal para programar a colheita prioritária.' },
  { tag: '🔬 Brix de Campo', texto: 'O Brix medido com refratômetro portátil deve ser acima de 18° para confirmar maturação. Amostras abaixo de 16° Brix indicam colheita prematura, reduzindo a eficiência industrial e o pagamento por qualidade.' },
  { tag: '🧪 Aplicação de Maturadores', texto: 'Maturadores como etefom e sulfometuron-metil podem elevar o ATR em 8–15 kg/t em variedades intermediárias. Aplique 45–60 dias antes da colheita com temperatura acima de 20°C e sem chuva prevista por 24h.' },
  { tag: '📅 Janela de Colheita', texto: 'Cada variedade tem uma janela ideal de colheita de 45 a 90 dias. Coletar fora dessa janela — precoce ou tardiamente — reduz o ATR e pode iniciar a inversão de sacarose em glicose e frutose.' },
  { tag: '⚗️ Pureza do Caldo', texto: 'A pureza do caldo (relação Pol/Brix) deve ficar acima de 85% para eficiência industrial máxima. Valores abaixo indicam contaminação por impurezas ou maturação inadequada, impactando diretamente o rendimento da usina.' },
  { tag: '🌾 Pol da Cana', texto: 'A Pol (teor de sacarose aparente) é o principal indicador de pagamento. Variedades bem manejadas atingem Pol acima de 15%, enquanto talhões com estresse hídrico ou soqueiras velhas ficam abaixo de 12%.' },
  { tag: '🍬 Inversão de Sacarose', texto: 'Acima de 1.800 GDA ou após florescimento, a sacarose começa a se inverter em açúcares redutores. Priorize a colheita imediata dos talhões nessa fase para evitar perdas irreversíveis de qualidade.' },
  { tag: '📐 Amostragem de Maturidade', texto: 'Realize amostragem de maturidade em pelo menos 5% dos talhões a cada 15 dias durante a safra. Amostras do terço médio do colmo são as mais representativas para determinar o ponto ótimo de colheita.' },

  /* ── SOQUEIRA & LONGEVIDADE ── */
  { tag: '🌱 Longevidade da Soqueira', texto: 'Uma soqueira bem manejada produz por 5 a 7 cortes com produtividade sustentada. Os pilares são: corte de base rente, mínimo tráfego pós-colheita, adubação no tempo certo e controle de invasoras nas primeiras 4 semanas.' },
  { tag: '✂️ Corte de Base', texto: 'O corte de base rente ao solo é o maior fator de longevidade da soqueira. Regulagens incorretas elevam a altura de corte e reduzem a brotação em até 20%, comprometendo todos os cortes seguintes.' },
  { tag: '📏 Altura de Corte', texto: 'Calibre o corte de base com paquímetro após cada turno operacional. A altura ideal é de 0 a 5 cm acima do nível do solo. Cada centímetro excedente acima de 5 cm pode reduzir o stand em 8–12%.' },
  { tag: '🌿 Brotação Pós-Colheita', texto: 'A taxa de brotação da soqueira é avaliada 30 dias após o corte. Brotação abaixo de 70% indica necessidade de replantio parcial. Déficit hídrico nos primeiros 21 dias pós-corte é a principal causa de falhas.' },
  { tag: '🔄 Ciclo de Reforma', texto: 'Talhões com produtividade abaixo de 65 t/ha por dois cortes consecutivos devem ser considerados para reforma. O custo de manutenção de soqueiras improdutivas supera o investimento no replantio em 2 a 3 anos.' },
  { tag: '🌱 Stand de Colmos', texto: 'O stand ideal é de 12 a 18 colmos moíveis por metro linear. Contagens abaixo de 8 colmos/m indicam soqueira comprometida. Realize avaliações de stand aos 60 dias após cada corte para decisões de reforma.' },
  { tag: '🌾 Variedades Precoces', texto: 'Escalonar a colheita entre variedades precoces (P), médias (M) e tardias (T) mantém o ATR sustentado durante toda a safra. A proporção ideal é 30% P, 40% M e 30% T para equalizar o calendário de colheita.' },

  /* ── SOLO & NUTRIÇÃO ── */
  { tag: '🏋️ Compactação do Solo', texto: 'O tráfego intenso de reboques e rodotrens compacta o solo a até 40 cm de profundidade. Solo compactado reduz a absorção de água em até 60% e causa queda de 10–15 t/ha no próximo ciclo.' },
  { tag: '🚜 Tráfego Controlado', texto: 'Implementar o conceito de Tráfego Controlado (TCA) restringe o tráfego pesado a linhas fixas, preservando 85% da área sem compactação. Produtividades 12–18% maiores são relatadas em fazendas com TCA consolidado.' },
  { tag: '🧪 Calcário & pH', texto: 'O pH ideal para a cana-de-açúcar está entre 5,5 e 6,5. Solos com pH abaixo de 5,0 bloqueiam a absorção de N, P e K mesmo com adubação correta. Realize calagem com 6 a 12 meses de antecedência ao plantio.' },
  { tag: '💊 Adubação de Cobertura', texto: 'O N e K em cobertura devem ser aplicados entre 30 e 60 dias após o corte, quando a soqueira está em pleno perfilhamento. Atrasos de mais de 90 dias reduzem a eficiência da adubação em até 40%.' },
  { tag: '🌍 Matéria Orgânica', texto: 'Cada 1% de aumento na matéria orgânica do solo eleva a capacidade de retenção de água em 20 L/m³. A incorporação de palha pós-colheita é a estratégia mais econômica para aumentar a MO no sistema cana-de-açúcar.' },
  { tag: '🧂 Micronutrientes', texto: 'Deficiências de Boro (B) e Zinco (Zn) são frequentes em solos arenosos de cerrado. O Boro participa diretamente na translocação de sacarose — sua deficiência pode reduzir o ATR em 5–8 kg/t mesmo com macronutrientes em equilíbrio.' },
  { tag: '📊 Análise de Solo', texto: 'Realize análise de solo a cada 2 anos por talhão, coletando amostras em grid de 1 ha. A fertilidade variável dentro da mesma fazenda pode justificar recomendações de adubação com variação de até 200% entre pontos.' },
  { tag: '🌿 Vinhaça & Torta', texto: 'A vinhaça (bioestimulante líquido da destilação) fornece K, Ca e matéria orgânica. Aplicada corretamente (até 150 m³/ha/ano), substitui até 60% da adubação potássica, reduzindo custo sem comprometer a qualidade do solo.' },

  /* ── CLIMA & ÁGUA ── */
  { tag: '💧 Necessidade Hídrica', texto: 'A cana-de-açúcar demanda 1.200 a 1.500 mm bem distribuídos no ciclo. Déficits acima de 200 mm na fase vegetativa (3–7 meses) reduzem o TCH em até 25%. Monitore a evapotranspiração semanal para tomada de decisão em irrigação.' },
  { tag: '☔ Veranico', texto: 'Veranicos superiores a 21 dias durante o perfilhamento reduzem o número de colmos permanentes de forma irreversível. Sistemas de irrigação suplementar com 40 mm de lâmina por semana eliminam esse risco em regiões semiáridas.' },
  { tag: '❄️ Geada', texto: 'Geadas com temperatura abaixo de -2°C por mais de 4 horas destroem os meristemas apicais da cana. Talhões afetados devem ser avaliados em 15 dias: se a brotação lateral for superior a 60%, a colheita pode ser acelerada.' },
  { tag: '🌤️ Radiação Solar', texto: 'A cana-de-açúcar é altamente eficiente na conversão de radiação solar (C4). Dias com radiação acima de 20 MJ/m²/dia favorecem a fotossíntese máxima. Períodos nublados prolongados (>15 dias) reduzem o acúmulo de biomassa em até 18%.' },
  { tag: '🌡️ Temperatura Ideal', texto: 'A temperatura ótima para crescimento da cana está entre 28 e 34°C. Temperaturas acima de 38°C causam fechamento estomático e paralisia do crescimento. Temperaturas abaixo de 15°C reduzem o metabolismo e travam o perfilhamento.' },
  { tag: '🌊 Drenagem', texto: 'O encharcamento do solo por mais de 48h causa asfixia radicular e abertura de porta para patógenos de solo. Em áreas de várzea, drenos espaçados a cada 40 m e com declividade mínima de 0,1% são essenciais para a produtividade.' },

  /* ── PRAGAS & DOENÇAS ── */
  { tag: '🐛 Broca da Cana', texto: 'A Diatraea saccharalis (broca) é a praga de maior impacto econômico — cada 1% de intensidade de infestação reduz o TCH em 0,7 t/ha e o ATR em 1 kg/t. Monitore com amostragem mensal de 10 colmos por talhão durante a safra.' },
  { tag: '🦗 Cigarrinha das Raízes', texto: 'A cigarrinha Mahanarva fimbriolata injeta toxinas enquanto se alimenta, causando o sintoma de "cana-de-fogo". Infestações acima de 5 ninfas/m² justificam controle biológico com Metarhizium anisopliae (Boveril).' },
  { tag: '🔴 Carvão da Cana', texto: 'O carvão (Ustilago scitaminea) é a principal doença fúngica — identifique pelo chicote negro que emerge no ápice da planta. Elimine plantas doentes imediatamente e substitua por variedades resistentes nas próximas reformas.' },
  { tag: '🟡 Escaldadura', texto: 'A escaldadura das folhas (Xanthomonas albilineans) causa listras amarelas e pode matar a soqueira inteira. A doença se espalha pelo maquinário de colheita — desinfete os corte-toletes com hipoclorito de sódio a 10% entre talhões.' },
  { tag: '🦠 Raquitismo', texto: 'O raquitismo da soqueira (Leifsonia xyli) é sistêmico e reduz a produção em 10–30% sem sintomas visuais claros. Utilize sempre mudas tratadas termicamente (50°C por 2h) ou provenientes de viveiros certificados.' },
  { tag: '🐜 Cupins', texto: 'Cupins subterrâneos (Heterotermes tenuis) atacam as raízes e a base dos colmos, especialmente em áreas de reforma. Tratamento do sulco de plantio com inseticidas granulados é a medida preventiva mais eficaz e econômica.' },
  { tag: '🐞 Controle Biológico', texto: 'O controle biológico com Cotesia flavipes (parasitoide da broca) é uma das tecnologias mais rentáveis da canavicultura: custo de R$ 15–25/ha contra perdas evitadas de R$ 150–400/ha. Libere em até 30 dias após a detecção da praga.' },
  { tag: '🔍 MIP Cana', texto: 'O Manejo Integrado de Pragas (MIP) combina monitoramento periódico, nível de dano econômico e controle racional. Evite pulverizações preventivas — elas eliminam inimigos naturais e aumentam o custo de produção sem necessidade.' },

  /* ── COLHEITA & OPERAÇÕES ── */
  { tag: '⚙️ Eficiência Operacional', texto: 'Cada 1% de ganho na eficiência da colhedora equivale, em uma frente de 5 máquinas com 12h/dia, a +270 toneladas por dia a custo zero. Elimine paradas por ajuste mecânico, troca de picadores e falta de transbordo — são os maiores vilões.' },
  { tag: '📉 Perdas na Colheita', texto: 'Perdas totais na colheita mecanizada ficam entre 3% e 8% da produção bruta. Realize avaliações mensais pela metodologia do IAC para manter abaixo de 5%. Perdas no tolete picado respondem por 60% do total e são as mais controláveis.' },
  { tag: '🕐 Tempo de Fila', texto: 'Fila de reboques acima de 20 minutos indica gargalo logístico e reduz a eficiência da colhedora em cascata. Dimensione a frota de transbordo com 20% de margem operacional para absorver imprevistos mecânicos e de pesagem.' },
  { tag: '🌙 Operação Noturna', texto: 'Colheita noturna reduz o estresse térmico das máquinas e dos operadores, mas exige iluminação adequada (mínimo 200 lux na cabine) e monitoramento de fadiga. Rotação de turno com descanso mínimo de 11h é obrigatória por NR-31.' },
  { tag: '🚛 Tempo Cana-Moagem', texto: 'O intervalo entre o corte e a moagem deve ser inferior a 48h para qualidade máxima. Cada hora adicional após 24h reduz o ATR em 0,3–0,5 kg/t por inversão microbiológica. Priorize talhões próximos à usina no fim de turno.' },
  { tag: '🔧 Manutenção Preventiva', texto: 'Picadores desgastados aumentam os fragmentos abaixo de 15 cm em até 30%, prejudicando a eficiência de extração na usina. Troque os picadores a cada 600–800 t colhidas — a perda de ATR supera o custo das facas novas em 3:1.' },
  { tag: '📐 Regulagem de Extratores', texto: 'Os extratores primário e secundário regulados corretamente mantêm as impurezas vegetais abaixo de 3%. Impurezas acima de 5% geram penalização de desconto na pesagem e sobrecarregam o processo industrial da usina.' },
  { tag: '🗺️ Planejamento de Frentes', texto: 'O planejamento semanal de frentes de colheita deve considerar maturidade, distância, capacidade logística e previsão climática. Frentes mal planejadas geram ociosidade de colhedoras de até 35% — o maior custo oculto da operação.' },

  /* ── LOGÍSTICA & TRANSPORTE ── */
  { tag: '🚚 Dimensionamento de Frota', texto: 'A relação ideal entre colhedoras e transbordos é de 3 a 4 transbordos por colhedora em terreno plano. Em áreas com distância interna acima de 5 km, adicione 1 transbordo por colhedora para manter o fluxo contínuo.' },
  { tag: '⚖️ Controle de Pesagem', texto: 'Implante dupla pesagem (entrada e saída da usina) com rastreabilidade por talhão. Divergências acima de 0,5% devem gerar auditoria imediata — erros sistemáticos na pesagem acumulam prejuízo de centenas de toneladas por safra.' },
  { tag: '🛣️ Condição das Estradas', texto: 'Estradas internas em mau estado aumentam o consumo de combustível dos rodotrens em até 25% e provocam perdas por derramamento de cana. Reserve 2–3% do orçamento de custeio para manutenção viária interna.' },
  { tag: '📦 Carga Útil', texto: 'Rodotrens operando abaixo de 90% da carga útil legal representam ineficiência logística direta. Audite a carga média por viagem mensalmente — um desvio de 5 t/viagem em 50 viagens/dia equivale a 250 t não transportadas.' },
  { tag: '🔄 Rotatividade de Transbordo', texto: 'O ciclo ideal do transbordo (colhedora → balança) deve ser inferior a 45 minutos em fazendas de porte médio. Ciclos acima de 60 minutos indicam desbalanceamento entre colheita e transporte — revise o layout de frentes.' },

  /* ── SEGURANÇA DO TRABALHO ── */
  { tag: '⛑️ EPI Obrigatório', texto: 'O uso completo de EPI é obrigatório em todas as operações de campo: capacete, óculos, luvas, botina com biqueira e protetor auricular em operações com máquinas. Supervisores respondem legalmente por colaboradores sem EPI em atividade.' },
  { tag: '🔥 Risco de Incêndio', texto: 'Em épocas de seca, a palha da cana crua é altamente inflamável. Mantenha aceiros de 6 m nas divisas e pontos de acesso. Proíba fumar e realizar solda a menos de 50 m de cana em pé. Um incêndio de 50 ha pode causar prejuízo acima de R$ 150 mil.' },
  { tag: '😴 Fadiga Operacional', texto: 'Operadores de colhedora com mais de 10h contínuas de operação têm risco de acidente 4x maior. Implante pausas obrigatórias de 15 min a cada 3h e rodízio de funções. A NR-31 é clara quanto à responsabilidade do empregador.' },
  { tag: '🚨 Parada de Emergência', texto: 'Todos os operadores de maquinário agrícola devem saber localizar e acionar o botão de parada de emergência em menos de 5 segundos. Realize simulações mensais — a ausência desse treinamento é autuada pelo MTE com multas a partir de R$ 8 mil.' },
  { tag: '🧯 Extintor nas Máquinas', texto: 'Colhedoras, transbordos e tratores devem ter extintor ABC de 6 kg em local visível e acessível. Verifique a validade e o lacre a cada 30 dias. Um incêndio elétrico em uma colhedora sem extintor operacional pode resultar em perda total de R$ 1,5 mi.' },
  { tag: '⚠️ Sinalização de Campo', texto: 'Implante sinalização de velocidade máxima (20 km/h) e obrigatoriedade de buzina em cruzamentos de estradas internas. Acidentes envolvendo rodotrens em cruzamentos de fazenda são os mais frequentes e com maior gravidade.' },
  { tag: '🩺 PCMSO Agrícola', texto: 'O Programa de Controle Médico de Saúde Ocupacional (PCMSO) é obrigatório para todo trabalhador rural. Exames periódicos detectam doenças ocupacionais precocemente — lombalgia e perda auditiva são as mais comuns em operadores de máquinas.' },
  { tag: '🌡️ Golpe de Calor', texto: 'Com temperatura acima de 32°C e umidade relativa alta, o risco de insolação é crítico para trabalhadores de campo. Garanta água potável em abundância (500ml/hora por trabalhador), pausas na sombra e identifique sinais de exaustão térmica precocemente.' },
  { tag: '⚡ Risco Elétrico', texto: 'A operação de colhedoras e guindautos próximo a linhas de transmissão exige distância mínima de 10 m para redes de baixa tensão e 15 m para alta tensão. Acidente elétrico é a principal causa de morte por acidente de trabalho no campo.' },
  { tag: '🛡️ DDS Diário', texto: 'O Diálogo Diário de Segurança (DDS) de 5 minutos antes do turno reduz acidentes em até 40%. Temas como estado de conservação dos EPI, condições climáticas e check-list das máquinas são os mais relevantes para a rotina agrícola.' },

  /* ── MEIO AMBIENTE & SUSTENTABILIDADE ── */
  { tag: '🌿 Palha na Superfície', texto: 'A manutenção da palha sobre o solo (colheita crua) aumenta a retenção de umidade em até 35%, reduz a erosão em 80% e eleva a matéria orgânica em 0,2% por ciclo. É a prática mais impactante para sustentabilidade do sistema.' },
  { tag: '🌊 APP e Nascentes', texto: 'A preservação de APPs (Áreas de Preservação Permanente) ao redor de córregos e nascentes é obrigatória por lei — 30 m para rios de até 10 m de largura. Plantios em APP geram embargos, multas e impossibilidade de obter financiamento rural.' },
  { tag: '♻️ Vinhoto como Fertilizante', texto: 'Cada litro de etanol produz 10–15 L de vinhaça. Aplicada dentro da taxa legal (até 150 m³/ha/ano), a vinhaça reduz o custo com fertilizantes potássicos em até 60% e melhora a estrutura do solo ao longo dos ciclos.' },
  { tag: '🌱 Sequestro de Carbono', texto: 'Um hectare de cana-de-açúcar sequestra em média 15–20 t de CO₂/ano, considerando o sistema raiz+palha+colmo. A cana é uma das culturas com melhor balanço de carbono entre as culturas energéticas globais — use isso a seu favor na rastreabilidade.' },
  { tag: '💧 Uso Eficiente da Água', texto: 'A cana irrigada consome 150–200 m³/t de colmo — menos que o arroz e o algodão. Sistemas de gotejo subsuperficial reduzem esse consumo em até 40%. Outorgas de irrigação devem estar regulares antes do início de qualquer sistema.' },
  { tag: '🐝 Polinizadores', texto: 'Embora a cana seja uma gramínea de polinização pelo vento, a biodiversidade de polinizadores nas bordas do canavial indica saúde ambiental da propriedade. Projetos com corredores ecológicos melhoram a imagem da fazenda junto a certificadoras.' },

  /* ── MECANIZAÇÃO & TECNOLOGIA ── */
  { tag: '🛰️ Agricultura de Precisão', texto: 'Mapas de produtividade por NDVI permitem identificar bolsões de baixa produção com precisão de 10 m. Cruzar esses mapas com análise de solo e histórico de safra reduz o custo de reforma ao tratar apenas as áreas críticas.' },
  { tag: '📡 Telemetria de Máquinas', texto: 'Sistemas de telemetria em colhedoras fornecem dados em tempo real de consumo, produtividade e falhas. Fazendas que utilizam telemetria reduzem o custo de manutenção corretiva em 22% e aumentam a disponibilidade mecânica em 15%.' },
  { tag: '🤖 Autoguidagem', texto: 'Sistemas de autoguidagem por RTK reduzem a sobreposição de linhas de colheita de 8–12% para menos de 2%. Menos sobreposição significa maior área efetivamente colhida e menor compactação nas entrelinhas.' },
  { tag: '📱 App de Monitoramento', texto: 'A digitalização do monitoramento de pragas, falhas de brotação e avaliação de perdas permite tomadas de decisão 3x mais rápidas que o registro em papel. Dados históricos por talhão são a base para qualquer sistema de gestão por resultado.' },
  { tag: '🔋 Eletrificação de Frotas', texto: 'Transbordos elétricos já operam em alguns grupos no Brasil com redução de 60% no custo de combustível por tonelada transportada. A tendência de eletrificação agrícola chegará ao segmento de cana até 2030 — prepare a infraestrutura elétrica da fazenda.' },
  { tag: '📊 Dashboard Operacional', texto: 'Indicadores-chave de desempenho (KPIs) devem ser acompanhados diariamente: TCH médio, eficiência de colhedoras (%), perdas (%), e tempo de ciclo logístico. O que não é medido não é gerenciado.' },

  /* ── FITOTECNIA & VARIEDADES ── */
  { tag: '🌾 Escolha de Variedades', texto: 'A escolha de variedades deve considerar o tipo de solo, o ciclo (precoce/médio/tardio) e a resistência às principais doenças da região. Um mapa varietal bem estruturado é tão importante quanto o plano de adubação.' },
  { tag: '🧬 Renovação Varietal', texto: 'Talhões com mais de 15 anos na mesma variedade acumulam vírus, nematóides e declínio de produtividade. A renovação varietal com materiais genéticos recentes do RB ou CTC pode elevar o TCH em 12–20% nas áreas reformadas.' },
  { tag: '🌱 Plantio de Mudas Sadias', texto: 'Mudas provenientes de viveiros certificados com tratamento térmico (50°C por 2h) eliminam o raquitismo e a escaldadura desde o início do ciclo. O custo extra do muda tratada é recuperado no primeiro corte com ganho mínimo de 8 t/ha.' },
  { tag: '📏 Espaçamento de Plantio', texto: 'O espaçamento duplo alternado (1,40 m x 0,90 m) é a configuração mais adotada para colheita mecanizada no Brasil. Garante passagem adequada dos rodados sem esmagar touceiras e otimiza a captação solar no dossel.' },
  { tag: '🌿 Adubação de Plantio', texto: 'O fósforo no sulco de plantio é o nutriente mais crítico para o estabelecimento das raízes. Aplique no mínimo 80 kg de P₂O₅/ha no plantio — o fósforo tem mobilidade mínima no solo e não pode ser corrigido em cobertura.' },

  /* ── GESTÃO & ECONOMIA ── */
  { tag: '💰 Custo por Tonelada', texto: 'O custo total de produção da cana no Centro-Sul varia de R$ 75 a R$ 130/t colhida, dependendo do perfil de mecanização e distância da usina. Conhecer seu custo por talhão é o primeiro passo para a gestão por resultado.' },
  { tag: '📈 ATR × Receita', texto: 'Um aumento de 5 kg/t no ATR médio da safra equivale, em uma fazenda de 3.000 ha com produtividade de 80 t/ha, a uma receita adicional de aproximadamente R$ 720 mil. A qualidade é tão importante quanto o volume.' },
  { tag: '🤝 Contrato com Usina', texto: 'Entenda os gatilhos de bonificação e penalização do seu contrato com a usina. ATR, impurezas, horário de entrega e prazo de permanência na fila são os principais fatores que impactam o preço final recebido por tonelada.' },
  { tag: '📋 Planejamento de Safra', texto: 'O planejamento da safra deve começar 90 dias antes do início da moagem. Cronograma de reforma, mapa varietal, programação de manutenção das máquinas e dimensionamento de pessoal são os quatro pilares de um plano robusto.' },
  { tag: '📉 Gestão de Riscos', texto: 'Principais riscos na canavicultura: climático (seca/geada), de mercado (preço do açúcar e etanol), fitossanitário (epidemias) e operacional (quebra de máquinas). Tenha pelo menos os riscos climático e operacional cobertos por seguro ou reserva de capital.' },
  { tag: '👥 Gestão de Pessoas', texto: 'O turnover elevado de operadores de colhedora é um dos maiores custos ocultos da operação mecanizada. Programas de capacitação, plano de carreira e participação nos resultados operacionais reduzem a rotatividade em até 50%.' },

  /* ── IRRIGAÇÃO ── */
  { tag: '💧 Irrigação de Salvação', texto: 'Uma lâmina de 40 mm aplicada em até 10 dias após o corte evita a mortalidade de gemas em veranicos críticos. O custo da irrigação de salvação (R$ 120–180/ha) é 10x menor que o custo de um replantio emergencial.' },
  { tag: '🌊 Gotejo Subsuperficial', texto: 'O gotejo subsuperficial instalado a 30–40 cm de profundidade entrega água diretamente na zona radicular, eliminando perdas por evaporação. Redução de 40% no consumo de água e ganhos de 15–25% em TCH são documentados em condições de déficit hídrico.' },
  { tag: '📡 Monitoramento de Umidade', texto: 'Sensores de umidade do solo (tensiômetros ou TDR) instalados a 20 cm e 40 cm de profundidade permitem irrigar com precisão, evitando tanto o déficit quanto o excesso. Irrigação em excesso lixivia nutrientes e compacta o solo.' },
  { tag: '⏰ Turno de Irrigação', texto: 'A irrigação por aspersão deve ser programada preferencialmente no período noturno para reduzir perdas por evaporação em até 30%. Evite irrigar com vento acima de 3 m/s — a uniformidade de distribuição cai abaixo de 70%.' },

  /* ── REGULAMENTAÇÃO & BOAS PRÁTICAS ── */
  { tag: '📜 NR-31 Rural', texto: 'A NR-31 (Norma Regulamentadora de Segurança no Trabalho Rural) estabelece obrigações sobre treinamento, EPI, maquinário e condições de trabalho. Fiscalizações do MTE podem gerar multas de R$ 2 mil a R$ 200 mil por infração.' },
  { tag: '🏅 Certificação Bonsucro', texto: 'A certificação Bonsucro exige rastreabilidade por talhão, balanço de GEE, cumprimento trabalhista e boas práticas agrícolas. Empresas certificadas têm acesso a mercados premium de açúcar e etanol com prêmio de até 15% sobre o preço base.' },
  { tag: '📋 CAR e Regularidade', texto: 'O Cadastro Ambiental Rural (CAR) é obrigatório para todos os imóveis rurais. Propriedades irregulares perdem acesso a crédito rural, seguro agrícola e possibilidade de comercialização com usinas exigentes no critério socioambiental.' },
  { tag: '🌿 Queima Controlada', texto: 'A queima pré-colheita está proibida em mais de 80% da área cultivável do Centro-Sul desde 2021. Além da ilegalidade, a queima destrói a matéria orgânica da palha e eleva o risco de incêndio não controlado nas propriedades vizinhas.' },
  { tag: '🔍 Rastreabilidade', texto: 'Sistemas de rastreabilidade por talhão (origem, data de corte, variedade, ATR e insumos aplicados) são exigidos por certificadoras e já são critério de seleção para contratos com usinas exportadoras. Implante agora — o mercado vai exigir em breve.' },

  /* ── BOAS PRÁTICAS GERAIS ── */
  { tag: '🌟 Produtor de Referência', texto: 'Produtores de referência no Centro-Sul alcançam 120–150 t/ha de TCH com manejo integrado de solo, água, nutrição e pragas. A diferença para a média regional (75–85 t/ha) não está nas máquinas, mas na qualidade das decisões agronômicas.' },
  { tag: '📚 Capacitação Contínua', texto: 'Supervisores de campo que participam de pelo menos 40h de treinamento/ano tomam decisões 30% mais assertivas em situações de crise operacional. Invista em capacitação técnica da equipe como ativo estratégico da fazenda.' },
  { tag: '🌐 Benchmarking', texto: 'Compare seus indicadores com a média do setor (UNICA, CTC, RIDESA) pelo menos uma vez por safra. Benchmarking estruturado identifica os gaps de maior oportunidade e evita desperdício de recursos em áreas já otimizadas.' },
  { tag: '🤝 Assistência Técnica', texto: 'Fazendas com visita técnica mensal de agrônomo especializado em cana apresentam produtividade média 18% superior às que operam sem assistência técnica regular. O retorno sobre o investimento em AT supera 10:1 em propriedades acima de 500 ha.' },
  { tag: '🔭 Olho no Futuro', texto: 'O etanol de 2ª geração (a partir de palha e bagaço) já é realidade comercial no Brasil. Fazendas que preservam a palha e registram o balanço de biomassa por talhão estarão posicionadas para contratos de fornecimento de biomassa além da cana convencional.' },
  { tag: '📖 Registro de Campo', texto: 'Mantenha o caderno de campo atualizado com data, talhão, prática realizada, produto, dose e operador responsável. Esse registro é a base para rastreabilidade, resolução de disputas contratuais e aprendizado entre safras.' },
  { tag: '💡 Melhoria Contínua', texto: 'A metodologia Kaizen aplicada à operação agrícola — pequenas melhorias diárias e sistemáticas — gera resultados superiores a grandes investimentos pontuais. Incentive operadores a propor melhorias: quem opera a máquina conhece o problema melhor que o gestor.' },
  { tag: '🌱 Próxima Geração', texto: 'A cana-de-açúcar brasileira é exemplo global de eficiência energética e agroindustrial. Preservar esse legado passa por adotar práticas sustentáveis hoje: solo saudável, água preservada e trabalhadores valorizados são a base da cana do futuro.' },
];

/* ══════════════════════════════════════════════
   ESTADO DO MÓDULO SABEDORIA
══════════════════════════════════════════════ */
let SABEDORIAS        = [];   // 5 frases sorteadas para esta sessão
let sabedoriaAtual    = 0;
let sabedoriaTimer    = null;
let sabedoriaAlertaAtivo = false;

/* ── Sorteia N itens únicos do banco ── */
function sortearSabedorias(n) {
  const copia = [...BANCO_SABEDORIAS];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, n).map(s => ({ ...s, alert: null }));
}

/* ── Injeta alerta de produtividade crítica no topo da fila ── */
function injetarSabedoriaAlerta(tch) {
  if (tch > 0 && tch < 65 && !sabedoriaAlertaAtivo) {
    SABEDORIAS.unshift({
      tag: '🚨 Alerta de Produtividade',
      alert: `TCH Baixo: ${tch.toFixed(1)} t/ha`,
      texto: `TCH calculado (${tch.toFixed(1)} t/ha) abaixo da média regional de 65 t/ha. Causas mais prováveis: (1) soqueira envelhecida com perda de stand, (2) estresse hídrico acumulado nos últimos 60 dias, (3) deficiência de N e K na cobertura. Recomenda-se avaliação agronômica de campo antes do próximo ciclo.`,
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

    badgeWrap.innerHTML = s.alert
      ? `<div class="sabedoria-alert-badge">⚠️ ${s.alert}</div>`
      : '';

    if (tagEl) {
      if (s.alert) {
        tagEl.textContent = '🚨 Alerta de Campo';
        tagEl.style.background = 'rgba(255,80,0,0.35)';
      } else {
        tagEl.textContent = `🌾 ${s.tag}`;
        tagEl.style.background = 'rgba(255,255,255,0.18)';
      }
    }

    // Dots de navegação (um por frase sorteada)
    const total = SABEDORIAS.length;
    dotsEl.innerHTML = Array.from({ length: total }, (_, i) =>
      `<div class="sabedoria-dot${i === idx ? ' active' : ''}"></div>`
    ).join('');

    textoEl.classList.remove('fadding');
  }, 340);
}

/* ── Avança para a próxima dica; ao completar o ciclo, sorteia 5 novas ── */
function proximaSabedoria() {
  sabedoriaAtual++;
  if (sabedoriaAtual >= SABEDORIAS.length) {
    // Resorteio mantendo alerta no topo se existir
    const alertas = SABEDORIAS.filter(s => s.alert !== null);
    SABEDORIAS = [...alertas, ...sortearSabedorias(5)];
    sabedoriaAtual = 0;
  }
  renderSabedoria(sabedoriaAtual);
  clearInterval(sabedoriaTimer);
  sabedoriaTimer = setInterval(proximaSabedoria, 20000);
}

/* ── Inicia o módulo com 5 frases aleatórias ── */
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
    // Período: últimos N dias definidos pelo usuário (padrão 120)
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
    const endStr   = fmtData(new Date(hoje.getTime() - 86400000)); // ontem

    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,ALLSKY_SFC_SW_DWN&community=AG&longitude=${lon}&latitude=${lat}&start=${startStr}&end=${endStr}&format=JSON`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    const tmax = data.properties.parameter.T2M_MAX;
    const tmin = data.properties.parameter.T2M_MIN;
    const rad  = data.properties.parameter.ALLSKY_SFC_SW_DWN;

    const BASE_TEMP = 18; // Base biológica da cana
    let gdaTotal = 0;
    let diasValidos = 0;
    let tempMedia = 0;
    let radMedia = 0;

    const datas = Object.keys(tmax).sort();
    const nDias = datas.length;

    datas.forEach(d => {
      const mx = tmax[d], mn = tmin[d], r = rad[d];
      if (mx <= -900 || mn <= -900) return; // missing data
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

    // Fase fenológica estimada por GDA acumulado (período selecionado)
    let faseTexto, faseDescricao;
    if (gdaTotal < 600)  {
      faseTexto = '🌱 Brotação / Perfilhamento';
      faseDescricao = `<strong>Fase inicial (0–600 GDA):</strong> A cana encontra-se em pleno estabelecimento. Os perfilhos primários e secundários estão se formando. É o período mais crítico para garantia do estande. Atenção especial ao controle de plantas daninhas (supressão de até 80% do rendimento se mal manejadas) e à disponibilidade hídrica — déficit nessa fase pode reduzir o número de colmos permanentes de forma irreversível. <em>Recomendação:</em> Não aplicar herbicidas sistêmicos. Priorizar cobertura de solo e irrigação de estabelecimento.`;
    } else if (gdaTotal < 1000) {
      faseTexto = '📈 Crescimento Vegetativo';
      faseDescricao = `<strong>Fase de crescimento intenso (600–1000 GDA):</strong> A cana entra no pico de elongação dos colmos, podendo acrescentar até 10 cm/dia em condições ideais. Neste período ocorre a maior absorção de N, K e P. A eficiência fotossintética é máxima. O índice de área foliar (IAF) atinge seu pico. <em>Recomendação:</em> Avaliar necessidade de adubação de cobertura nitrogenada e potássica. Monitorar brocas (<em>Diatraea saccharalis</em>) intensamente. Irrigação por gotejo ou aspersão garante até 20% a mais de TCH.`;
    } else if (gdaTotal < 1400) {
      faseTexto = '🔄 Transição / Pré-Maturação';
      faseDescricao = `<strong>Fase de pré-maturação (1000–1400 GDA):</strong> O crescimento vegetativo desacelera e a planta começa a direcionar fotoassimilados para o acúmulo de sacarose nos colmos. O teor de Pol (pureza do caldo) começa a subir. Esta janela é estratégica para a aplicação de maturadores químicos (etefon, glifosato subdose, sulfometuron) — a resposta tende a ser excelente entre 1100–1300 GDA. <em>Recomendação:</em> Programar aplicação aérea ou terrestre de maturador. Iniciar amostragem de maturidade (Brix e Pol) para orientar o planejamento de colheita.`;
    } else if (gdaTotal < 1800) {
      faseTexto = '🍬 Maturação Ativa';
      faseDescricao = `<strong>Fase de maturação ativa (1400–1800 GDA):</strong> A sacarose acumulada nos colmos está no pico ou próxima do pico sazonal. O ATR (Açúcar Total Recuperável) tende a atingir valores máximos nessa janela. A fibra do colmo está estabilizada, favorecendo a eficiência de extração industrial. <em>Recomendação:</em> Priorizar a colheita dos talhões mais maduros. Monitorar a previsão climática — chuvas excessivas diluem o caldo e reduzem o ATR. Organizar a logística de transporte para minimizar o tempo entre corte e moagem (&lt;48h ideal).`;
    } else {
      faseTexto = '⏳ Maturação Plena / Sobrematuração';
      faseDescricao = `<strong>⚠️ Sobrematuração (acima de 1800 GDA):</strong> Atenção máxima! Nesta fase pode ocorrer a inversão da sacarose em glicose e frutose, reduzindo drasticamente o ATR e prejudicando o rendimento industrial. Também há risco de florescimento (<em>chochamento</em>) e senescência precoce em variedades mais precoces. <em>Recomendação emergencial:</em> Antecipar a colheita dos talhões mais antigos com urgência. Comunicar a usina sobre possível queda de qualidade. Rever o calendário de safra e, se possível, escalonar os cortes pelos talhões de maior produtividade histórica.`;
    }

    // Progresso da GDA (meta ~1800 para maturação plena)
    const metaGDA = 1800;
    const pctGDA  = Math.min((gdaTotal / metaGDA) * 100, 100);

    badge.className = 'gda-status-badge ok';
    badge.textContent = `✅ ${nDias} de ${numDias} dias`;

    container.innerHTML = `
      <div class="gda-big-val">
        <div class="gda-big-num">${Math.round(gdaTotal).toLocaleString('pt-BR')}</div>
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
    container.innerHTML = `
      <div class="insight-item warn" style="margin-top:10px;">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Não foi possível acessar a NASA POWER API no momento. Verifique sua conexão ou tente novamente em alguns instantes. <br><small style="opacity:0.7;">Erro: ${err.message}</small></span>
      </div>
      <p style="font-size:10px; color:var(--text-3); margin-top:8px; padding: 0 2px;">O painel continua funcionando normalmente com dados manuais.</p>`;
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
    // OSRM API pública — sem key
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

    // Cálculos logísticos
    const duracaoMin       = Math.round(duracaoS / 60);
    const duracaoH         = Math.floor(duracaoMin / 60);
    const duracaoResto     = duracaoMin % 60;
    const etaLabel         = duracaoH > 0 ? `${duracaoH}h ${duracaoResto}min` : `${duracaoMin} min`;

    // Ciclo completo do caminhão: ida + descarga (15 min estimados) + volta
    const cicloCam_min = duracaoMin * 2 + 15;

    // Capacidade da frota em 24h
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
            <span class="ef-val">${Math.round(capacidadeTotal24h).toLocaleString('pt-BR')} t</span>
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
    container.innerHTML = `
      <div class="insight-item warn" style="margin-top:10px;">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Não foi possível calcular a rota via OSRM. Verifique as coordenadas e a conexão com a internet.<br><small style="opacity:0.7;">Erro: ${err.message}</small></span>
      </div>
      <p style="font-size:10px; color:var(--text-3); margin-top:8px; padding:0 2px;">Use a estimativa manual: Distância ÷ 60 km/h para uma aproximação do ETA.</p>`;
    showToast('❌ Erro ao calcular rota OSRM', 'error');
  }
}

function atualizarFrotaETA() {
  // Recalcula somente se já existe resultado exibido
  const container = document.getElementById('eta-result-container');
  if (container && container.querySelector('.eta-result-card')) {
    calcularETA();
  }
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */

// Restaurar estado persistido (frentes reais, meta, diesel)
restaurarEstadoReal();

renderFrentes();
update();
carregarDadosGATEC();
atualizarSelectCenarios();

// Pré-carrega dados de plantio em background para o card da home
setTimeout(() => {
  if (typeof _garantirSafraCarregada === 'function') {
    _garantirSafraCarregada('26_27');
    _garantirSafraCarregada('25_26');
  }
}, 1500);

// Dark mode
restaurarDarkMode();

// Relógio + jornada em tempo real (atualiza a cada 30s)
atualizarRelogio();
setInterval(atualizarRelogio, 30000);

// Auto-salvar ao alterar meta ou diesel
document.getElementById('meta_val').addEventListener('input', () => { if (!modoSimulacao) salvarEstadoReal(); });
document.getElementById('diesel_val').addEventListener('input', () => { if (!modoSimulacao) salvarEstadoReal(); });

// Auto-salvar ao adicionar/remover frente (patch nas funções globais)
const _addFrenteOrig = addFrente;
addFrente = function() { _addFrenteOrig(); if (!modoSimulacao) salvarEstadoReal(); };
const _removeFrenteOrig = removeFrente;
removeFrente = function(id) { _removeFrenteOrig(id); if (!modoSimulacao) salvarEstadoReal(); };

// Polling automático: re-carrega planilha GATEC a cada 5 minutos
const GATEC_POLL_INTERVAL = 3 * 60 * 1000; // 1 minutos em ms
setInterval(async () => {
  // Só sincroniza se online — evita tentativas desnecessárias offline
  if (!navigator.onLine) return;
  await carregarDadosGATEC();
  await carregarDadosConfOS();
}, GATEC_POLL_INTERVAL);

// Verificar conexão ao iniciar
atualizarStatusConexao();

/* ── Toggle collapsible sub-cards ── */
function toggleCard(id) {
  const card = document.getElementById(id);
  if (!card) return;
  card.classList.toggle('open');
}

// Colapsável para cards de Tratos Culturais — acionado pelo header clicável
function toggleTratosCard(headerEl) {
  const card = headerEl.closest('.tratos-card-collapsible');
  if (!card) return;
  card.classList.toggle('open');
}
  /* ══════════════════════════════════════════════
   SERVICE WORKER — SUPORTE OFFLINE / PWA
══════════════════════════════════════════════ */
/* ══════════════════════════════════════════════
   PWA INSTALL PROMPT
══════════════════════════════════════════════ */
(function() {
  const jaInstalado =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://');

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

  // Chrome / Edge / Android
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!bannerJaDismissed()) pwaMostrarBanner();
  });

  // iOS Safari (não tem beforeinstallprompt)
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
  if (isIOS && isSafari && !bannerJaDismissed()) {
    window.addEventListener('DOMContentLoaded', () => {
      const btnInstalar = document.getElementById('pwa-btn-instalar');
      const textoSub = document.querySelector('.pwa-banner-text span');
      if (btnInstalar) {
        btnInstalar.innerHTML = '<i class="fas fa-share-square"></i> Como instalar';
        btnInstalar.onclick = () => {
          if (typeof showToast === 'function')
            showToast('No Safari: toque em Compartilhar → "Adicionar à Tela Inicial"', 'info', 5000);
          pwaFecharBanner();
        };
      }
      if (textoSub) textoSub.textContent = 'Adicione à tela inicial para acesso rápido';
      pwaMostrarBanner();
    });
  }
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[SW] Registrado com sucesso. Escopo:', reg.scope);

        // Notifica quando uma nova versão estiver disponível
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('🔄 Nova versão disponível! Recarregue o app para atualizar.', 'info', 6000);
            }
          });
        });
      })
      .catch(err => console.warn('[SW] Falha no registro:', err));
  });
}


// Iniciar rotação de Sabedoria de Campo
iniciarSabedoria();

// Datas do histórico: máximo = ontem, mínimo = 1940
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
   Fonte: aba PCP — terceira aba da planilha (gid=724202507)
══════════════════════════════════════════════ */
(function() {
  'use strict';

  // ── URL da aba PCP (3ª aba da planilha) ──────────────────────────────────
  // Se não carregar, confirme o gid em: Arquivo → Publicar na web → selecione "PCP" → copie o link CSV.
  const URL_TRATOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTIIUGH-g6vlowVBAAkgoPwZd1EPJPJS8PzgOEWyDPito38Ii8qzOHaSh1PioGGMLNbwFJPDMzwsA7/pub?gid=724202507&single=true&output=csv';

  const ALERTA_DOSE_PCT = 10;

  window._tratosDados     = null;
  window._tratosFiltrados = null;
  window._tratosCols      = null;
  let   _tratosIniciado   = false;

  window.iniciarModuloTratos = iniciarModuloTratos;
  window.carregarDadosTratos = carregarDadosTratos;
  window.filtrarTratos       = filtrarTratos;
  window.exportarTratosExcel = exportarTratosExcel;
  window.tratosSSAbrir       = tratosSSAbrir;
  window.tratosSSFiltrar     = tratosSSFiltrar;
  window.tratosSSLimpar      = tratosSSLimpar;

  // ── Lazy init ────────────────────────────────────────────────────────────
  function iniciarModuloTratos() {
    if (!_tratosIniciado) {
      _tratosIniciado = true;
      carregarDadosTratos();
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
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
    return String(v == null ? '—' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Detecção robusta de colunas ──────────────────────────────────────────
  // Remove acentos e caracteres especiais, compara por inclusão
  function detectarColunas(fields) {
    const norm = s => String(s).toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Z0-9]/g,'');

    function findCol(candidates) {
      // 1) match exato
      for (const kw of candidates) {
        const kwn = norm(kw);
        const f = fields.find(c => norm(c) === kwn);
        if (f) return f;
      }
      // 2) match parcial
      for (const kw of candidates) {
        const kwn = norm(kw);
        const f = fields.find(c => norm(c).includes(kwn));
        if (f) return f;
      }
      return '';
    }

    // Candidatos ordenados por especificidade (mais específico primeiro)
    return {
      colData      : findCol(['DATA APLICACAO','DATAAPLIC','DT APLIC','DATA']),
      colOS        : findCol(['NR OS','NROS','NR. O.S.','N OS','NUMEROOS','OS']),
      colCodProd   : findCol(['COD PRODUTO','CODPROD','CODIGO PRODUTO','COD PROD']),
      colDescProd  : findCol(['DESC PRODUTO','DESCPROD','DESCRICAO PRODUTO','NOME PRODUTO','PRODUTO']),
      colCodOp     : findCol(['COD OPERACAO','CODOP','CODIGO OPERACAO','COD OP']),
      colDescOp    : findCol(['DESC OPERACAO AGR','DESCOPERACAOAGR','OPERACAO AGR','DESCOPERACAO','OPERACAO AGRICOLA','OPERACAO']),
      colCodFazenda: findCol(['COD FAZENDA','CODFAZENDA','CODIGO FAZENDA','COD FAZ','CODFAZ']),
      colFazenda   : findCol(['DESCRICAO FAZENDA','DESCRICAOFAZENDA','DESCRICAO FAZ','DESC FAZENDA','DESCFAZENDA','NOME FAZENDA','NOMEFAZENDA','FAZENDA','FARM','PROPRIEDADE','UNIDADE','LOCAL']),
      colArea      : findCol(['AREA APLICADA','AREAAPLIC','AREA APLIC','AREA','HA']),
      colDoseRec   : findCol(['DOSE RECOMENDADA','DOSEREC','DOSE REC','RECOMENDADA']),
      colDoseAplic : findCol(['DOSE APLICADA','DOSEAPLIC','DOSE APLIC','APLICADA']),
    };
  }

  // ── Popula <select> com valores únicos ordenados ─────────────────────────
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

  // ── Popula <select> com "Cód · Desc" como label e value = valor exato da coluna ──
  // Se colDesc não detectada, usa colCod como fallback.
  // value sempre = o valor RAW da coluna usada — filtrarTratos compara direto com o mesmo campo.
  function popularSelectCodDesc(id, dados, colCod, colDesc, defaultLabel) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const colValor = colDesc || colCod; // coluna cujo valor vai para o filtro
    if (!colValor) return;
    const anterior = sel.value;
    // mapa: valorFiltro → cod (para montar label visual)
    const mapa = {};
    dados.forEach(r => {
      const val = (r[colValor] || '').trim();
      const cod = (colCod && colCod !== colValor) ? (r[colCod] || '').trim() : '';
      if (val && !mapa[val]) mapa[val] = cod;
    });
    const vals = Object.keys(mapa).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    sel.innerHTML = `<option value="">${defaultLabel}</option>`;
    vals.forEach(val => {
      const o = document.createElement('option');
      o.value = val;                              // value = valor exato da linha — sem transformação
      const cod = mapa[val];
      o.textContent = cod ? `${cod} · ${val}` : val;
      if (val === anterior) o.selected = true;
      sel.appendChild(o);
    });
    // Garante que o select não fique em estado inconsistente após repopular
    if (anterior && !vals.includes(anterior)) sel.value = '';
  }

  // Lê o value de um select de forma segura (sem depender de comportamento nativo variável)
  function selectVal(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    return (el.options[el.selectedIndex]?.value || '').trim();
  }

  /* ══════════════════════════════════════════════════════════════
     SEARCH-SELECT CUSTOMIZADO (Produto / Fazenda / Operação)
     — O <select> real fica oculto e é a única fonte de verdade.
     — O componente visual só lê as <option> dele e, ao escolher,
       seta sel.value + dispara 'change' para reusar filtrarTratos()
       sem duplicar nenhuma lógica de filtro já existente.
  ══════════════════════════════════════════════════════════════ */
  function _tratosSSRefs(selectId) {
    const sel    = document.getElementById(selectId);
    const wrap   = document.getElementById('ss-' + selectId);
    if (!sel || !wrap) return null;
    const input  = wrap.querySelector('.tratos-ss-input');
    const lista  = wrap.querySelector('.tratos-ss-lista');
    const clearBtn = wrap.querySelector('.tratos-ss-clear');
    return { sel, wrap, input, lista, clearBtn };
  }

  // Monta a lista de opções (a partir do <select> real) e aplica filtro de texto opcional
  function _tratosSSRenderLista(selectId, termo) {
    const r = _tratosSSRefs(selectId);
    if (!r) return;
    const { sel, lista } = r;
    const termoNorm = (termo || '').trim().toLowerCase();
    const opts = Array.from(sel.options).filter(o => o.value !== ''); // ignora "— Todos —"

    const filtradas = !termoNorm
      ? opts
      : opts.filter(o => o.textContent.toLowerCase().includes(termoNorm));

    if (filtradas.length === 0) {
      lista.innerHTML = `<div class="tratos-ss-opt ss-empty">Nenhum resultado</div>`;
      return;
    }

    lista.innerHTML = filtradas.map(o => {
      const selecionado = o.value === sel.value && sel.value !== '';
      return `<div class="tratos-ss-opt${selecionado ? ' selected' : ''}" data-val="${esc(o.value)}">${o.innerHTML}</div>`;
    }).join('');

    // Liga clique em cada opção
    lista.querySelectorAll('.tratos-ss-opt[data-val]').forEach(div => {
      div.addEventListener('mousedown', (ev) => {
        ev.preventDefault(); // evita perder o foco antes do click
        _tratosSSEscolher(selectId, div.dataset.val);
      });
    });
  }

  // Abre a lista (chamado no focus do input)
  function tratosSSAbrir(selectId) {
    const r = _tratosSSRefs(selectId);
    if (!r) return;
    document.querySelectorAll('.tratos-ss.open').forEach(el => {
      if (el.id !== 'ss-' + selectId) el.classList.remove('open');
    });
    r.wrap.classList.add('open');
    // Seleciona todo o texto do campo ao abrir, para que a digitação substitua imediatamente
    r.input.select();
    _tratosSSRenderLista(selectId, '');
  }

  // Filtra conforme o usuário digita
  function tratosSSFiltrar(selectId) {
    const r = _tratosSSRefs(selectId);
    if (!r) return;
    r.wrap.classList.add('open');
    if (r.clearBtn) r.clearBtn.style.display = r.input.value ? 'block' : 'none';
    _tratosSSRenderLista(selectId, r.input.value);
  }

  // Usuário clicou numa opção da lista
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

  // Botão "x" — limpa o filtro
  function tratosSSLimpar(selectId) {
    _tratosSSEscolher(selectId, '');
  }

  // Sincroniza o texto exibido no input com o valor atual do select (chamado após popular os selects)
  function _tratosSSSync(selectId) {
    const r = _tratosSSRefs(selectId);
    if (!r) return;
    const val = r.sel.value;
    const optLabel = Array.from(r.sel.options).find(o => o.value === val);
    r.input.value = (val && optLabel) ? optLabel.textContent : '';
    if (r.clearBtn) r.clearBtn.style.display = val ? 'block' : 'none';
  }

  // Fecha qualquer lista aberta ao clicar fora do componente
  document.addEventListener('click', (ev) => {
    document.querySelectorAll('.tratos-ss.open').forEach(wrap => {
      if (!wrap.contains(ev.target)) wrap.classList.remove('open');
    });
  });

  // ── Carrega CSV ──────────────────────────────────────────────────────────
  function carregarDadosTratos() {
    _tratosIniciado = true;
    const contador    = document.getElementById('tratos-contador');
    const corpoTabela = document.getElementById('corpo-tabela-tratos');
    if (contador)    contador.textContent = 'Carregando...';
    if (corpoTabela) corpoTabela.innerHTML =
      `<tr><td colspan="10" style="text-align:center;color:var(--text-3);padding:24px;font-size:12px;">
        <i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Carregando dados PCP...
      </td></tr>`;

    Papa.parse(URL_TRATOS, {
      download     : true,
      header       : true,
      skipEmptyLines: true,
      complete: function(results) {
        if (!results.data || results.data.length === 0) {
          if (corpoTabela) corpoTabela.innerHTML =
            `<tr><td colspan="10" style="text-align:center;color:var(--text-3);padding:24px;font-size:12px;">
              <i class="fas fa-info-circle" style="margin-right:6px;"></i>
              Nenhum dado encontrado na aba PCP.
            </td></tr>`;
          if (contador) contador.textContent = '0 registros';
          return;
        }

        const cols = detectarColunas(results.meta.fields || []);
        window._tratosCols      = cols;
        window._tratosDados     = results.data;
        window._tratosFiltrados = results.data;

        // Popula os 3 dropdowns de filtro com valores únicos reais
        popularSelectCodDesc('tratos-filtro-produto',  results.data, cols.colCodProd,    cols.colDescProd, '— Todos —');
        popularSelectCodDesc('tratos-filtro-fazenda',  results.data, cols.colCodFazenda, cols.colFazenda,  '— Todas —');
        popularSelectCodDesc('tratos-filtro-operacao', results.data, cols.colCodOp,      cols.colDescOp,   '— Todas —');
        _tratosSSSync('tratos-filtro-produto');
        _tratosSSSync('tratos-filtro-fazenda');
        _tratosSSSync('tratos-filtro-operacao');

        renderizarTratos(results.data);
        if (typeof showToast === 'function') showToast('✅ Tratos Culturais carregados!', 'success', 2000);
      },
      error: function(err) {
        console.error('[Tratos] Erro CSV:', err);
        if (corpoTabela) corpoTabela.innerHTML =
          `<tr><td colspan="10" style="text-align:center;color:var(--red);padding:24px;font-size:12px;">
            <i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>
            Erro ao carregar dados. Verifique a conexão ou o gid da aba PCP.
          </td></tr>`;
        if (contador) contador.textContent = 'Erro ao carregar';
      }
    });
  }

  // ── Aplica filtros ───────────────────────────────────────────────────────
  function filtrarTratos() {
    if (!window._tratosDados) return;
    const { colData, colDescProd, colFazenda, colCodFazenda, colDescOp } = window._tratosCols || {};
    // Mesma coluna usada pelo popularSelectCodDesc para montar os values
    const colFazEfetiva = colFazenda || colCodFazenda;

    // selectVal lê o value real da option selecionada, evitando bugs em browsers mobile
    const bProd    = selectVal('tratos-filtro-produto');
    const bFaz     = selectVal('tratos-filtro-fazenda');
    const bOp      = selectVal('tratos-filtro-operacao');
    const bDataIni = (document.getElementById('tratos-filtro-data-ini')?.value || '').trim();
    const bDataFim = (document.getElementById('tratos-filtro-data-fim')?.value || '').trim();
    const dIni     = bDataIni ? new Date(bDataIni + 'T00:00:00') : null;
    const dFim     = bDataFim ? new Date(bDataFim + 'T23:59:59') : null;

    const filtrados = window._tratosDados.filter(row => {
      if (bProd && (row[colDescProd]    || '').trim() !== bProd) return false;
      if (bFaz  && (row[colFazEfetiva]  || '').trim() !== bFaz)  return false;
      if (bOp   && (row[colDescOp]      || '').trim() !== bOp)   return false;
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
    // Atualiza contador
    const contador = document.getElementById('tratos-contador');
    if (contador) {
      const total = window._tratosDados.length;
      contador.textContent = filtrados.length === total
        ? `${total} registros`
        : `${filtrados.length} de ${total} registros`;
    }
    renderizarTratos(filtrados);
  }

  // ── Orquestra renderização ───────────────────────────────────────────────
  function renderizarTratos(dados) {
    renderResumoExecutivoTratos(dados);
    renderInsightsTratos(dados);
    renderTabelaTratos(dados);
    renderResumoTratos(dados);
    renderComparativoDose(dados);
    renderAreaOperacao(dados);
    const contador = document.getElementById('tratos-contador');
    if (contador)
      contador.textContent =
        `${dados.length} registro${dados.length !== 1 ? 's' : ''} encontrado${dados.length !== 1 ? 's' : ''}`;
  }

  // ── RESUMO EXECUTIVO — 4 números no topo, visão geral antes de qualquer detalhe ──
  function renderResumoExecutivoTratos(dados) {
    const box = document.getElementById('tratos-resumo-executivo');
    if (!box) return;

    if (!dados || dados.length === 0) {
      box.style.display = 'none';
      return;
    }
    box.style.display = 'grid';

    const { colDescProd, colDescOp, colArea, colDoseRec, colDoseAplic, colOS } = window._tratosCols || {};

    // Área por O.S. com lógica inteligente (ver _calcAreaOS)
    const areaOS = _calcAreaOS(dados, colOS, colArea);
    const ossSet = new Set(dados.map(r => (r[colOS] || '').trim()).filter(Boolean));
    const totalArea = Object.values(areaOS).reduce((s, v) => s + v, 0);

    // Produtos em alerta (mesmo critério usado nos insights/resumo: desvio médio > ALERTA_DOSE_PCT)
    const porProd = {};
    dados.forEach(row => {
      const p  = (row[colDescProd] || 'Sem Produto').trim();
      const dr = parseNum(row[colDoseRec]);
      const da = parseNum(row[colDoseAplic]);
      if (!porProd[p]) porProd[p] = [];
      if (!isNaN(dr) && dr > 0 && !isNaN(da)) porProd[p].push(((da - dr) / dr) * 100);
    });
    let qtdAlerta = 0;
    Object.values(porProd).forEach(difs => {
      if (!difs.length) return;
      const med = difs.reduce((s, v) => s + v, 0) / difs.length;
      if (Math.abs(med) > ALERTA_DOSE_PCT) qtdAlerta++;
    });

    // Operação predominante em área
    const porOp = {};
    dados.forEach(row => {
      const op = (row[colDescOp] || 'Sem Operação').trim();
      const os = (row[colOS] || '').trim();
      if (!porOp[op]) porOp[op] = { area: 0, oss: new Set() };
      if (os && !porOp[op].oss.has(os)) {
        porOp[op].oss.add(os);
        porOp[op].area += areaOS[os] || 0;
      }
    });
    const opsOrdenadas = Object.entries(porOp).sort((a, b) => b[1].area - a[1].area);
    const opTop    = opsOrdenadas[0];
    const opTopPct = opTop && totalArea > 0 ? (opTop[1].area / totalArea * 100) : 0;

    // Preenche o DOM
    const elArea  = document.getElementById('tre-area');
    const elOS    = document.getElementById('tre-os');
    const elAlert = document.getElementById('tre-alerta');
    const elOpTop = document.getElementById('tre-op-top');
    const elOpSub = document.getElementById('tre-op-top-sub');
    const cardAlerta = document.getElementById('tre-card-alerta');

    if (elArea)  elArea.textContent  = totalArea.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' ha';
    if (elOS)    elOS.textContent    = ossSet.size.toLocaleString('pt-BR');
    if (elAlert) elAlert.textContent = qtdAlerta.toString();
    if (cardAlerta) cardAlerta.classList.toggle('tre-ok', qtdAlerta === 0);
    if (elOpTop) elOpTop.textContent = opTop ? opTop[0] : '—';
    if (elOpSub) elOpSub.textContent = opTop ? `${opTopPct.toFixed(0)}% da área filtrada` : '% da área filtrada';
    const elAlertPct = document.getElementById('tre-alerta-pct');
    if (elAlertPct) elAlertPct.textContent = ALERTA_DOSE_PCT;
  }

  // ── HELPER: Calcula mapa OS → área com lógica inteligente ──────────────
  //   · Se todas as linhas de uma O.S. têm a MESMA área → deduplica (1 área por O.S.)
  //   · Se as linhas de uma O.S. têm ÁREAS DIFERENTES  → soma (sub-talhões distintos)
  //   Isso resolve casos como Água Residuária, onde uma única O.S. aplica em vários
  //   talhões menores registrados linha a linha com áreas distintas.
  function _calcAreaOS(dados, colOS, colArea) {
    const osLinhas = {};
    dados.forEach(row => {
      const os   = (row[colOS]   || '').trim();
      const area = parseNum(row[colArea]) || 0;
      if (!os) return;
      if (!osLinhas[os]) osLinhas[os] = [];
      osLinhas[os].push(area);
    });
    const areaOS = {};
    Object.entries(osLinhas).forEach(([os, areas]) => {
      const unicas = new Set(areas.map(a => Math.round(a * 10000)));
      if (unicas.size === 1) {
        areaOS[os] = areas[0];                              // todas iguais → pega uma
      } else {
        areaOS[os] = areas.reduce((s, v) => s + v, 0);     // diferentes → soma
      }
    });
    return areaOS;
  }

  // ── CARD INSIGHTS ────────────────────────────────────────────────────────
  function renderInsightsTratos(dados) {
    const card = document.getElementById('card-tratos-insights');
    const el   = document.getElementById('tratos-insights-container');
    if (!card || !el) return;

    if (!dados || dados.length === 0) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';
    const { colDescProd, colDescOp, colFazenda, colCodFazenda, colArea,
            colDoseRec, colDoseAplic, colOS, colData } = window._tratosCols || {};
    const colFazEfetiva = colFazenda || colCodFazenda;

    const insights = [];

    // ── Área por O.S. com lógica inteligente (ver _calcAreaOS) ──
    const areaOS   = _calcAreaOS(dados, colOS, colArea);
    const totalArea = Object.values(areaOS).reduce((s, v) => s + v, 0);

    // ── Agrega por produto para análise de dosagem ──
    const porProd = {};
    dados.forEach(row => {
      const p  = (row[colDescProd] || 'Sem Produto').trim();
      const dr = parseNum(row[colDoseRec]);
      const da = parseNum(row[colDoseAplic]);
      if (!porProd[p]) porProd[p] = { difs: [], rec: [], aplic: [] };
      if (!isNaN(dr) && dr > 0 && !isNaN(da)) {
        const pct = ((da - dr) / dr) * 100;
        porProd[p].difs.push(pct);
      }
      if (!isNaN(dr)) porProd[p].rec.push(dr);
      if (!isNaN(da)) porProd[p].aplic.push(da);
    });

    // ── Insight 1: produto com maior desvio médio de dosagem ──
    let piorProd = null, piorDesvio = 0;
    Object.entries(porProd).forEach(([p, g]) => {
      if (!g.difs.length) return;
      const med = g.difs.reduce((s, v) => s + v, 0) / g.difs.length;
      if (Math.abs(med) > Math.abs(piorDesvio)) { piorDesvio = med; piorProd = p; }
    });
    if (piorProd && Math.abs(piorDesvio) > ALERTA_DOSE_PCT) {
      const sinal = piorDesvio > 0 ? 'acima' : 'abaixo';
      const cor   = piorDesvio > 0 ? 'warn' : 'warn';
      insights.push({ type: 'warn',
        msg: `<b>${esc(piorProd)}</b> apresenta dose média aplicada <b>${Math.abs(piorDesvio).toFixed(1)}% ${sinal}</b> da dose recomendada (média de ${porProd[piorProd].difs.length} aplicação${porProd[piorProd].difs.length !== 1 ? 'ões' : ''}). Verifique calibração do equipamento e apontamento de campo.`,
        icon: 'fas fa-exclamation-triangle'
      });
    }

    // ── Insight 2: produto com alta dispersão mín→máx (inconsistência) ──
    let prodDisperso = null, maiorDisp = 0;
    Object.entries(porProd).forEach(([p, g]) => {
      if (g.aplic.length < 3) return;
      const mn  = Math.min(...g.aplic);
      const mx  = Math.max(...g.aplic);
      const med = g.aplic.reduce((s, v) => s + v, 0) / g.aplic.length;
      if (med > 0) {
        const disp = ((mx - mn) / med) * 100;
        if (disp > maiorDisp) { maiorDisp = disp; prodDisperso = { nome: p, mn, mx, med, disp, n: g.aplic.length }; }
      }
    });
    if (prodDisperso && prodDisperso.disp > 20) {
      const fmt = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
      insights.push({ type: 'warn',
        msg: `<b>${esc(prodDisperso.nome)}</b> tem alta variação de dose aplicada: mín. <b>${fmt(prodDisperso.mn)}</b> → máx. <b>${fmt(prodDisperso.mx)}</b> (dispersão de ${prodDisperso.disp.toFixed(0)}% sobre a média). Possível inconsistência entre operadores ou lotes.`,
        icon: 'fas fa-chart-bar'
      });
    }

    // ── Insight 3: operação / produto dominante em área ──
    const porCombo = {};
    dados.forEach(row => {
      const p  = (row[colDescProd] || 'Sem Produto').trim();
      const op = (row[colDescOp]   || 'Sem Operação').trim();
      const k  = p + '|||' + op;
      const ar = parseNum(row[colArea]) || 0;
      if (!porCombo[k]) porCombo[k] = { prod: p, op, area: 0 };
      porCombo[k].area += ar;
    });
    const combos         = Object.values(porCombo).sort((a, b) => b.area - a.area);
    const totalAreaCombos = combos.reduce((s, c) => s + c.area, 0);
    if (combos.length > 0 && totalAreaCombos > 0) {
      const top = combos[0];
      const pct = (top.area / totalAreaCombos * 100).toFixed(0);
      if (combos.length === 1) {
        insights.push({ type: 'tip',
          msg: `Filtro atual mostra <b>somente uma combinação</b>: <b>${esc(top.prod)}</b> via <b>${esc(top.op)}</b> — ${top.area.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ha no total.`,
          icon: 'fas fa-filter'
        });
      } else if (+pct >= 60) {
        insights.push({ type: 'tip',
          msg: `<b>${esc(top.prod)}</b> / <b>${esc(top.op)}</b> representa <b>${pct}%</b> da área filtrada (${top.area.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ha de ${totalAreaCombos.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ha totais). Operação predominante no período.`,
          icon: 'fas fa-seedling'
        });
      }
    }

    // ── Insight 4: concentração fazenda ──
    const porFaz = {};
    dados.forEach(row => {
      const f  = (row[colFazEfetiva] || 'Sem Fazenda').trim();
      const ar = parseNum(row[colArea]) || 0;
      if (!porFaz[f]) porFaz[f] = { area: 0, oss: new Set() };
      porFaz[f].area += ar;
      if (row[colOS]) porFaz[f].oss.add((row[colOS] || '').trim());
    });
    const fazendas   = Object.entries(porFaz).sort((a, b) => b[1].area - a[1].area);
    const nFazendas  = fazendas.length;
    if (nFazendas >= 3 && totalArea > 0) {
      const top1area = fazendas[0][1].area;
      const top1pct  = (top1area / totalArea * 100).toFixed(0);
      if (+top1pct >= 50) {
        insights.push({ type: 'tip',
          msg: `A fazenda <b>${esc(fazendas[0][0])}</b> concentra <b>${top1pct}%</b> da área aplicada (${top1area.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ha) entre as ${nFazendas} fazendas no filtro atual.`,
          icon: 'fas fa-map-marker-alt'
        });
      }
    }

    // ── Insight 5: janela de datas (se filtro ativo) ──
    const dIni = document.getElementById('tratos-filtro-data-ini')?.value;
    const dFim = document.getElementById('tratos-filtro-data-fim')?.value;
    if (dIni || dFim) {
      const fmt = s => s ? s.split('-').reverse().join('/') : '—';
      const totalOS = new Set(dados.map(r => (r[colOS] || '').trim()).filter(Boolean)).size;
      insights.push({ type: 'tip',
        msg: `Período filtrado: <b>${fmt(dIni)}</b> a <b>${fmt(dFim)}</b> — <b>${dados.length}</b> registro${dados.length !== 1 ? 's' : ''} · <b>${totalOS}</b> O.S. distinta${totalOS !== 1 ? 's' : ''} · <b>${totalArea.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ha</b> aplicados.`,
        icon: 'fas fa-calendar-alt'
      });
    }

    // ── Insight 6: tudo OK ──
    if (insights.length === 0) {
      const totalOS = new Set(dados.map(r => (r[colOS] || '').trim()).filter(Boolean)).size;
      const nProds  = Object.keys(porProd).length;
      insights.push({ type: 'ok',
        msg: `<b>${dados.length} registro${dados.length !== 1 ? 's' : ''}</b> analisados — Todas as dosagens dentro dos limites aceitáveis (&lt;${ALERTA_DOSE_PCT}% de desvio). <b>${nProds} produto${nProds !== 1 ? 's' : ''}</b> · <b>${totalOS} O.S.</b> · <b>${totalArea.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ha</b>.`,
        icon: 'fas fa-check-circle'
      });
    }

    el.innerHTML = `<div class="insights-box">` +
      insights.map(ins => `
        <div class="insight-item ${ins.type}">
          <i class="${ins.icon}"></i>
          <span>${ins.msg}</span>
        </div>`).join('') +
      `</div>`;
  }

  // ── TABELA COMPLETA ──────────────────────────────────────────────────────
  function renderTabelaTratos(dados) {
    const corpo = document.getElementById('corpo-tabela-tratos');
    if (!corpo) return;
    const { colData, colOS, colCodProd, colDescProd, colCodOp,
            colDescOp, colCodFazenda, colFazenda, colArea, colDoseRec, colDoseAplic } = window._tratosCols || {};

    if (!dados || dados.length === 0) {
      corpo.innerHTML =
      `<tr><td colspan="10" style="text-align:center;color:var(--text-3);padding:20px;font-size:12px;">
          Nenhum registro encontrado para os filtros aplicados.
        </td></tr>`;
      return;
    }

    // Rastreia quais O.S. já tiveram a área contabilizada para indicação visual
    const ossAreaVista = new Set();

    corpo.innerHTML = dados.map(row => {
      const dr = parseNum(row[colDoseRec]);
      const da = parseNum(row[colDoseAplic]);
      let difPct = '—', difStyle = '';
      if (!isNaN(dr) && dr > 0 && !isNaN(da)) {
        const pct = ((da - dr) / dr) * 100;
        difPct    = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
        difStyle  = Math.abs(pct) > ALERTA_DOSE_PCT
          ? 'color:var(--red);font-weight:800;'
          : 'color:var(--green-700);font-weight:700;';
      }
      const codFazRaw  = (row[colCodFazenda] || '').trim();
      // Se colFazenda (descrição) não foi detectada, mostra o código na coluna de descrição também
      const descFazRaw = colFazenda ? (row[colFazenda] || '').trim() : '';
      const codFaz     = esc(codFazRaw);
      const descFaz    = esc(descFazRaw || codFazRaw); // fallback: usa código se sem descrição
      const prodLabel = [row[colCodProd], row[colDescProd]].filter(v => v && v.trim()).join(' · ');
      const opLabel   = [row[colCodOp],   row[colDescOp]  ].filter(v => v && v.trim()).join(' · ');

      // Indicação visual de área: se a mesma O.S. já apareceu antes, marca como "compartilhada"
      const osKey = (row[colOS] || '').trim();
      const areaJaContada = ossAreaVista.has(osKey) && osKey !== '';
      if (osKey) ossAreaVista.add(osKey);
      const areaVal   = esc(row[colArea]);
      const areaStyle = areaJaContada
        ? 'text-align:right;font-weight:600;color:var(--text-3);font-style:italic;'
        : 'text-align:right;font-weight:600;color:var(--green-900);';
      const areaTip   = areaJaContada
        ? ` title="Mesma O.S. — área não duplicada nos totais"`
        : '';

      return `<tr>
        <td data-label="Data Aplic.">${esc(row[colData])}</td>
        <td data-label="Nº O.S." style="font-weight:700;color:var(--green-900);">${esc(row[colOS])}</td>
        <td data-label="Cód. Fazenda" style="font-weight:600;color:var(--text-3);">${codFaz || '—'}</td>
        <td data-label="Desc. Fazenda" style="font-weight:600;">${descFaz || '—'}</td>
        <td data-label="Produto" style="font-weight:600;">${esc(prodLabel)}</td>
        <td data-label="Operação Agr.">${esc(opLabel)}</td>
        <td data-label="Área Aplic. (ha)" style="${areaStyle}"${areaTip}>${areaVal}${areaJaContada ? ' <span style="font-size:9px;vertical-align:middle;" title="Mesma O.S.">⚠</span>' : ''}</td>
        <td data-label="Dose Rec." style="text-align:right;">${esc(row[colDoseRec])}</td>
        <td data-label="Dose Aplic." style="text-align:right;">${esc(row[colDoseAplic])}</td>
        <td data-label="Dif. (%)" style="text-align:right;${difStyle}">${difPct}</td>
      </tr>`;
    }).join('');
  }

  // ── CARD 1 — RESUMO POR PRODUTO × OPERAÇÃO ──────────────────────────────
  function renderResumoTratos(dados) {
    const el = document.getElementById('tratos-resumo-produto-op');
    if (!el) return;
    const { colDescProd, colCodProd, colDescOp, colCodOp, colOS, colArea, colDoseRec, colDoseAplic } = window._tratosCols || {};

    if (!dados || dados.length === 0) {
      el.innerHTML = '<p style="font-size:12px;color:var(--text-3);padding:8px 0;">Nenhum dado para exibir.</p>';
      return;
    }

    // Mapa OS → área com lógica inteligente (ver _calcAreaOS)
    const areaOS = _calcAreaOS(dados, colOS, colArea);

    const grupos = {};
    dados.forEach(row => {
      const codP = (row[colCodProd] || '').trim();
      const prod  = (row[colDescProd] || 'Sem Produto').trim();
      const codO = (row[colCodOp]   || '').trim();
      const op    = (row[colDescOp]   || 'Sem Operação').trim();
      const os    = (row[colOS]       || '').trim();
      const chave = prod + '|||' + op;
      if (!grupos[chave]) grupos[chave] = { codP, prod, codO, op, ossVistas: new Set(), area:0, somaRec:0, somaAplic:0, cnt:0, cntRec:0 };
      const g  = grupos[chave];
      // Soma área só na primeira vez que essa O.S. aparece neste grupo produto×op
      if (os && !g.ossVistas.has(os)) {
        g.ossVistas.add(os);
        g.area += areaOS[os] || 0;
      }
      g.cnt++;
      const dr = parseNum(row[colDoseRec]);
      const da = parseNum(row[colDoseAplic]);
      if (!isNaN(da)) { g.somaAplic += da; }
      if (!isNaN(dr)) { g.somaRec   += dr; g.cntRec++; }
    });

    const linhas    = Object.values(grupos).sort((a,b) => b.area - a.area);
    let   temAlerta = false;

    let html = `<div class="tratos-table-wrap"><table class="tratos-resumo-table">
      <thead><tr>
        <th>Produto</th>
        <th>Operação Agrícola</th>
        <th style="text-align:right;">Área Total (ha)</th>
        <th style="text-align:right;">Dose Média Rec.</th>
        <th style="text-align:right;">Dose Média Aplic.</th>
        <th style="text-align:right;">Diferença</th>
      </tr></thead><tbody>`;

    linhas.forEach(g => {
      const drm = g.cntRec > 0 ? g.somaRec   / g.cntRec : NaN;
      const dam = g.cnt    > 0 ? g.somaAplic / g.cnt    : NaN;
      let difStr = '—', difStyle = '', rowStyle = '';

      if (!isNaN(drm) && drm > 0 && !isNaN(dam)) {
        const pct = ((dam - drm) / drm) * 100;
        difStr    = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
        if (Math.abs(pct) > ALERTA_DOSE_PCT) {
          difStyle  = 'color:var(--red);font-weight:800;';
          rowStyle  = 'background:rgba(255,235,238,0.65);';
          temAlerta = true;
        } else {
          difStyle  = 'color:var(--green-700);font-weight:700;';
        }
      }

      const prodLabel = g.codP ? `<span style="font-size:10px;color:var(--text-3);font-weight:700;">${esc(g.codP)}</span> ${esc(g.prod)}` : esc(g.prod);
      const opLabel   = g.codO ? `<span style="font-size:10px;color:var(--text-3);font-weight:700;">${esc(g.codO)}</span> ${esc(g.op)}`   : esc(g.op);

      html += `<tr style="${rowStyle}">
        <td data-label="Produto" style="font-weight:600;">${prodLabel}</td>
        <td data-label="Operação Agr.">${opLabel}</td>
        <td data-label="Área Total (ha)" style="text-align:right;font-weight:700;color:var(--green-900);">
          ${g.area.toLocaleString('pt-BR',{maximumFractionDigits:2})} ha</td>
        <td data-label="Dose Méd. Rec." style="text-align:right;">
          ${isNaN(drm) ? '—' : drm.toLocaleString('pt-BR',{maximumFractionDigits:3})}</td>
        <td data-label="Dose Méd. Aplic." style="text-align:right;">
          ${isNaN(dam) ? '—' : dam.toLocaleString('pt-BR',{maximumFractionDigits:3})}</td>
        <td data-label="Diferença" style="text-align:right;${difStyle}">${difStr}</td>
      </tr>`;
    });

    html += '</tbody></table></div>';
    if (temAlerta) {
      html += `<div style="margin-top:10px;padding:10px 14px;background:rgba(255,235,238,0.85);
                  border-left:3px solid var(--red);border-radius:var(--radius-sm);
                  font-size:11px;color:var(--red);font-weight:700;">
        <i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>
        Linhas em vermelho: diferença de dosagem superior a ${ALERTA_DOSE_PCT}%.
      </div>`;
    }
    el.innerHTML = html;
  }

  // ── CARD 2 — COMPARATIVO DE DOSAGEM ─────────────────────────────────────
  function renderComparativoDose(dados) {
    const el = document.getElementById('tratos-comparativo-dose');
    if (!el) return;
    const { colDescProd, colCodProd, colDoseRec, colDoseAplic } = window._tratosCols || {};

    if (!dados || dados.length === 0) {
      el.innerHTML = '<p style="font-size:12px;color:var(--text-3);padding:8px 0;">Nenhum dado para exibir.</p>';
      return;
    }

    const prods = {};
    dados.forEach(row => {
      const cod = (row[colCodProd]  || '').trim();
      const p   = (row[colDescProd] || 'Sem Produto').trim();
      const key = cod ? cod + ' · ' + p : p;
      const dr  = parseNum(row[colDoseRec]);
      const da  = parseNum(row[colDoseAplic]);
      if (!prods[key]) prods[key] = { rec:[], aplic:[] };
      if (!isNaN(dr)) prods[key].rec.push(dr);
      if (!isNaN(da)) prods[key].aplic.push(da);
    });

    const lista = Object.keys(prods).sort();
    if (!lista.length) {
      el.innerHTML = '<p style="font-size:12px;color:var(--text-3);padding:8px 0;">Nenhum dado de dosagem disponível.</p>';
      return;
    }

    const avg = arr => arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : NaN;
    const fmt = v   => isNaN(v)  ? '—' : v.toLocaleString('pt-BR',{maximumFractionDigits:3});

    let html = `<div class="tratos-table-wrap"><table class="tratos-resumo-table">
      <thead><tr>
        <th>Produto</th>
        <th style="text-align:right;">Dose Rec. (média)</th>
        <th style="text-align:right;">Aplic. Mín.</th>
        <th style="text-align:right;">Aplic. Média</th>
        <th style="text-align:right;">Aplic. Máx.</th>
        <th style="text-align:right;">Amostras</th>
      </tr></thead><tbody>`;

    lista.forEach(p => {
      const g   = prods[p];
      const rec = avg(g.rec);
      const mn  = g.aplic.length ? Math.min(...g.aplic) : NaN;
      const med = avg(g.aplic);
      const mx  = g.aplic.length ? Math.max(...g.aplic) : NaN;
      let rowStyle = '';
      if (!isNaN(med) && med > 0 && !isNaN(mn) && !isNaN(mx) && ((mx-mn)/med)*100 > ALERTA_DOSE_PCT)
        rowStyle = 'background:rgba(255,235,238,0.45);';

      html += `<tr style="${rowStyle}">
        <td data-label="Produto" style="font-weight:600;">${esc(p)}</td>
        <td data-label="Dose Rec." style="text-align:right;">${fmt(rec)}</td>
        <td data-label="Mín." style="text-align:right;color:var(--blue);font-weight:700;">${fmt(mn)}</td>
        <td data-label="Média" style="text-align:right;font-weight:700;">${fmt(med)}</td>
        <td data-label="Máx." style="text-align:right;color:var(--amber);font-weight:700;">${fmt(mx)}</td>
        <td data-label="Amostras" style="text-align:right;color:var(--text-3);">${g.aplic.length}</td>
      </tr>`;
    });

    html += `</tbody></table></div>
      <p style="font-size:9px;color:var(--text-3);margin-top:8px;">
        Fundo rosado = variação mín-máx supera ${ALERTA_DOSE_PCT}% da média aplicada.
      </p>`;
    el.innerHTML = html;
  }

  // ── CARD 3 — ÁREA TOTAL POR OPERAÇÃO ────────────────────────────────────
  function renderAreaOperacao(dados) {
    const el = document.getElementById('tratos-area-operacao');
    if (!el) return;
    const { colDescOp, colCodOp, colArea, colOS } = window._tratosCols || {};

    if (!dados || dados.length === 0) {
      el.innerHTML = '<p style="font-size:12px;color:var(--text-3);padding:8px 0;">Nenhum dado para exibir.</p>';
      return;
    }

    // Mapa OS → área com lógica inteligente (ver _calcAreaOS)
    const areaOS = _calcAreaOS(dados, colOS, colArea);

    const ops = {};
    dados.forEach(row => {
      const cod = (row[colCodOp]  || '').trim();
      const op  = (row[colDescOp] || 'Sem Operação').trim();
      const key = cod ? cod + ' · ' + op : op;
      const os  = (row[colOS]     || '').trim();
      if (!ops[key]) ops[key] = { area:0, oss:new Set() };
      if (os && !ops[key].oss.has(os)) {
        ops[key].oss.add(os);
        ops[key].area += areaOS[os] || 0;
      }
    });

    const lista     = Object.entries(ops).sort((a,b) => b[1].area - a[1].area);
    const totalArea = lista.reduce((s,[,v]) => s + v.area, 0);
    const cores     = ['var(--green-900)','var(--blue)','var(--amber)','var(--red)'];

    let html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">`;
    lista.forEach(([op,g],idx) => {
      const pct = totalArea > 0 ? (g.area/totalArea)*100 : 0;
      const cor = cores[idx % cores.length];
      html += `
        <div style="background:var(--surface2);border:1px solid var(--border);
                    border-radius:var(--radius-md);padding:14px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;
                      letter-spacing:0.5px;margin-bottom:8px;">${esc(op)}</div>
          <div style="font-size:22px;font-weight:800;color:${cor};line-height:1;">
            ${g.area.toLocaleString('pt-BR',{maximumFractionDigits:1})} ha</div>
          <div style="font-size:10px;color:var(--text-3);margin-top:4px;">
            ${g.oss.size} O.S. distinta${g.oss.size!==1?'s':''}</div>
          <div style="margin-top:8px;background:var(--border);height:6px;border-radius:99px;overflow:hidden;">
            <div style="height:100%;width:${pct.toFixed(1)}%;background:${cor};border-radius:99px;"></div>
          </div>
          <div style="font-size:9px;color:var(--text-3);margin-top:3px;font-weight:700;">
            ${pct.toFixed(1)}% do total</div>
        </div>`;
    });

    html += `</div>
      <div style="margin-top:10px;padding:10px 14px;
                  background:rgba(0,100,0,0.06);border:1px solid rgba(0,100,0,0.15);
                  border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;font-weight:700;color:var(--green-900);">Área Total Filtrada</span>
        <span style="font-size:18px;font-weight:800;color:var(--green-900);">
          ${totalArea.toLocaleString('pt-BR',{maximumFractionDigits:1})} ha</span>
      </div>`;

    el.innerHTML = html;
  }

  // ── EXPORTAR EXCEL (CSV BOM UTF-8) ───────────────────────────────────────
  function exportarTratosExcel() {
    const dados = window._tratosFiltrados;
    if (!dados || dados.length === 0) {
      if (typeof showToast === 'function') showToast('⚠️ Nenhum dado para exportar.', 'error', 2500);
      return;
    }
    const { colData, colOS, colCodProd, colDescProd, colCodOp, colDescOp,
            colCodFazenda, colFazenda, colArea, colDoseRec, colDoseAplic } = window._tratosCols || {};
    // Fallback: se não há coluna de descrição, usa o código como descrição também
    const colFazDescExport = colFazenda || colCodFazenda;

    const cab = ['Data Aplicação','Nº O.S.','Cód. Fazenda','Desc. Fazenda',
                 'Cód. Produto','Desc. Produto',
                 'Cód. Operação','Desc. Operação Agr.','Área Aplic. (ha)',
                 'Dose Recomendada','Dose Aplicada','Diferença (%)'];

    const linhas = dados.map(row => {
      const dr  = parseNum(row[colDoseRec]);
      const da  = parseNum(row[colDoseAplic]);
      const dif = (!isNaN(dr) && dr > 0 && !isNaN(da))
        ? (((da-dr)/dr)*100).toFixed(1)+'%' : '';
      return [
        row[colData]             || '',
        row[colOS]               || '',
        row[colCodFazenda]       || '',
        row[colFazDescExport]    || '',
        row[colCodProd]          || '',
        row[colDescProd]         || '',
        row[colCodOp]            || '',
        row[colDescOp]           || '',
        row[colArea]             || '',
        row[colDoseRec]          || '',
        row[colDoseAplic]        || '',
        dif
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(';');
    });

    const csv  = '\uFEFF' + cab.map(c=>`"${c}"`).join(';') + '\n' + linhas.join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `tratos_culturais_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast(`✅ ${dados.length} registros exportados!`, 'success', 2500);
  }

})(); /* fim IIFE TRATOS CULTURAIS */




/* ══════════════════════════════════════════════
   MÓDULO PLANEJAMENTO DE SAFRA
   Frente 401: gid=413102496   | Frente 402: gid=1906371632
   Frente 403: gid=1980138572  | Frente 404: gid=1281974991
   TIRO MEDIO: gid=1448262477  | DISTANCIAS: gid=352483918
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
  const PLS_URL_TIRO  = PLS_BASE + '?gid=1448262477&single=true&output=csv';
  const PLS_URL_DIST  = PLS_BASE + '?gid=352483918&single=true&output=csv';

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

  /* ── helpers locais (independentes do módulo Plantio) ────────────── */
  function _norm(s) {
    return String(s || '').toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '');
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

  /* ── navegação ───────────────────────────────────────────────────── */
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

  /* ── carregamento ────────────────────────────────────────────────── */
  function _plsParseCsv(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true, header: false, skipEmptyLines: true,
        complete: r => resolve(r.data),
        error:    e => reject(e),
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
        _plsParseCsv(PLS_URLS['401']),
        _plsParseCsv(PLS_URLS['402']),
        _plsParseCsv(PLS_URLS['403']),
        _plsParseCsv(PLS_URLS['404']),
        _plsParseCsv(PLS_URL_TIRO),
        _plsParseCsv(PLS_URL_DIST),
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

  /* ── normalização ────────────────────────────────────────────────── */
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
    const iStatus   = header.length - 1; // última coluna costuma ter o status manual

    return dataRows
      .map(r => {
        if (!r || r.length < 5) return null;
        const frente = String(iFrente >= 0 ? r[iFrente] : '').trim();
        const talhao = String(iTalhao >= 0 ? r[iTalhao] : '').trim();
        if (!frente || !talhao) return null;

        const data = _parseData(String(iData >= 0 ? r[iData] : ''));

        return {
          frente,
          seq:      _num(iSeq >= 0 ? r[iSeq] : '') || 0,
          codFazenda: String(iLocal >= 0 ? r[iLocal] : '').trim(),
          fazenda:  String(iDesc  >= 0 ? r[iDesc]  : '').trim(),
          talhao,
          bloco:    String(iBloco >= 0 ? r[iBloco] : '').trim(),
          variedade:String(iVar   >= 0 ? r[iVar]   : '').trim(),
          data,
          tch:      _num(iTch >= 0 ? r[iTch] : ''),
          moagem:   _num(iMoagem >= 0 ? r[iMoagem] : ''),
          tc:       _num(iTc >= 0 ? r[iTc] : ''),
          raio:     _num(iRaio >= 0 ? r[iRaio] : ''),
          tiroMedio:_num(iTiro >= 0 ? r[iTiro] : ''),
          vel:      _num(iVel >= 0 ? r[iVel] : ''),
          tonH:     _num(iTonH >= 0 ? r[iTonH] : ''),
          hrProd:   _num(iHrProd >= 0 ? r[iHrProd] : ''),
          colheitabilidade: _num(iColheit >= 0 ? r[iColheit] : ''),
        };
      })
      .filter(Boolean);
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
      fazenda:    String(iDesc >= 0 ? r[iDesc] : '').trim(),
      tiroMedio:  _num(iTiro >= 0 ? r[iTiro] : ''),
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
      fazenda:    String(iDesc >= 0 ? r[iDesc] : '').trim(),
      distancia:  _num(iDist >= 0 ? r[iDist] : ''),
    })).filter(r => r.fazenda);
  }

  /* ── status real (cruza com Liberações) ─────────────────────────── */
  // Remove prefixo "125-" de "125-CAMPO REDONDO" → "CAMPO REDONDO"
  // e devolve também o código extraído, se houver
  function _plsExtrairFazenda(desc) {
    const s = String(desc || '').trim();
    const m = s.match(/^(\d+)\s*-\s*(.+)$/);
    if (m) return { cod: m[1], nome: m[2].trim() };
    return { cod: '', nome: s };
  }

  function _plsStatusTalhao(frente, fazenda, talhao, codFazenda) {
    const rows = window._gatecDados;
    if (!rows || !rows.length) return 'pendente';

    const talhaoNorm   = String(talhao).trim().replace(/^0+/, '') || '0';
    const codNorm       = String(codFazenda || '').trim().replace(/^0+/, '');
    const fazendaNomeNorm = _norm(fazenda);

    const match = rows.find(row => {
      const rFrente  = String(row['FRENTE'] || '').trim();
      if (rFrente !== String(frente).trim()) return false;

      const rFazendaRaw = String(row['DESC.FAZENDA'] || '').trim();
      const { cod: rCod, nome: rNome } = _plsExtrairFazenda(rFazendaRaw);
      const rCodNorm = rCod.replace(/^0+/, '');

      // Compara por código (mais confiável) OU por nome normalizado
      const bateCod  = codNorm && rCodNorm && codNorm === rCodNorm;
      const bateNome = _norm(rNome) === fazendaNomeNorm;
      if (!bateCod && !bateNome) return false;

      const rTalhoes = String(row['LISTAGEM TALHAO'] || '');
      const talhoesArr = rTalhoes.split(/[,;\s]+/)
        .map(t => t.trim().replace(/^0+/, '') || '0')
        .filter(Boolean);
      return talhoesArr.includes(talhaoNorm);
    });

    if (!match) return 'pendente';
    const status = String(match['STATUS OS'] || '').toUpperCase();
    if (status.includes('ENCERRADA')) return 'encerrada';
    return 'aberta';
  }

  // DEBUG temporário — chame window.plsDebugStatus() no console
  window.plsDebugStatus = function() {
    const rows = window._gatecDados;
    if (!rows || !rows.length) { console.log('window._gatecDados vazio ou não carregado'); return; }
    console.group('[PLS DEBUG] Amostra de Liberações (_gatecDados)');
    rows.slice(0, 5).forEach(r => {
      console.log({
        FRENTE: r['FRENTE'],
        'DESC.FAZENDA': r['DESC.FAZENDA'],
        'LISTAGEM TALHAO': r['LISTAGEM TALHAO'],
        'STATUS OS': r['STATUS OS'],
      });
    });
    console.groupEnd();

    console.group('[PLS DEBUG] Amostra de Planejamento (frente 401)');
    (_plsDados['401'] || []).slice(0, 5).forEach(r => {
      console.log({ frente: r.frente, fazenda: r.fazenda, talhao: r.talhao });
    });
    console.groupEnd();

    console.group('[PLS DEBUG] Teste de cruzamento (primeiros 5 da frente 401)');
    (_plsDados['401'] || []).slice(0, 5).forEach(r => {
      const status = _plsStatusTalhao(r.frente, r.fazenda, r.talhao, r.codFazenda);
      console.log(`${r.frente} | ${r.codFazenda} · ${r.fazenda} | Tal.${r.talhao} → ${status}`);
    });
    console.groupEnd();

    // Lista todas as fazendas únicas de cada lado para comparar nomes
    const fazLib = [...new Set(rows.map(r => r['DESC.FAZENDA']).filter(Boolean))].sort();
    const fazPls = [...new Set((_plsDados['401']||[]).map(r => r.fazenda).filter(Boolean))].sort();
    console.log('Fazendas em Liberações (amostra):', fazLib.slice(0,10));
    console.log('Fazendas em Planejamento 401 (amostra):', fazPls.slice(0,10));
  };

  /* ── renderização principal ──────────────────────────────────────── */
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
      html += `
        <div class="pls-kpi-card">
          <div class="pls-kpi-frente">FRENTE ${frente}</div>
          <div class="pls-kpi-linha"><span>Talhões</span><b>${dados.length}</b></div>
          <div class="pls-kpi-linha"><span>TCH médio est.</span><b>${!isNaN(tchMedio) ? tchMedio.toFixed(0) : '—'}</b></div>
          <div class="pls-kpi-linha"><span>Tiro médio</span><b>${!isNaN(tiroMedioFrente) ? tiroMedioFrente.toFixed(0)+' m' : '—'}</b></div>
          <div class="pls-kpi-progress-bg"><div class="pls-kpi-progress-fill" style="width:${pct.toFixed(1)}%"></div></div>
          <div class="pls-kpi-pct">${jaColhidos} colhidos · ${jaLiberados} em aberto · ${pct.toFixed(1)}%</div>
        </div>`;
    });
    cont.innerHTML = html;
  }

  function filtrarPlanejamentoTimeline() {
    const frente       = document.getElementById('pls-filtro-frente')?.value || '401';
    const statusFiltro = document.getElementById('pls-filtro-status')?.value || '';
    const cont         = document.getElementById('pls-timeline-container');
    const contador     = document.getElementById('pls-timeline-contador');
    if (!cont) return;
    const dados = (_plsDados[frente] || []).slice().sort((a,b) => a.seq - b.seq);
    const comStatus = dados.map(r => ({
      ...r,
      status: _plsStatusTalhao(frente, r.fazenda, r.talhao, r.codFazenda),
    }));
    const filtrado = statusFiltro ? comStatus.filter(r => r.status === statusFiltro) : comStatus;
    if (contador) contador.textContent =
      `${filtrado.length} talhão${filtrado.length !== 1 ? 'ões' : ''} · Frente ${frente}`;
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
      const colhidos  = talhoes.filter(r => r.status === 'encerrada').length;
      const liberados = talhoes.filter(r => r.status === 'aberta').length;
      const pendentes = talhoes.filter(r => r.status === 'pendente').length;
      const chipsHtml =
        (colhidos  > 0 ? `<span class="pls-tl-status-badge encerrada">${colhidos} colhido${colhidos>1?'s':''}</span>` : '') +
        (liberados > 0 ? `<span class="pls-tl-status-badge aberta" style="margin-left:4px">${liberados} liberado${liberados>1?'s':''}</span>` : '') +
        (pendentes > 0 ? `<span class="pls-tl-status-badge pendente" style="margin-left:4px">${pendentes} pendente${pendentes>1?'s':''}</span>` : '');
      let talhoesHtml = '';
      talhoes.forEach(r => {
        talhoesHtml += `
          <div class="pls-timeline-item status-${r.status}" style="margin-bottom:4px;">
            <div class="pls-tl-row1">
              <span class="pls-tl-seq">#${r.seq}</span>
              <span class="pls-tl-faz">Talhão ${r.talhao}</span>
              <span class="pls-tl-data">${_fmtData(r.data)}</span>
            </div>
            <div class="pls-tl-row2">
              ${!isNaN(r.tch) ? `<span><b>TCH</b> ${r.tch.toFixed(0)}</span>` : ''}
              ${!isNaN(r.moagem) ? `<span><b>Moagem</b> ${r.moagem.toFixed(1)} mil t</span>` : ''}
              ${!isNaN(r.tiroMedio) ? `<span><b>Tiro médio</b> ${r.tiroMedio.toFixed(0)} m</span>` : ''}
              ${r.variedade ? `<span><b>Var.</b> ${r.variedade}</span>` : ''}
              <span class="pls-tl-status-badge ${r.status}">${statusLabel[r.status]}</span>
            </div>
          </div>`;
      });
      html += `
        <div class="pla-pipeline-fazenda" style="margin-bottom:8px;">
          <div class="pla-pipeline-header" onclick="plsToggleFazenda('${idBody}', this)">
            <span class="pla-pipeline-fazenda-nome">
              <i class="fas fa-map-marker-alt" style="margin-right:6px;color:var(--text-3);font-size:10px;"></i>${fazNome}
              <span style="font-size:10px;font-weight:600;color:var(--text-3);margin-left:4px;">(${talhoes.length} ${talhoes.length===1?'talhão':'talhões'})</span>
            </span>
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">${chipsHtml}<i class="fas fa-chevron-down" style="font-size:10px;color:var(--text-3);margin-left:4px;"></i></div>
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
    sel.innerHTML = '<option value="">— Selecione a fazenda —</option>' +
      lista.map(f => `<option value="${f}">${f}</option>`).join('');
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
            <div class="pls-busca-linha"><span>TCH est.</span><b>${!isNaN(r.tch)?r.tch.toFixed(0):'—'}</b></div>
            <div class="pls-busca-linha"><span>Moagem</span><b>${!isNaN(r.moagem)?r.moagem.toFixed(1)+' mil t':'—'}</b></div>
          </div>
          <div class="pls-busca-col">
            <div class="pls-busca-col-title">Logística</div>
            <div class="pls-busca-linha"><span>Tiro médio</span><b>${!isNaN(r.tiroMedio)?r.tiroMedio.toFixed(0)+' m':'—'}</b></div>
            <div class="pls-busca-linha"><span>Tiro pond. faz.</span><b>${tiroInfo&&!isNaN(tiroInfo.tiroMedioPond)?tiroInfo.tiroMedioPond.toFixed(0)+' m':'—'}</b></div>
            <div class="pls-busca-linha"><span>Dist. usina</span><b>${distInfo&&!isNaN(distInfo.distancia)?distInfo.distancia+' km':'—'}</b></div>
            <div class="pls-busca-linha"><span>Raio</span><b>${!isNaN(r.raio)?r.raio.toFixed(1):'—'}</b></div>
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
    if (!encontrado) { resultDiv.innerHTML = '<div class="pla-empty"><i class="fas fa-search"></i>Talhão não encontrado.</div>'; return; }
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
    if (!encontrados.length) { resultDiv.innerHTML = '<div class="pla-empty"><i class="fas fa-search"></i>Nenhum talhão no intervalo.</div>'; return; }
    resultDiv.innerHTML = `<div style="font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px;margin:10px 0 6px;">${encontrados.length} talhão${encontrados.length>1?'ões':'ão'} encontrado${encontrados.length>1?'s':''}</div>` +
      encontrados.map(r => _plsCardTalhao(r, r.frenteEncontrada, nomeSemCod)).join('');
  };


})(); /* fim IIFE PLANEJAMENTO DE SAFRA */




/* ══════════════════════════════════════════════
   MÓDULO PLANTIO
   26/27 Diário: gid=409434796  | Base: gid=1046721215
   25/26 Diário: gid=1655110352 | Base: gid=1840703975
   PCP (tratos): gid=724202507
══════════════════════════════════════════════ */
(function() {
  'use strict';

  const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTIIUGH-g6vlowVBAAkgoPwZd1EPJPJS8PzgOEWyDPito38Ii8qzOHaSh1PioGGMLNbwFJPDMzwsA7/pub';

  const URLS = {
    '26_27': {
      diario: BASE_URL + '?gid=409434796&single=true&output=csv',
      base:   BASE_URL + '?gid=1046721215&single=true&output=csv',
    },
    '25_26': {
      diario: BASE_URL + '?gid=1655110352&single=true&output=csv',
      base:   BASE_URL + '?gid=1840703975&single=true&output=csv',
    },
  };
  const URL_PCP = BASE_URL + '?gid=724202507&single=true&output=csv';

  const SEQUENCIA = [
    { cod: 'PLANTIO', label: 'Plantio',            icon: 'fa-seedling',  fonte: 'diario' },
    { cod: '1013',    label: '1013 · 1ª Herb.',    icon: 'fa-spray-can', fonte: 'pcp'    },
    { cod: '1045',    label: '1045 · Quebra lombo', icon: 'fa-tractor',  fonte: 'pcp'    },
    { cod: '1014',    label: '1014 · 2ª Herb.',    icon: 'fa-spray-can', fonte: 'pcp'    },
  ];

  const MESES_NOME = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // Cache por safra para não rebuscar ao trocar
  const _cache = {
    '26_27': { diario: null, base: null, pcp: null, loaded: false },
    '25_26': { diario: null, base: null, pcp: null, loaded: false },
  };

  let _safraAtual  = null;
  let _diarioFilt  = null;
  let _compararAberto = false;

  // Atalhos para safra atual
  const _d = () => _cache[_safraAtual]?.diario || [];
  const _b = () => _cache[_safraAtual]?.base   || [];
  const _p = () => _cache['26_27']?.pcp        || []; // PCP único

  /* ── expõe ao escopo global ──────────────────────────────────────── */
  window.iniciarModuloPlantio    = iniciarModuloPlantio;
  window.plantioAbrirSafra       = plantioAbrirSafra;
  window.plantioVoltarSeletor    = plantioVoltarSeletor;
  window.plantioAbrirComparar    = plantioAbrirComparar;
  window.carregarDadosPlantio    = carregarDadosPlantio;
  window.filtrarPlantioAvanco    = filtrarPlantioAvanco;
  window.filtrarPlantioBase      = filtrarPlantioBase;
  window.filtrarPlantioComparar  = filtrarPlantioComparar;
  window.togglePlantioCard       = togglePlantioCard;
  window.plantioToggleDetalhe    = plantioToggleDetalhe;
  window.plantioTogglePipeline   = plantioTogglePipeline;
  window.plantioToggleFazenda    = plantioToggleFazenda;
  window.atualizarCardPlantioHome  = atualizarCardPlantioHome;
  window._renderizarBaseFiltrada   = _renderizarBaseFiltrada;
  window._garantirSafraCarregada   = _garantirSafraCarregada;

  // DEBUG — remover após diagnóstico
  window.plantioDebug = function() {
    const safras = ['26_27','25_26'];
    safras.forEach(s => {
      const d = _cache[s].diario || [];
      const b = _cache[s].base   || [];
      const haD = d.reduce((acc,r) => acc + r.area, 0);
      const haB = b.reduce((acc,r) => acc + r.area, 0);
      console.group(`[PLANTIO DEBUG] ${s}`);
      console.log(`Diário: ${d.length} registros, total = ${haD.toFixed(2)} ha`);
      if (d.length) {
        console.log('Primeiros 3 do diário:');
        d.slice(0,3).forEach(r => console.log('  ', JSON.stringify({data: r.data?.toLocaleDateString('pt-BR'), faz: r.fazenda, tal: r.talhao, area: r.area})));
      }
      console.log(`Base: ${b.length} talhões, total = ${haB.toFixed(2)} ha`);
      if (b.length) {
        console.log('Primeiros 3 da base:');
        b.slice(0,3).forEach(r => console.log('  ', JSON.stringify({faz: r.fazenda, tal: r.talhao, area: r.area, mes: r.mes})));
      }
      // Raw CSV: mostra primeiras linhas que o PapaParse recebeu
      console.groupEnd();
    });
    // Também loga o raw CSV das primeiras linhas
    window._plantioRawDebug = async function(safra) {
      const urls = {
        '26_27': { d: 'gid=409434796', b: 'gid=1046721215' },
        '25_26': { d: 'gid=1655110352', b: 'gid=1840703975' },
      };
      const base = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTIIUGH-g6vlowVBAAkgoPwZd1EPJPJS8PzgOEWyDPito38Ii8qzOHaSh1PioGGMLNbwFJPDMzwsA7/pub';
      for (const [tipo, gid] of [['diario', urls[safra].d], ['base', urls[safra].b]]) {
        const url = `${base}?${gid}&single=true&output=csv`;
        await new Promise(res => Papa.parse(url, {
          download: true, header: false, skipEmptyLines: false,
          complete: r => {
            console.group(`RAW CSV ${safra} ${tipo} (primeiras 8 linhas)`);
            r.data.slice(0,8).forEach((row,i) => console.log(`  linha[${i}]:`, row.slice(0,12)));
            console.groupEnd();
            res();
          }
        }));
      }
    };
    console.log('Para ver CSV raw: await plantioRawDebug("26_27") ou ("25_26")');
  };

  /* ── navegação ───────────────────────────────────────────────────── */
  function iniciarModuloPlantio() {
    // Pré-carrega cards dos botões safra ao abrir a aba
    _carregarSubTextosSafra();
  }

  function plantioAbrirSafra(safra) {
    _safraAtual = safra;
    _compararAberto = false;
    document.getElementById('plantio-seletor-safra').style.display = 'none';
    document.getElementById('plantio-comparar').style.display      = 'none';
    document.getElementById('plantio-conteudo').style.display      = 'block';
    document.getElementById('plantio-safra-label').textContent     =
      safra === '26_27' ? 'Safra 26/27' : 'Safra 25/26';

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
    // Carrega ambas as safras se necessário
    _garantirSafraCarregada('25_26');
    _garantirSafraCarregada('26_27');
  }

  /* ── carregamento ────────────────────────────────────────────────── */
  async function _carregarSubTextosSafra() {
    // Carrega as duas safras em background para popular os sub-textos dos botões
    Promise.all([
      _garantirSafraCarregada('25_26'),
      _garantirSafraCarregada('26_27'),
    ]);
  }

  async function _garantirSafraCarregada(safra) {
    if (_cache[safra].loaded) return;
    try {
      const [rDiario, rBase] = await Promise.all([
        _parseCsvSemHeader(URLS[safra].diario),
        _parseCsvSemHeader(URLS[safra].base),
      ]);
      // PCP só carrega uma vez junto com 26/27
      if (safra === '26_27' && !_cache['26_27'].pcp) {
        const rPcp = await _parseCsvComHeader(URL_PCP);
        _cache['26_27'].pcp = _normalizarPcp(rPcp);
      }
      _cache[safra].diario = _normalizarDiario(rDiario);
      _cache[safra].base   = _normalizarBase(rBase);
      _cache[safra].loaded = true;
      _atualizarSubTextoSafra(safra);
      if (typeof registrarSync === 'function') registrarSync('ok', 'Plantio ' + safra.replace('_','/'));
    } catch(err) {
      console.error('[PLANTIO]', safra, err);
    }
  }

  async function carregarDadosPlantio() {
    ['pla-resumo-container','pla-pipeline-container','pla-base-container'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<div class="pla-empty"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
    });
    // Força recarregar safra atual
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
    if (el) el.textContent = `${fazendas.size} fazendas · ${totalHa.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,'.')} ha planejados`;
    atualizarCardPlantioHome();
  }

  /* ── CSV: sem header (para planilhas com linhas de metadados) ─────── */
  function _parseCsvSemHeader(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: r => resolve(r.data),   // array de arrays
        error:    e => reject(e),
      });
    });
  }

  /* ── CSV: com header padrão (PCP não tem linhas de metadados) ─────── */
  function _parseCsvComHeader(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: r => resolve(r.data),
        error:    e => reject(e),
      });
    });
  }

  /* ── detecta header real dentro de array de arrays ──────────────── */
  function _detectarHeader(rows, palavrasChave) {
    for (let i = 0; i < Math.min(8, rows.length); i++) {
      const vals = rows[i].map(v => String(v || ''));
      const hits = palavrasChave.filter(kw =>
        vals.some(v => _norm(v).includes(_norm(kw)))
      ).length;
      if (hits >= palavrasChave.length) return i;
    }
    return 0; // fallback: primeira linha
  }

  /* ── helpers ─────────────────────────────────────────────────────── */
  function _norm(s) {
    return String(s || '').toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '');
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

  function _parseData(str) {
    if (!str) return null;
    str = String(str).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [d, m, y] = str.split('/');
      return new Date(+y, +m - 1, +d);
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str.substring(0, 10));
    // Excel serial date
    const n = parseFloat(str);
    if (!isNaN(n) && n > 40000) {
      const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
    return null;
  }

  function _num(v) {
    if (v == null || v === '') return NaN;
    const s = String(v).trim();
    // Formato BR: 1.234,56 → tem vírgula como decimal
    if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    // Formato US/padrão: 16.27 → ponto como decimal, sem vírgula
    return parseFloat(s);
  }

  // Área vem do Google Sheets com vírgula decimal (ex: "2,8" ou "16,27")
  function _numArea(v) {
    if (v == null || v === '') return NaN;
    return parseFloat(String(v).trim().replace(',', '.'));
  }

  // Formata o nome da fazenda com código: "3 · NOVA SOLEDADE"
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

  function _fmtData(d) {
    if (!d || !(d instanceof Date) || isNaN(d)) return '—';
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  function _val(row, idx) {
    return idx >= 0 && idx < row.length ? String(row[idx] || '').trim() : '';
  }

  /* ── normalização DIÁRIO (array de arrays, header na linha 2) ───────
     Estrutura confirmada do CSV:
       linha 0 = fórmula PROCV  (metadado)
       linha 1 = PAS / 26'27... (metadado)
       linha 2 = UNIDADE, SAFRA, DATA, MÊS, LAYER, LOCAL, DESCRIÇÃO,
                 TALHÃO, ÁREA, PLANTIO, ...  ← HEADER REAL
       linha 3+ = dados
     Índices (0-based):
       [1]=UNIDADE  [3]=DATA  [7]=DESCRIÇÃO  [8]=TALHÃO
       [9]=ÁREA     [10]=PLANTIO  [21]=VARIEDADE
  ─────────────────────────────────────────────────────────────────── */
  function _normalizarDiario(rows) {
    if (!rows || !rows.length) return [];

    // Detecta linha do header: tem 'DATA' e 'ÁREA'/'AREA' e 'DESCRIÇÃO'
    // No CSV do Google Sheets o diário não tem metadados — linha 0 já é o header
    let headerLine = -1;
    for (let i = 0; i < Math.min(4, rows.length); i++) {
      const vals = rows[i].map(v => _norm(String(v||'')));
      if (vals.some(v => v === 'DATA') && vals.some(v => v === 'AREA') && vals.some(v => v.startsWith('DESCRI'))) {
        headerLine = i;
        break;
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

    return dataRows
      .map(r => {
        if (!r || r.length < 5) return null;
        // Filtra linhas sem unidade válida (PAS, etc.)
        const unidade = String(r[1] || '').trim();
        if (!unidade || _norm(unidade) === '' || _norm(unidade) === 'UNIDADE') return null;

        // Área com vírgula decimal: "2,8" → 2.8
        const area = _numArea(iArea >= 0 ? r[iArea] : r[9]);
        if (isNaN(area) || area <= 0) return null;

        // Data: DD/MM/YYYY do Google Sheets
        let data = null;
        const rawData = iData >= 0 ? r[iData] : r[3];
        if (rawData instanceof Date || (typeof rawData === 'object' && rawData !== null)) {
          data = new Date(rawData);
        } else {
          data = _parseData(String(rawData || ''));
        }
        if (!data || isNaN(data.getTime())) return null;

        return {
          data,
          codFazenda: String(iLocalCod  >= 0 ? r[iLocalCod]  : '').trim(),
          fazenda:    String(iDescricao >= 0 ? r[iDescricao] : '').trim(),
          talhao:     String(iTalhao    >= 0 ? r[iTalhao]    : '').trim(),
          area,
          tipo:       String(iPlantio   >= 0 ? r[iPlantio]   : 'Mecanizado').trim() || 'Mecanizado',
          variedade:  String(iVariedade >= 0 ? r[iVariedade] : '').trim(),
        };
      })
      .filter(Boolean);
  }

  /* ── normalização BASE ───────────────────────────────────────────── */
  function _normalizarBase(rows) {
    if (!rows || !rows.length) return [];

    // Detecta header: linha que tem 'UNIDADE' e 'DESCRIÇÃO' e 'TALHÃO'
    let headerLine = -1;
    for (let i = 0; i < Math.min(8, rows.length); i++) {
      const vals = rows[i].map(v => _norm(String(v||'')));
      if (vals.includes('UNIDADE') && vals.some(v => v.startsWith('DESCRI')) && vals.some(v => v.startsWith('TALH'))) {
        headerLine = i;
        break;
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

    return dataRows
      .map(r => {
        if (!r || r.length < 5) return null;
        const unidade = String(r[1] || '').trim().toUpperCase();
        if (!unidade || unidade === 'UNIDADE' || unidade === '') return null;

        // Área com vírgula decimal: "16,27" → 16.27
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
          codFazenda: String(iLocal     >= 0 ? r[iLocal]     : '').trim(),
          fazenda:    _limpa(iDescricao >= 0 ? r[iDescricao] : ''),
          talhao:     String(iTalhao    >= 0 ? r[iTalhao]    : '').trim(),
          variedade:  _limpa(iVarAtual  >= 0 ? r[iVarAtual]  : ''),
          ambiente:   _limpa(iAmbiente  >= 0 ? r[iAmbiente]  : ''),
          area,
          estagio:    _limpa(iEstagio   >= 0 ? r[iEstagio]   : ''),
          refCiclo:   _limpa(iRefCiclo  >= 0 ? r[iRefCiclo]  : ''),
          motivo:     _limpa(iMotivo    >= 0 ? r[iMotivo]    : ''),
          modelo:     _limpa(iModelo    >= 0 ? r[iModelo]    : ''),
          frente:     _limpa(iFrente    >= 0 ? r[iFrente]    : ''),
          dataPlant,
          mes,
          tipo:       _limpa(iTipo      >= 0 ? r[iTipo]      : ''),
        };
      })
      .filter(r => r !== null && r.fazenda);
  }

  /* ── normalização PCP (header:true normal) ───────────────────────── */
  function _normalizarPcp(rows) {
    if (!rows || !rows.length) return [];
    const fields = Object.keys(rows[0]);
    const cData    = _findCol(fields, ['DATA APLICACAO','DATA APLIC','DATA']);
    const cCodOp   = _findCol(fields, ['COD OPERACAO','CODOP','COD OP','CODIGO OPERACAO','COD. OPERACAO']);
    const cFazenda = _findCol(fields, ['DESCRICAO FAZENDA','DESC FAZENDA','DESCFAZENDA','FAZENDA']);
    const cTalhao  = _findCol(fields, ['TALHAO','TALHÃO','TALHON']);

    return rows
      .map(r => {
        const codOp = String(r[cCodOp] || '').trim();
        if (!['1013','1014','1045'].includes(codOp)) return null;
        return {
          data:    _parseData(r[cData]),
          codOp,
          fazenda: String(r[cFazenda] || '').trim(),
          talhao:  String(r[cTalhao]  || '').trim(),
        };
      })
      .filter(r => r !== null && r.data);
  }

  /* ── renderização principal ──────────────────────────────────────── */
  function _renderizarTudo() {
    if (!_cache[_safraAtual].loaded) return;
    _renderizarKpis();
    _atualizarSubTextoSafra(_safraAtual);
    _popularFazendaSelect();
    _definirDatasDefault();
    filtrarPlantioAvanco();
    _renderizarPipeline();
    _renderizarBase();
    atualizarCardPlantioHome();
  }

  /* ── KPI cards ───────────────────────────────────────────────────── */
  function _renderizarKpis() {
    const diario = _d();
    const base   = _b();
    const totalBase  = base.reduce((s, r) => s + r.area, 0);
    const totalPlant = diario.reduce((s, r) => s + r.area, 0);
    const pct        = totalBase > 0 ? Math.min((totalPlant / totalBase) * 100, 100) : 0;
    const agora      = new Date();
    const totalMes   = diario
      .filter(r => r.data && r.data.getMonth() === agora.getMonth() && r.data.getFullYear() === agora.getFullYear())
      .reduce((s, r) => s + r.area, 0);

    const $ = id => document.getElementById(id);
    if ($('pla-kpi-total'))    $('pla-kpi-total').textContent    = totalBase.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ha';
    if ($('pla-kpi-plantado')) $('pla-kpi-plantado').textContent = totalPlant.toFixed(2).replace('.', ',') + ' ha';
    if ($('pla-kpi-mes'))      $('pla-kpi-mes').textContent      = totalMes.toFixed(2).replace('.', ',') + ' ha';
    if ($('pla-kpi-mes-sub'))  $('pla-kpi-mes-sub').textContent  = MESES_NOME[agora.getMonth() + 1] + '/' + agora.getFullYear();
    if ($('pla-progress-fill')) $('pla-progress-fill').style.width = pct.toFixed(1) + '%';
    if ($('pla-progress-pct'))  $('pla-progress-pct').textContent  = pct.toFixed(1) + '%';
  }

  /* ── card home: progresso plantio (usa 26/27 como referência principal) */
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

  /* ── select de fazenda ───────────────────────────────────────────── */
  function _popularFazendaSelect() {
    const sel = document.getElementById('pla-filtro-fazenda');
    if (!sel) return;
    const diario   = _d();
    const fazendas = [...new Set(diario.map(r => _nomeFaz(r.codFazenda, r.fazenda)).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));
    const anterior = sel.value;
    sel.innerHTML  = '<option value="">— Todas —</option>';
    fazendas.forEach(f => {
      const o = document.createElement('option');
      o.value = f; o.textContent = f;
      if (f === anterior) o.selected = true;
      sel.appendChild(o);
    });
  }

  /* ── datas padrão ────────────────────────────────────────────────── */
  function _definirDatasDefault() {
    const ini = document.getElementById('pla-data-ini');
    const fim = document.getElementById('pla-data-fim');
    if (!ini || !fim || ini.value) return;
    const diario = _d();
    if (!diario.length) return;
    const datas = diario.map(r => r.data).filter(Boolean).sort((a, b) => a - b);
    ini.value = datas[0].toISOString().split('T')[0];
    fim.value = datas[datas.length - 1].toISOString().split('T')[0];
  }

  /* ══ BLOCO 1: O que foi plantado? ════════════════════════════════ */
  function filtrarPlantioAvanco() {
    const diario = _d();
    if (!diario.length) return;
    const iniVal    = document.getElementById('pla-data-ini')?.value;
    const fimVal    = document.getElementById('pla-data-fim')?.value;
    const fazFiltro = document.getElementById('pla-filtro-fazenda')?.value || '';
    const dIni = iniVal ? new Date(iniVal + 'T00:00:00') : null;
    const dFim = fimVal ? new Date(fimVal + 'T23:59:59') : null;

    _diarioFilt = diario.filter(r => {
      if (dIni && r.data < dIni) return false;
      if (dFim && r.data > dFim) return false;
      if (fazFiltro && _nomeFaz(r.codFazenda, r.fazenda) !== fazFiltro) return false;
      return true;
    });

    const total = _diarioFilt.reduce((s, r) => s + r.area, 0);
    const cont  = document.getElementById('pla-avanço-contador');
    if (cont) cont.textContent = `${_diarioFilt.length} registro${_diarioFilt.length !== 1 ? 's' : ''} · ${_fmtHa(total)} no período`;

    _renderizarAvancoFazenda();
  }

  function _renderizarAvancoFazenda() {
    const cont = document.getElementById('pla-resumo-container');
    if (!cont) return;

    if (!_diarioFilt || !_diarioFilt.length) {
      cont.innerHTML = '<div class="pla-empty"><i class="fas fa-seedling"></i>Nenhum registro no período selecionado.</div>';
      return;
    }

    // Agrupa por fazenda (código · nome)
    const porFaz = {};
    _diarioFilt.forEach(r => {
      const faz = _nomeFaz(r.codFazenda, r.fazenda) || 'Sem fazenda';
      if (!porFaz[faz]) porFaz[faz] = { total: 0, regs: [] };
      porFaz[faz].total += r.area;
      porFaz[faz].regs.push(r);
    });

    const sorted = Object.entries(porFaz).sort((a, b) => b[1].total - a[1].total);

    let html = '<div class="pla-resumo-grid">';
    sorted.forEach(([faz, dados], idx) => {
      // Agrupa detalhes por data
      const porData = {};
      dados.regs.forEach(r => {
        const k = _fmtData(r.data);
        if (!porData[k]) porData[k] = [];
        porData[k].push(r);
      });

      // Média de data
      const timestamps = dados.regs.map(r => r.data?.getTime()).filter(Boolean);
      const mediaData  = timestamps.length
        ? _fmtData(new Date(timestamps.reduce((s, t) => s + t, 0) / timestamps.length))
        : '—';

      let detalheHtml = `
        <div style="display:grid; grid-template-columns:90px 1fr 60px; gap:4px; font-size:9px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.4px; padding-bottom:4px; border-bottom:1px solid var(--border); margin-bottom:4px;">
          <span>Data</span><span>Talhão · Tipo</span><span style="text-align:right">Área</span>
        </div>`;

      Object.entries(porData)
        .sort(([a], [b]) => {
          const p = s => { const [d,m,y] = s.split('/'); return new Date(+y,+m-1,+d); };
          return p(a) - p(b);
        })
        .forEach(([data, regs]) => {
          regs.forEach(r => {
            detalheHtml += `
              <div style="display:grid; grid-template-columns:90px 1fr 60px; gap:4px; font-size:10px; align-items:center; padding:3px 0; border-bottom:1px dashed var(--border);">
                <span style="color:var(--text-3); font-weight:700;">${data}</span>
                <span style="color:var(--text-2);">Tal.&nbsp;${r.talhao || '—'} · ${r.tipo}</span>
                <span style="color:#E65100; font-weight:800; text-align:right;">${_fmtHa(r.area)}</span>
              </div>`;
          });
        });

      html += `
        <div class="pla-resumo-row" onclick="plantioToggleDetalhe('pla-det-${idx}', this)">
          <div class="pla-resumo-row-header">
            <span class="pla-resumo-fazenda"><i class="fas fa-map-marker-alt" style="margin-right:5px;color:var(--text-3);font-size:10px;"></i>${faz}</span>
            <span class="pla-resumo-ha">${_fmtHa(dados.total)}</span>
          </div>
          <div class="pla-resumo-sub">${dados.regs.length} registro${dados.regs.length > 1 ? 's' : ''} · média: ${mediaData} · toque para detalhes <i class="fas fa-chevron-down" id="chev-det-${idx}" style="font-size:9px;color:var(--text-3);"></i></div>
          <div class="pla-detalhe-wrap" id="pla-det-${idx}">${detalheHtml}</div>
        </div>`;
    });

    const grandTotal = _diarioFilt.reduce((s, r) => s + r.area, 0);
    html += `</div>
      <div style="text-align:right; padding:10px 4px 0; font-size:11px; font-weight:800; color:#E65100; border-top:1px solid var(--border); margin-top:8px;">
        Total: ${_fmtHa(grandTotal)}
      </div>`;

    cont.innerHTML = html;
  }

  function plantioToggleDetalhe(id, row) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('open');
    const ch = row.querySelector('.fa-chevron-down');
    if (ch) ch.style.transform = el.classList.contains('open') ? 'rotate(180deg)' : '';
  }

  /* ══ BLOCO 2: Sequência pós-plantio ══════════════════════════════ */
  function _renderizarPipeline() {
    const cont   = document.getElementById('pla-pipeline-container');
    if (!cont) return;
    const diario = _d();
    if (!diario.length) {
      cont.innerHTML = '<div class="pla-empty"><i class="fas fa-seedling"></i>Nenhum talhão plantado encontrado.</div>';
      return;
    }

    // Agrupa talhões plantados por fazenda (deduplica por talhão)
    const porFaz = {};
    diario.forEach(r => {
      const faz = _nomeFaz(r.codFazenda, r.fazenda) || 'Sem fazenda';
      if (!porFaz[faz]) porFaz[faz] = new Map();
      const key = r.talhao || '—';
      if (!porFaz[faz].has(key)) porFaz[faz].set(key, { data: r.data, area: r.area });
    });

    const sorted = Object.entries(porFaz).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

    let html = '';
    sorted.forEach(([faz, talhoes], idxFaz) => {
      let totOk = 0, totPend = 0, totBlq = 0;
      let talhoesList = '';

      Array.from(talhoes.entries()).forEach(([tal, info]) => {
        const etapas = _calcularEtapas(faz, tal, info.data);
        etapas.forEach(e => {
          if (e.status === 'ok') totOk++;
          else if (e.status === 'pendente') totPend++;
          else totBlq++;
        });

        let etapasHtml = '';
        etapas.forEach(e => {
          const icon = { ok: '✓', pendente: '⏳', bloqueado: '🔒' }[e.status];
          etapasHtml += `
            <div class="pla-pipe-etapa">
              <div class="pla-pipe-status-icon ${e.status}">${icon}</div>
              <span class="pla-pipe-etapa-nome"><i class="fas ${e.icon}" style="margin-right:5px;font-size:9px;opacity:0.7;"></i>${e.label}</span>
              <span class="pla-pipe-etapa-data">${e.data ? _fmtData(e.data) : '—'}</span>
            </div>`;
        });

        talhoesList += `
          <div class="pla-pipeline-talhao">
            <div class="pla-pipe-talhao-id">Tal. ${tal}</div>
            <div class="pla-pipe-etapas">${etapasHtml}</div>
          </div>`;
      });

      const chipsHtml =
        (totOk   > 0 ? `<span class="pla-pipe-chip ok">✓ ${totOk} feito${totOk > 1 ? 's' : ''}</span>` : '') +
        (totPend > 0 ? `<span class="pla-pipe-chip pendente">⏳ ${totPend} pendente${totPend > 1 ? 's' : ''}</span>` : '') +
        (totBlq  > 0 ? `<span class="pla-pipe-chip bloqueado">🔒 ${totBlq} aguarda${totBlq > 1 ? 'm' : ''}</span>` : '');

      html += `
        <div class="pla-pipeline-fazenda">
          <div class="pla-pipeline-header" onclick="plantioTogglePipeline('pla-pipe-faz-${idxFaz}', this)">
            <span class="pla-pipeline-fazenda-nome">
              <i class="fas fa-map-marker-alt" style="margin-right:6px;color:var(--text-3);font-size:10px;"></i>${faz}
              <span style="font-size:10px;font-weight:600;color:var(--text-3);margin-left:4px;">(${talhoes.size} ${talhoes.size === 1 ? 'talhão' : 'talhões'})</span>
            </span>
            <div class="pla-pipeline-chips">${chipsHtml}<i class="fas fa-chevron-down" style="font-size:10px;color:var(--text-3);margin-left:6px;"></i></div>
          </div>
          <div class="pla-pipeline-talhoes" id="pla-pipe-faz-${idxFaz}">
            ${talhoesList}
          </div>
        </div>`;
    });

    cont.innerHTML = html || '<div class="pla-empty">Nenhum dado encontrado.</div>';
  }

  function _calcularEtapas(fazenda, talhao, dataPlantio) {
    const etapas = [];
    let anteriorOk = true;

    SEQUENCIA.forEach(seq => {
      let status = 'pendente';
      let dataFeita = null;

      if (seq.fonte === 'diario') {
        status    = 'ok';
        dataFeita = dataPlantio;
      } else {
        if (!anteriorOk) {
          status = 'bloqueado';
        } else {
          const match = _p() ? _p().find(p =>
            p.codOp === seq.cod && (
              (p.talhao && String(p.talhao).trim() === String(talhao).trim()) ||
              (_norm(p.fazenda || '') === _norm(fazenda) && _norm(fazenda) !== '')
            )
          ) : null;
          if (match) { status = 'ok'; dataFeita = match.data; }
        }
      }

      anteriorOk = (status === 'ok');
      etapas.push({ ...seq, status, data: dataFeita });
    });

    return etapas;
  }

  function plantioTogglePipeline(id, headerEl) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('open');
    const ch = headerEl ? headerEl.querySelector('.fa-chevron-down') : null;
    if (ch) ch.style.transform = el.classList.contains('open') ? 'rotate(180deg)' : '';
  }

  /* ══ BLOCO 3: Planejamento — lista de fazendas colapsável ════════ */
  function _renderizarBase() {
    const base = _b();
    if (!base.length) return;

    // Chips de mês
    const meses = [...new Set(base.map(r => r.mes).filter(m => m > 0))].sort((a, b) => a - b);
    const chipsEl = document.getElementById('pla-mes-chips');
    if (chipsEl) {
      let html = '<button class="pla-mes-chip active" data-mes="0" onclick="filtrarPlantioBase(this)">Todos</button>';
      meses.forEach(m => {
        const ha = base.filter(r => r.mes === m).reduce((s, r) => s + r.area, 0);
        html += `<button class="pla-mes-chip" data-mes="${m}" onclick="filtrarPlantioBase(this)">${MESES_NOME[m]}<span style="font-size:8px;opacity:0.65;margin-left:3px;">${ha.toFixed(0)}ha</span></button>`;
      });
      chipsEl.innerHTML = html;
    }

    _renderizarBaseFiltrada(0);
  }

  function filtrarPlantioBase(btn) {
    document.querySelectorAll('.pla-mes-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _renderizarBaseFiltrada(parseInt(btn.dataset.mes) || 0);
  }

  function _renderizarBaseFiltrada(mes) {
    const cont = document.getElementById('pla-base-container');
    const base = _b();
    if (!cont || !base.length) return;

    const filtrado = mes === 0 ? base : base.filter(r => r.mes === mes);
    if (!filtrado.length) {
      cont.innerHTML = '<div class="pla-empty"><i class="fas fa-seedling"></i>Nenhum talhão para este mês.</div>';
      return;
    }

    // Agrupa por fazenda (código · nome)
    const porFaz = {};
    filtrado.forEach(r => {
      const faz = _nomeFaz(r.codFazenda, r.fazenda) || 'Sem fazenda';
      if (!porFaz[faz]) porFaz[faz] = [];
      porFaz[faz].push(r);
    });

    // Ordenação
    const sortVal = document.getElementById('pla-base-sort')?.value || 'faz-az';
    const sorted = Object.entries(porFaz).sort((a, b) => {
      if (sortVal === 'faz-az')  return a[0].localeCompare(b[0], 'pt-BR');
      if (sortVal === 'faz-za')  return b[0].localeCompare(a[0], 'pt-BR');
      const haA = a[1].reduce((s, r) => s + r.area, 0);
      const haB = b[1].reduce((s, r) => s + r.area, 0);
      if (sortVal === 'ha-desc') return haB - haA;
      if (sortVal === 'ha-asc')  return haA - haB;
      // mes-asc: menor mês primeiro
      const mesA = Math.min(...a[1].map(r => r.mes || 99));
      const mesB = Math.min(...b[1].map(r => r.mes || 99));
      return mesA - mesB;
    });
    const grandTotal = filtrado.reduce((s, r) => s + r.area, 0);

    let html = '';
    sorted.forEach(([faz, talhoes], idxFaz) => {
      const totalFaz = talhoes.reduce((s, r) => s + r.area, 0);
      const idBody   = `pla-faz-body-${idxFaz}`;

      // Lista de talhões da fazenda (montada uma vez)
      let talhoesHtml = '';
      talhoes.forEach(r => {
        const tags = [];
        if (r.variedade) tags.push(`<span class="pla-talhao-tag variedade">${r.variedade}</span>`);
        if (r.tipo)      tags.push(`<span class="pla-talhao-tag tipo">${r.tipo}</span>`);
        if (r.ambiente)  tags.push(`<span class="pla-talhao-tag ambiente">${r.ambiente}</span>`);
        if (r.modelo)    tags.push(`<span class="pla-talhao-tag">${r.modelo}</span>`);
        if (r.mes)       tags.push(`<span class="pla-talhao-tag">${MESES_NOME[r.mes]}${r.dataPlant ? '/' + r.dataPlant.getFullYear().toString().slice(-2) : ''}</span>`);

        talhoesHtml += `
          <div class="pla-talhao-card">
            <div class="pla-talhao-card-row">
              <span class="pla-talhao-nome">Talhão ${r.talhao}</span>
              <span class="pla-talhao-ha">${_fmtHa(r.area)}</span>
            </div>
            ${tags.length ? `<div class="pla-talhao-info">${tags.join('')}</div>` : ''}
          </div>`;
      });

      html += `
        <div class="pla-pipeline-fazenda" style="margin-bottom:8px;">
          <div class="pla-pipeline-header" onclick="plantioToggleFazenda('${idBody}', this)">
            <span class="pla-pipeline-fazenda-nome">
              <i class="fas fa-map-marker-alt" style="margin-right:6px;color:var(--text-3);font-size:10px;"></i>${faz}
            </span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:11px;font-weight:800;color:#E65100;">${_fmtHa(totalFaz)}</span>
              <span style="font-size:10px;color:var(--text-3);">${talhoes.length} ${talhoes.length === 1 ? 'talhão' : 'talhões'}</span>
              <i class="fas fa-chevron-down" style="font-size:10px;color:var(--text-3);"></i>
            </div>
          </div>
          <div class="pla-pipeline-talhoes" id="${idBody}" style="padding:8px 0 4px;">
            ${talhoesHtml}
          </div>
        </div>`;
    });

    html += `
      <div style="text-align:right; padding:10px 4px 2px; font-size:11px; font-weight:800; color:#E65100; border-top:1px solid var(--border); margin-top:4px;">
        ${filtrado.length} talhões · Total: ${_fmtHa(grandTotal)}
      </div>`;

    cont.innerHTML = html;
  }

  function plantioToggleFazenda(id, headerEl) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('open');
    const ch = headerEl ? headerEl.querySelector('.fa-chevron-down') : null;
    if (ch) ch.style.transform = el.classList.contains('open') ? 'rotate(180deg)' : '';
  }

  /* ══ CONSULTA ENTRE SAFRAS ════════════════════════════════════════ */
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

    // KPIs
    const $ = id => document.getElementById(id);
    if ($('pla-comp-ha-2526')) $('pla-comp-ha-2526').textContent = _fmtHa(ha2526);
    if ($('pla-comp-reg-2526')) $('pla-comp-reg-2526').textContent = `${f2526.length} registro${f2526.length !== 1 ? 's' : ''}`;
    if ($('pla-comp-ha-2627')) $('pla-comp-ha-2627').textContent = _fmtHa(ha2627);
    if ($('pla-comp-reg-2627')) $('pla-comp-reg-2627').textContent = `${f2627.length} registro${f2627.length !== 1 ? 's' : ''}`;

    const total = ha2526 + ha2627;
    if ($('pla-comp-contador')) $('pla-comp-contador').textContent =
      `25/26: ${_fmtHa(ha2526)} · 26/27: ${_fmtHa(ha2627)} · Total: ${_fmtHa(total)}`;

    if (!iniVal && !fimVal) return;

    // Monta mapa de mês → fazendas → { a, b }
    const mesMap = {}; // { 'AAAA-MM': { label, a, b, fazendas: { nomeFaz: {a,b} } } }

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

    const maxHa      = Math.max(...Object.values(mesMap).map(m => Math.max(m.a, m.b)), 1);
    const mesesSorted = Object.entries(mesMap).sort(([a], [b]) => a.localeCompare(b));

    let htmlMeses = '';
    if (!mesesSorted.length) {
      htmlMeses = '<div class="pla-empty"><i class="fas fa-seedling"></i>Nenhum registro no período.</div>';
    } else {
      mesesSorted.forEach(([key, m], idx) => {
        const wA = ((m.a / maxHa) * 100).toFixed(1);
        const wB = ((m.b / maxHa) * 100).toFixed(1);
        const idFaz = `pla-mes-faz-${idx}`;

        // Fazendas deste mês ordenadas pelo maior total
        const fazSorted = Object.entries(m.fazendas)
          .sort((x, y) => (y[1].a + y[1].b) - (x[1].a + x[1].b));

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
              ${totalFaz} fazenda${totalFaz !== 1 ? 's' : ''} · toque para ver
              <i class="fas fa-chevron-down pla-comp-mes-toggle"></i>
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

  /* ── toggle colapsável ───────────────────────────────────────────── */
  function togglePlantioCard(headerEl) {
    const card = headerEl.closest('.plantio-card-collapsible');
    if (card) card.classList.toggle('open');
  }

})(); /* fim IIFE PLANTIO */


const _SB_URL  = 'https://umlwcilvhpoxhnqaalqn.supabase.co';
const _SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbHdjaWx2aHBveGhucWFhbHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODExNjUsImV4cCI6MjA5NjU1NzE2NX0.HMw-vhMYDf6zfUrHiNNDZ1xBMNt3J0FGo2mW1IHeT2Q';
const _sbClient = supabase.createClient(_SB_URL, _SB_KEY, {
  auth: {
    persistSession: true,          // mantém sessão no localStorage
    autoRefreshToken: true,        // renova token automaticamente
    storageKey: 'ctt_sb_session',  // chave isolada do resto do app
  }
});

/* ── Verifica sessão ao carregar ── */
(async function iniciarAuth() {
  // Restaura "lembrar de mim" salvo
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

/* ── Navegação entre painéis ── */
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

/* ── Mostrar/ocultar senha ── */
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

/* ── Login ── */
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

  // Salva preferência "lembrar de mim"
  if (lembrar) {
    localStorage.setItem('ctt_lembrar', '1');
    localStorage.setItem('ctt_email_salvo', email);
  } else {
    localStorage.removeItem('ctt_lembrar');
    localStorage.removeItem('ctt_email_salvo');
  }
  // sucesso: onAuthStateChange dispara _onLoginSuccess automaticamente
}

/* ── Cadastro ── */
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
    options: {
      emailRedirectTo: 'https://martinsdaniel1201-maker.github.io/controle_gestao_agricola'
    }
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

  // Limpa campos e mostra painel de confirmação
  document.getElementById('cad-senha').value    = '';
  document.getElementById('cad-confirma').value = '';
  mostrarConfirmacao(email);
}

/* ── Logout ── */
async function fazerLogout() {
  await _sbClient.auth.signOut();
  // onAuthStateChange dispara _onLogout automaticamente
}

/* ── Callbacks de estado ── */
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

  // ── Boas-vindas ──
  iniciarWelcomeBar(nomeUsuario);

  // Toast de boas-vindas — exibe apenas 1x por dia
  const _hoje = new Date().toISOString().slice(0, 10);
  const _chave = 'ctt_toast_bv_' + (user.id || nomeUsuario);
  if (localStorage.getItem(_chave) !== _hoje) {
    localStorage.setItem(_chave, _hoje);
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
  
