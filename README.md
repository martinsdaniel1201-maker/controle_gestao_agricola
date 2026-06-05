# 🌾 Painel de Controle Técnico Agrícola
> **Unidade Passos/MG** — Aplicativo mobile-first para supervisores de campo acompanharem a colheita de cana-de-açúcar em tempo real, eliminando planilhas físicas e papéis.

![Status do Projeto](https://img.shields.io/badge/Status-Em_Desenvolvimento-dynamic)
![Plataforma](https://img.shields.io/badge/Plataforma-Mobile--First%20%7C%20SPA-brightgreen)
![Ambiente](https://img.shields.io/badge/Operação-Offline_Ready-blue)

---

## 📱 Sobre o Projeto

O **Painel de Controle Técnico Agrícola** é uma Single Page Application (SPA) desenvolvida com foco em usabilidade no campo. Ele centraliza a simulação de colheita, controle de frentes de corte, dados climáticos e calculadoras técnicas agronômicas em uma interface ágil, responsiva e de alto contraste, ideal para leitura sob o sol.

### ⚡ Recursos Chave
*   **Operação Offline:** Funciona sem internet no campo. Os dados de simulação ficam salvos localmente no aparelho.
*   **Inteligência Artificial Integrada:** Exibe o módulo *Sabedoria de Campo* com dicas técnicas geradas por IA a cada inicialização.
*   **Dados em Tempo Real:** Integração com a **NASA Power API** para agrometeorologia e cálculo de acúmulo térmico.

---

## 🛠️ O que cada aba faz

| Módulo | Descrição | Principais Recursos |
| :--- | :--- | :--- |
| **🚜 Simulador** | Gestão operacional de colheita | Inserção de colhedoras operando, toneladas colhidas, metas e preço do diesel. |
| **📊 Controle Frentes** | Resumo visual interno | Gráficos dinâmicos que se atualizam em tempo real e emitem alertas automáticos de desvio. |
| **📋 Liberações** | Sincronia com o GATEC | Monitoramento de talhões liberados para corte, com visualização adaptada para blocos/cards no mobile. |
| **🌤️ Clima & Agro** | Agrometeorologia & Logística | Monitoramento de radiação e temperatura via **NASA**, cálculo de Graus-Dia (maturação) e ETA de caminhões via **OpenStreetMap**. |
| **✅ Conf. OS** | Gestão de equipe | Cruzamento e conferência de Operadores vs. Ordens de Serviço por máquina. |
| **🗺️ Mapas** | Caderno de talhões digital | Divisão de áreas próprias e de fornecedores mapeadas por safra. |
| **🧮 Calculadora** | Ferramentas agronômicas | Cálculos instantâneos de TCH, TAH, ATR, rendimento de plantio e áreas de muda. |

---

## 📖 Como Usar — Passo a Passo

### 1️⃣ Tela Inicial & Sabedoria de Campo
Ao abrir o app, você verá o menu principal composto por botões coloridos de acesso rápido. No rodapé, o módulo **Sabedoria de Campo** exibe insights agronômicos gerados por IA para apoiar as decisões do dia.

### 2️⃣ Simulação e Acompanhamento de Colheita
Toque em **"Simulador"** para inserir os dados operacionais das frentes de corte (máquinas ativas, volume colhido, meta do dia). O aplicativo processa as equações matemáticas em tempo real, dispensando o uso de calculadoras externas.

### 3️⃣ Análise Gráfica no Controle de Frentes
Dentro do painel do Simulador, mude para a sub-aba **Controle Frentes** para visualizar gráficos de desempenho. Se a eficiência do turno estiver abaixo da meta, alertas visuais automáticos serão disparados na tela.

### 4️⃣ Cálculos de Produtividade (TCH, TAH e ATR)
Na aba **Calculadora**, insira a área cortada em hectares (`ha`) e o `ATR` médio. O sistema calcula na hora o TCH (Toneladas de Cana por Hectare) e o TAH (Toneladas de Açúcar por Hectare).
> ⚠️ **Alerta Automático:** Resultados de TCH abaixo de **65 t/ha** acendem imediatamente um alerta vermelho na tela indicando quebra de produtividade.

### 5️⃣ Consulta Climatológica & Logística (ETA)
Acesse **Clima & Agro** para obter a radiação solar e temperatura da região direto da API da NASA. O app converte esses dados em **Graus-Dia Acumulados**, indicando o nível de maturação do canavial, além de estimar o tempo de viagem dos caminhões até a usina.

### 6️⃣ Navegação Simples e Retenção de Dados
Para mudar de módulo, toque no botão **`← Menu`** localizado no topo esquerdo da tela. Não se preocupe em perder dados: tudo o que é digitado é persistido automaticamente no cache do navegador.

---

## 🧰 Tecnologias Utilizadas

*   **Front-end:** HTML5, CSS3 (Variáveis nativas para Light/Dark Mode, layouts flexíveis com Flexbox/Grid)
*   **Lógica & Persistência:** JavaScript Vanilla (ES6+), LocalStorage
*   **Gráficos:** Chart.js
*   **APIs Externas:** NASA Power API (Dados climáticos), OpenStreetMap (Cálculo de rotas e ETA)
*   **Bibliotecas Auxiliares:** PapaParse (Processamento de dados), html2pdf (Exportação de relatórios)

---

Developed for **Controle Técnico Agrícola — Unidade Passos/MG** 🌾
