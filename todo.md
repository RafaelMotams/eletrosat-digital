# Eletrosat Digital - TODO

## Banco de Dados / Schema
- [x] Tabela: escolas (inep, nome, endereco, cidade, lat, lng, qtd_ap, velocidade, tipo_conexao, status, tecnico_id, data_conclusao)
- [x] Tabela: tecnicos (id, nome, telefone, email, senha_hash, cidade_responsavel, user_id)
- [x] Tabela: ordens_servico (id, escola_id, tecnico_id, data, status, qtd_ap_instalado, observacao)
- [x] Tabela: atribuicoes_manuais (escola_id, tecnico_id) para sobrescrever regra de cidade

## Backend (tRPC Routers)
- [x] Router: tecnicos (criar, editar, listar, deletar)
- [x] Router: escolas (listar, editar, importar CSV/Excel, atribuir técnico)
- [x] Router: ordens_servico (listar, criar, concluir, filtrar por técnico/período)
- [x] Router: dashboard (totais, produtividade por técnico)
- [x] Router: relatorios (filtros por técnico e período, ranking)
- [x] Router: atribuicoes (por cidade automático, por escola manual)
- [x] Endpoint: importação de planilha Excel/CSV
- [x] Notificação ao admin quando OS concluída

## Painel Administrativo (Admin)
- [x] Layout com sidebar (AdminLayout customizado)
- [x] Página: Dashboard com KPIs (total escolas, concluídas, pendentes, APs, produtividade)
- [x] Página: Gestão de Técnicos (CRUD completo)
- [x] Página: Gestão de Escolas (lista, importar planilha, editar)
- [x] Página: Atribuições (por cidade automático + por escola manual)
- [x] Página: Ordens de Serviço (lista completa com filtros)
- [x] Página: Relatórios (filtros por técnico/período, ranking, gráficos)
- [x] Página: Mapa com marcadores coloridos por status

## Aplicativo do Técnico
- [x] Tela de Login (email + senha)
- [x] Tela Principal: lista de escolas/OS atribuídas ao técnico logado
- [x] Tela de Detalhes da OS (nome, endereço, AP, tipo de link)
- [x] Botão WhatsApp (link direto)
- [x] Botão Google Maps (rota automática via lat/lng)
- [x] Botão "Marcar como Concluído" com formulário (qtd AP + observação)
- [x] Atualização em tempo real após conclusão

## Sincronização e Notificações
- [x] Polling/refetch automático a cada 30s para atualização em tempo real
- [x] Notificação automática ao admin quando OS concluída
- [x] Status atualizado no painel admin imediatamente via invalidate

## Estilo Visual
- [x] Paleta: azul escuro (#0f172a, #1e3a5f) + branco + verde (#22c55e)
- [x] Tipografia forte (Inter/Poppins)
- [x] Layout SaaS moderno com sidebar
- [x] Ícones Lucide React
- [x] Responsivo (mobile-first para app do técnico)

## Dados Iniciais
- [x] Importar 23 escolas de Monte Santo (BA) da planilha enviada
- [x] Seed de técnicos de exemplo

## Testes
- [x] Testes vitest para routers principais (30 testes passando)
- [x] Testes de isolamento multi-tenant (20 testes: listagem, getById, update, delete, dashboard, acesso não autenticado)

## APK Android (Capacitor)
- [x] Criar projeto React standalone do app do técnico
- [x] Instalar Capacitor e configurar Android
- [x] Build do app e geração do APK
- [x] Entregar APK ao usuário

## Planilha DOC-20260424-WA0261.xlsx
- [x] Atualizar schema: adicionar campos apAdicional e kitWifi na tabela escolas
- [x] Migrar banco de dados com novos campos
- [x] Atualizar seed com dados completos da planilha (incluindo apAdicional e kitWifi)
- [x] Criar página "Planilha" no painel admin com tabela completa e filtros
- [x] Exibir todos os 13 campos da planilha: INEP, UF, Município, Nome, Endereço, Lat, Lng, AP Adicional, Telefone, Kit Wi-Fi, Vel. Mínima, Vel. Ofertada, Solução
- [x] Botão de download da planilha em formato Excel/CSV

## Importação Universal de Planilhas
- [x] Backend: endpoint multipart para upload de .xlsx, .xls e .csv
- [x] Backend: parser automático que detecta colunas por nome (fuzzy match)
- [x] Backend: retornar preview dos dados antes de confirmar importação
- [x] Frontend: componente de upload com drag-and-drop
- [x] Frontend: tela de pré-visualização com mapeamento de colunas
- [x] Frontend: confirmação e importação definitiva com feedback de progresso

## Bugs
- [x] Corrigir bug de criação de login de técnico no painel admin

## Importação Planilha + Botões App + Auto-preenchimento INEP
- [x] Analisar planilha DOC-20260424-WA0261.xlsx e importar todas as escolas no banco
- [x] Botão WhatsApp no app do técnico usando telefone da escola
- [x] Botão Google Maps no app do técnico usando latitude/longitude da escola
- [x] Auto-preenchimento ao selecionar INEP: nome, APs, velocidade ofertada

## Redesign Visual Completo
- [x] CSS global: nova paleta premium azul-marinho/grafite com acentos verde-esmeralda e dourado
- [x] Tipografia: Inter para corpo, Sora para títulos via Google Fonts
- [x] Sidebar admin: gradiente profundo, ícones com glow, avatar do usuário
- [x] Dashboard admin: cards com gradiente, gráficos modernos, animações suaves
- [x] Páginas admin: tabelas elegantes, badges coloridos, modais premium
- [x] App técnico Login: tela splash com gradiente e logo animado
- [x] App técnico Home: cards de OS com status visual, barra de progresso
- [x] App técnico OS: botões WhatsApp verde e Maps azul com ícones grandes
- [x] Landing page: hero section redesenhada com glassmorphism

## Redesign Enterprise App Técnico (02/05/2026)
- [x] Login: visual premium com animações, logo centralizada, fundo com gradiente profissional
- [x] Splash screen: tela de carregamento com logo ao abrir o app
- [x] Boas-vindas apenas no primeiro login (flag no localStorage)
- [x] Home: dashboard com cards de métricas, progresso visual, lista de OS redesenhada
- [x] Home: filtros rápidos por status (Todos / Pendentes / Em andamento / Concluídos)
- [x] Home: card de escola com avatar colorido, badge de APs destacado, ações rápidas
- [x] Bottom Nav: design moderno com indicador ativo animado
- [x] Tela de OS: visual de etapas (stepper) para iniciar/concluir
- [x] Perfil: tela com avatar, estatísticas pessoais, botão de logout estilizado
- [x] Histórico: lista de OS concluídas com filtro por data
- [x] APK com ícone Netvionis atualizado (netvionis-tecnico-v3.apk, 4.3MB)

## Atualização App Técnico (02/05/2026)
- [x] Logo Netvionis na tela de login do app do técnico
- [x] Logo Netvionis no ícone do app (favicon/manifest)
- [x] Mostrar quantidade de APs na lista de OS do app do técnico (badge roxo com ícone Wi-Fi)

## Bug - Login Técnico (duplicata inativa)
- [x] Corrigir getTecnicoByEmail para filtrar apenas registros ativos (técnicos com mesmo email duplicado causavam falha de login)

## Bugs - Atribuição
- [x] Corrigir NotFoundError: removeChild na página de Atribuições ao atribuir técnico

## Bug - App do Técnico
- [x] Corrigir: escolas atribuídas no painel admin não aparecem no app do técnico

## Redesign Total App do Técnico v2
- [x] Login premium com animações e ícones de tecnologia
- [x] Home com stats, barra de progresso e lista de escolas premium com bottom nav
- [x] Tela de OS: INEP, nome, endereço, APs, WhatsApp, Google Maps com dados reais
- [x] Mapa de escolas com marcadores coloridos por status (verde/amarelo/azul)
- [x] Roteirizador de rotas (abre Google Maps com todas as escolas pendentes como waypoints)
- [x] Tela de perfil do técnico com estatísticas pessoais e badge de conquista
- [x] Histórico de OS concluídas e pendentes no app
- [x] Navegação bottom tab bar estilo app nativo (Início, Mapa, Histórico, Perfil)

## Correções v3
- [x] WhatsApp: sempre usar 5575 + 8/9 dígitos locais, remover prefixos duplicados (55, 75, 0 inicial)
- [x] Importação de planilha: botão "Avançar" agora sempre visível com feedback claro sobre campos obrigatórios
- [x] Importação: detecção automática melhorada com fallback manual para INEP e Nome
- [x] Importação: indicador de status (verde/amarelo) mostrando se pode avançar
- [x] Importação: dica textual explicando quais campos faltam para habilitar o botão
- [x] Importação: preview agora mostra coluna Telefone

## Correções v4
- [x] Mapa técnico: popup com endereço, cidade, INEP, nome completo + botão de rota funcional
- [x] Mapa técnico: botão Rota abre Google Maps com navegação GPS até a escola selecionada
- [x] Home técnico: lista de escolas com nome, INEP, endereço e cidade visíveis
- [x] WhatsApp: botão 'Buscar Tel. (IA)' chama LLM que busca e salva telefone automaticamente
- [x] Dashboard admin: contadores reais (total escolas, concluídas, APs planejados vs instalados)
- [x] Busca automática de telefone por INEP via IA (LLM + web search), salva no banco e exibe WhatsApp

## Correções v5
- [x] WhatsApp: link direto do banco (telefone/telefoneWhatsApp), sem IA, botão sempre visível
- [x] Endereço completo no app (sem truncar)
- [x] Mapa: popup com INEP, nome, endereço, cidade completos + roteamento por coordenadas GPS
- [x] Mapa "Todas Escolas": mostrar INEP, nome, endereço completo em cada item da lista
- [x] Dashboard admin: resultado técnico com dados reais (OS concluídas, APs instalados, média/dia)
- [x] Sync automático no painel admin (refetch a cada 30s quando online)
- [x] Roteamento Google Maps por coordenadas (lat/lng) em vez de endereço texto

## Funcionalidade - Apagar Escolas por Cidade
- [x] Backend: endpoint escolas.deletarPorCidade (adminProcedure) com confirmação
- [x] Frontend: botão "Apagar por Cidade" na página Escolas com modal de seleção de cidade e confirmação

## Correções v6
- [x] WhatsApp: botão direto do banco (sem IA), link wa.me/5575+número, sem fallback de busca
- [x] Endereço completo sem truncar no app (Home e Mapa)
- [x] Lista "Todas as escolas" no Mapa: mostrar INEP, endereço e nome completo
- [x] Roteamento Google Maps por coordenadas ordenado por proximidade (nearest neighbor)
- [x] Dashboard admin: resultado técnico Rodrigo com dados reais (OS concluídas, APs instalados, média/dia)
- [x] Dashboard admin: sync automático a cada 30s quando online, indicador de status
- [x] Relatorios admin: tornar publicProcedure para funcionar sem login OAuth

## Correções v7
- [x] Endereço completo sem truncar na OS (tela de detalhe)
- [x] Endereço completo sem truncar na Home do técnico (lista de escolas)
- [x] Ordenar escolas por rota (proximidade GPS nearest-neighbor) na Home do técnico

## Suporte Offline App Técnico
- [x] Service Worker: cache de assets (HTML, JS, CSS) para funcionar sem internet
- [x] Cache local de escolas no localStorage ao carregar online
- [x] Home, Mapa e OS usam cache quando offline
- [x] Indicador visual de status offline no app
- [x] Fila de ações offline (concluir OS) sincroniza quando voltar online

## Correções v8
- [x] Relatórios admin: bug do filtro por técnico corrigido (strings ISO em vez de Date objects)
- [x] Service Worker atualizado para não cachear arquivos JS/TS do Vite (evitar servir versões antigas)
- [x] Relatórios admin: Rodrigo aparece com 4 escolas concluídas e 11 APs instalados

## Relatório Detalhado de OS
- [x] Backend: endpoint relatorios.osDetalhadas — lista OS concluídas com nome escola, INEP, qtd AP, técnico, data, observação
- [x] Frontend: tabela de OS concluídas na página Relatórios com colunas: escola, INEP, APs instalados, técnico, data
- [x] Frontend: filtros por técnico e por período (igual ao relatório de resumo)
- [x] Frontend: totalizador no rodapé da tabela (total de escolas e APs)

## Melhorias v9
- [x] Corrigir erro "Invalid time value" na página Relatórios (formatDate com valor inválido)
- [x] Schema: adicionar campo statusMotivo (escola_desativada, em_reforma, mudanca_endereco) e fotoMapaCalor na tabela ordensServico
- [x] Schema: adicionar status "nao_instalada" na tabela escolas
- [x] App técnico: botão "Iniciar OS" para mudar status de aberta para em_andamento
- [x] App técnico: opção "Não Instalada" com seleção de motivo (escola desativada, em reforma, mudança de endereço)
- [x] App técnico: upload de foto do mapa de calor ao concluir OS
- [x] Painel admin: exibir foto do mapa de calor na OS (página Ordens de Serviço)
- [x] Painel admin: escolas não instaladas aparecem em vermelho na lista de escolas
- [x] Atribuição Manual: filtro por cidade
- [x] CSV OS concluídas: colunas na ordem correta (Escola, INEP, APs instalados, Município, Técnico, Data, Observação)

## Bug - Upload Foto Mapa de Calor
- [x] Corrigir upload de foto do mapa de calor na OS do técnico (câmera e galeria não funcionam)
  - Removido capture="environment" do input principal
  - Adicionados dois inputs separados: Câmera (com capture) e Galeria (sem capture)
  - Dois botões visuais no modal de conclusão

## Correção SW v3
- [x] Service Worker atualizado para network-first (sempre busca versão mais recente do servidor)
- [x] Remove caches antigos automaticamente (v1, v2)
- [x] APK v5 gerado com SW v3

## Renomeação para Nestdrion
- [x] Atualizar nome "Eletrosat Digital" → "Nestdrion" em todo o projeto
- [x] Atualizar slogan → "Gestão inteligente para equipes externas"
- [x] Atualizar index.html (title, meta description, manifest)
- [x] Atualizar todos os componentes React com o nome antigo
- [x] Atualizar chaves de localStorage e nomes de arquivo exportado

## Renomeação para Netvionis
- [x] Substituir Nestdrion → Netvionis em todos os arquivos do projeto
- [x] Atualizar index.html (title, meta description, og:title)
- [x] Atualizar AdminLayout, Home, Login técnico, sw.js, useOfflineQueue
- [x] Gerar novo APK com nome Netvionis (v5)

## Redesign App Técnico - Visual Elegante
- [x] Login técnico: redesign premium com gradiente, glassmorphism e animações
- [x] Home técnico: cards coloridos com gradientes, estatísticas visuais, progresso animado
- [x] OS técnico: visual elegante com botões coloridos, badges de status, seções bem definidas
- [x] Histórico: cards premium com badges coloridos por status (verde/roxo/vermelho/amarelo)
- [x] TecnicoBottomNav: ícones com gradiente colorido no estado ativo (roxo/ciano/verde/dourado)

## Melhorias v10 - Roteirizador e INEP
- [x] Home técnico: roteirizador nearest-neighbor por GPS (ordenar escolas pela mais próxima sequencialmente)
- [x] Home técnico: botão "Abrir Rota Completa" que abre Google Maps com todas as escolas pendentes como waypoints
- [x] Home técnico: botão "Ir até" em cada card para navegar até a escola individualmente
- [x] Home técnico: botão "Localizar-me" para reordenar rota pela localização atual do técnico
- [x] Home técnico: INEP em destaque grande com gradiente roxo nos cards de escola
- [x] Home técnico: numeração de ordem na rota (1, 2, 3...) no avatar do card
- [x] Importação de planilha: ordenar escolas automaticamente por coordenadas (nearest-neighbor) ao importar
- [x] Importação: toast confirmando quantas escolas foram ordenadas por GPS

## Sistema de Revenda SaaS Multi-Tenant
- [x] Schema: tabela tenants (id, nome, slug, plano, status, criado_em)
- [x] Schema: tabela tenant_admins (id, tenant_id, nome, email, senha_hash, role: superadmin|admin)
- [x] Schema: adicionar tenant_id em escolas, tecnicos, ordens_servico
- [x] Backend: superadminRouter (criar/listar/editar/suspender tenants)
- [x] Backend: tenantAdminRouter (criar/listar/editar usuários admin por tenant)
- [x] Backend: isolamento de dados por tenant_id em todos os routers existentes (tenantAdminProcedure + filtros por tenantId em todos os routers)
- [x] Frontend: painel superadmin (/superadmin) com lista de clientes
- [x] Frontend: criar/editar cliente com nome, slug, plano, status
- [x] Frontend: criar usuário admin para cada cliente (email + senha)
- [x] Frontend: login do painel admin por email/senha (sem OAuth Manus)
- [x] Frontend: cada cliente acessa /admin com seus próprios dados isolados (AdminLayoutAuto detecta JWT vs OAuth)
- [x] Frontend: página de login unificada que detecta o tenant pelo slug ou email

## Redesign Enterprise Painel Admin (02/05/2026)
- [x] Login do admin: layout split com painel de branding + formulário premium
- [x] Sidebar enterprise: grupos de navegação, busca ⌘K, resumo rápido, colapso
- [x] Página de Configurações: alterar senha, informações da conta, sobre o sistema
- [x] Página de Ordens: tabela profissional com filtros avançados, badges de status
- [x] Router tenantAdmin.alterarSenha: endpoint para alterar senha do admin
- [x] Rota /admin/configuracoes adicionada ao App.tsx e menu de navegação

## Funcionalidade - Excluir Todas as OS
- [x] Backend: endpoint ordens.deletarTodas (tenantAdminProcedure) com confirmação
- [x] Frontend: botão "Excluir Todas" na página de Ordens com modal de confirmação (digitar "CONFIRMAR")

## App do Técnico - Melhorias (02/05/2026)
- [x] Remover opção "Abrir Rota Otimizada" do app (Home.tsx e Mapa.tsx)
- [x] Redesenhar tela de Ordem de Serviço (OrdemServico.tsx) com visual enterprise premium
- [x] Stepper visual aprimorado com animações e cores dinâmicas
- [x] Cards de informação da escola com layout mais elegante
- [x] Modais de conclusão e não-instalada com design premium

## Correções Visuais App - OS (02/05/2026)
- [x] Endereço em cor branca na tela de OS
- [x] Telefone organizado sem sair do quadrado (truncar/quebrar linha corretamente)
- [x] Badge "Pendente" com cor mais bonita e diferente
- [x] Visual geral da OS mais profissional e elegante
- [x] Gerar novo APK com ícone correto da Netvionis (v6)

## Sistema de Fotos Obrigatórias na OS
- [x] Adicionar tabela os_fotos no schema (os_id, categoria, url, key, created_at)
- [x] Adicionar procedure uploadOsFoto e getOsFotos no router
- [x] Implementar componente de upload câmera/galeria no OrdemServico.tsx
- [x] Seções de fotos: mapa de calor, fotos APs (até 15), etiqueta serial AP, etiqueta controladora, etiqueta nobreak
- [x] Bloquear conclusão da OS se alguma seção obrigatória não tiver foto
- [x] Visualizador de fotos por categoria no painel admin (OrdemServicoDetalhe ou similar)

## Modo Offline Completo (IndexedDB) - 04/05/2026
- [x] Hook useOfflineDB.ts: IndexedDB com stores "escolas" e "pendingOS"
- [x] Hook useSyncOfflineOS.ts: sincronização automática ao voltar online
- [x] OrdemServico.tsx: modo offline salva OS + fotos no IndexedDB via dbEnqueueOS
- [x] Service Worker v4: cache-first para assets, network-first para API, fallback offline
- [x] Componente OfflineSyncBanner: banner visual de status offline/sincronizando/sucesso
- [x] App.tsx: OfflineSyncBanner adicionado globalmente
- [x] trpcClient vanilla exportado do trpc.ts para uso fora de componentes React

## Sistema de Painel de Revenda (Cliente) — 04/05/2026
- [x] Superadmin: melhorar painel de gestão de clientes com design enterprise
- [x] Superadmin: criar cliente com nome, slug, email, senha do painel, plano e status
- [x] Superadmin: listar clientes com stats (técnicos, escolas, OS concluídas)
- [x] Superadmin: editar/suspender/reativar cliente
- [x] Superadmin: acessar painel do cliente diretamente (impersonar)
- [x] Painel cliente: rota /admin/* com dados isolados por tenant JWT (AdminLayoutTenant)
- [x] Painel cliente: Dashboard com KPIs do tenant
- [x] Painel cliente: Técnicos (criar, editar, deletar técnicos do tenant)
- [x] Painel cliente: Escolas (listar, importar planilha, editar escolas do tenant)
- [x] Painel cliente: Atribuições (por cidade + por escola do tenant)
- [x] Painel cliente: Ordens de Serviço (listar, filtrar, ver fotos do tenant)
- [x] Painel cliente: Relatórios (filtros por técnico/período, exportar Excel do tenant)
- [x] Painel cliente: Mapa interativo com escolas do tenant
- [x] Painel cliente: Importação de planilha para o tenant
- [x] Painel cliente: Configurações (alterar senha, nome da empresa)
- [x] App técnico: login do técnico funciona independente do tenant (tenantId isolado)
- [x] Login unificado: /admin/login para cliente, /superadmin/login para superadmin, /tecnico/login para técnico

## Valor por AP por Técnico — 04/05/2026
- [x] Schema: tabela tecnico_valores_ap (id, tecnico_id, qtd_ap 1-15, valor decimal)
- [x] Backend: procedures getValoresAp e setValoresAp (upsert) por técnico
- [x] Backend: osDetalhadas retorna valorCalculado (busca valor cadastrado para qtdApInstalado do técnico)
- [x] Frontend: seção "Tabela de Valores por AP" na página de Técnicos (editar técnico)
- [x] Frontend: relatório mostra coluna "Valor (R$)" calculada automaticamente por OS
- [x] Frontend: relatório mostra total de valor por técnico e total geral
- [x] Excel exportado já traz o valor calculado preenchido (não mais em branco)

## Redesign Total App Técnico v5 — Enterprise Premium (04/05/2026)
- [x] Login: splash screen com partículas animadas, logo com efeito de brilho pulsante, barra de progresso premium
- [x] Login: formulário com glassmorphism avançado, campos flutuantes, animação de entrada
- [x] Home: header com gradiente dinâmico, avatar do técnico, indicador online/offline
- [x] Home: cards de métricas com ícones animados e gradientes únicos por métrica
- [x] Home: lista de escolas com cards premium (número de rota, badge AP, status visual)
- [x] Home: barra de busca com filtros por status em chips coloridos
- [x] OS: stepper visual com animações de transição entre etapas
- [x] OS: cards de informação com ícones coloridos e layout mais espaçoso
- [x] OS: botões de ação (WhatsApp, Maps) com gradientes e ícones grandes
- [x] OS: seção de fotos com grid visual e indicadores de progresso
- [x] Perfil: header com gradiente e avatar grande com iniciais
- [x] Perfil: cards de stats com animações e cores distintas
- [x] Perfil: barra de progresso animada e badge de conquista
- [x] Histórico: cards premium com timeline visual e filtros elegantes
- [x] Bottom Nav: design com gradiente ativo, ícones animados e indicador de posição
- [x] CSS global: adicionar classes utilitárias para o app do técnico

## Bug: Duplicação de OS e fotos na sincronização offline (04/05/2026)
- [x] Frontend: adicionar flag `syncing` por OS no IndexedDB para evitar múltiplos envios simultâneos
- [x] Frontend: remover OS da fila ANTES de enviar (ou marcar como processando) para evitar reenvio
- [x] Frontend: tratar erro de sincronização sem recolocar na fila se já foi enviado com sucesso
- [x] Backend: tornar procedure concluirOS idempotente (upsert por escolaId+tecnicoId, não insert duplo)
- [x] Backend: verificar se OS já foi concluída antes de processar fotos novamente

## Excluir Planilha Importada (04/05/2026)
- [x] Backend: procedure deletePlanilha que remove todas as escolas importadas de uma planilha específica (por importId ou nome)
- [x] Frontend: botão "Excluir" em cada planilha importada com confirmação antes de deletar
- [x] Frontend: atualizar lista após exclusão

## Anti-Bug: Estabilidade para 15 Técnicos Simultâneos (05/05/2026)
- [x] Backend: adicionar middleware de rate limiting global para proteger endpoints de abuso
- [x] Backend: adicionar timeout nas queries do banco (30s) para evitar conexões presas
- [x] Backend: tornar concluirEscola thread-safe com verificação atômica
- [x] Backend: adicionar tratamento de erro global no Express (500 handler)
- [x] Backend: validação de tamanho de payload (fotos base64 > 10MB rejeitadas)
- [x] Frontend: retry com backoff exponencial no upload de fotos (3 tentativas)
- [x] Frontend: timeout de 60s nas chamadas tRPC de upload de foto
- [x] Frontend: clientId nas fotos no modo online para evitar duplicação em retry
- [x] Frontend: indicador visual de sincronização no app do técnico
- [x] Frontend: toast de erro claro quando upload de foto falha
- [x] Frontend: ErrorBoundary melhorado com mensagem em português
- [x] Frontend: proteção contra clique duplo no botão "Concluir OS"
- [x] Adicionar aba "Não Instaladas" no relatório Excel com colunas: Nome da Escola, INEP, Município, Técnico, Motivo, Data
- [x] Corrigir painel admin: escolas "Não Instaladas" não aparecem na listagem de escolas
- [x] Corrigir tela de Ordens do admin: exibir OS com status "Não Instalada" com motivo destacado em vermelho
- [x] Persistência de rota no app do técnico: ao voltar para o app, retornar para a última tela visitada
- [x] Integração Google Drive: salvar fotos das OS concluídas em pastas organizadas por técnico/escola
- [x] Edição completa de escola na página de planilha (modal com todos os campos)
- [x] Corrigir botão WhatsApp no app: usar telefone da escola para gerar link clicável
- [x] Corrigir bug câmera offline: ao abrir câmera na OS, app volta ao menu inicial
- [x] Melhorar persistência de rota: ao voltar do WhatsApp/Google Maps, retornar à tela da OS

## Atribuição de Técnico na Planilha (14/05/2026)
- [x] Coluna "Técnico" na tabela da página Planilha mostrando técnico atribuído
- [x] Seção "Técnico Responsável" no modal de edição com dropdown de técnicos
- [x] Ao salvar, atribui o técnico via mutation atribuicoes.porEscola

## Correção navegação ao fechar app (14/05/2026)
- [x] Ao fechar completamente o app e reabrir, vai para o menu (Home), não para a OS
- [x] Ao trocar de app (câmera, WhatsApp, Maps) e voltar, retorna para a OS corretamente
- [x] sessionStorage para rota de OS (limpa ao fechar), localStorage para menu (persiste)
- [x] Service Worker v6 atualizado com mesma lógica

## Bug - Iniciar OS e Status em Andamento (14/05/2026)
- [x] Corrigir: botão "Iniciar OS" não funciona no app do técnico
- [x] Corrigir: escolas com status "em_andamento" não aparecem corretamente no app
- [x] Causa raíz: backend não atualizava status da escola quando OS já existia no banco

## Criar OS no Painel Admin (22/05/2026)
- [x] Adicionar botão "Criar OS" na página de Ordens do admin
- [x] Modal para selecionar escola + técnico + iniciar OS manualmente
- [x] Mesmas ações do app: iniciar, concluir, não instalada (botões na tabela)

## Reestruturação fluxo OS (22/05/2026)
- [x] Remover botão "Marcar como Concluído" e modal de conclusão
- [x] Exibir seção de equipamentos (fotos + qtd APs) inline na página após iniciar OS
- [x] Adicionar botão "Finalizar Ordem de Serviço" na mesma página

## Reenvio de fotos para Google Drive (22/05/2026)
- [x] Endpoint backend: buscar todas as fotos salvas e enviar para o Drive
- [x] Botão no painel admin com feedback de progresso

## Bug - Escolas não aparecem offline (23/05/2026)
- [x] Salvar escolas no cache local (IndexedDB) ao carregar com internet
- [x] Restaurar escolas do cache ao abrir sem internet (carrega cache imediatamente ao iniciar)

## Rota do Dia no App do Técnico (26/05/2026)
- [x] Criar página RotaDia.tsx com seleção de escolas para o dia
- [x] Botão de compartilhar lista pelo WhatsApp
- [x] Registrar rota /tecnico/rota no App.tsx
- [x] Adicionar aba Rota no TecnicoBottomNav (5º item, ícone roxo)

## Melhorias Rota do Dia (26/05/2026)
- [x] Ao concluir OS, escola é removida automaticamente da lista da Rota do Dia (localStorage tecnico_rota_dia)
- [x] Botão "Iniciar Rota" na tela RotaDia.tsx: navega para a primeira escola da rota ao clicar

## Correção de Bug - Upload de Fotos (27/05/2026)
- [x] Bug crítico: upload de fotos usava httpBatchLink (agrupava múltiplas fotos em 1 request) — substituído por trpcUploadClient com httpLink (1 request por foto) em ambos os fluxos de conclusão
- [x] Bug crítico: upload ao Google Drive era feito ANTES das fotos serem enviadas ao S3 — corrigido para agendar o Drive 30s após a conclusão da OS
- [x] Melhoria: retry automático (3 tentativas com backoff 1s/2s) por foto no fluxo online
- [x] Melhoria: toast de progresso mostra "Enviando fotos... X/Y" durante o upload

## Edição de Data de Conclusão (Admin)
- [x] Backend: endpoint ordens.editarDataConclusao — atualiza dataConclusao na OS e na escola
- [x] Frontend: botão "Data" (azul) em OS concluídas na página de Ordens do painel admin
- [x] Frontend: modal com input datetime-local para selecionar nova data/hora de conclusão

## Login Admin com E-mail e Senha
- [x] Tabela adminUsers no banco — usa tenant_admins com tenantId=0 para superadmin
- [x] Endpoints: loginAdmin, logoutAdmin, meAdmin, criarAdminUser, listarAdminUsers, removerAdminUser — via superadmin router
- [x] Página /admin/login com formulário de e-mail e senha (sem OAuth Manus)
- [x] Proteção das rotas do painel admin via JWT token no localStorage
- [x] Tela de gerenciamento de usuários admin no painel — via superadmin dashboard

## Superadmin Rafael Mota (18/07/2026)
- [x] Superadmin criado no banco: rafaelmotams0907@gmail.com / sat2020ms (tenantId=0)
- [x] Login independente do Manus OAuth via /superadmin/login
- [x] Painel Superadmin redesenhado: sidebar, dashboard, lista de clientes com filtros, criar cliente, gerenciar admins

## Redesign Completo Site + Painel Superadmin (18/07/2026)
- [x] Site inicial Home.tsx completamente redesenhado com design dark premium
- [x] Copy de vendas profissional com nome correto Netvius
- [x] WhatsApp de contato 75999142134 em todos os CTAs
- [x] Botão de acesso ao Painel Admin no site inicial
- [x] Botão de download do APK do técnico no site inicial
- [x] Navbar responsiva com menu mobile
- [x] Seção de funcionalidades com cards animados
- [x] Seção Como Funciona com 4 passos
- [x] Depoimentos de clientes
- [x] Seção de planos (Básico, Profissional, Enterprise)
- [x] Footer com links para painel admin e área master
- [x] Painel Superadmin redesenhado: sidebar premium, dashboard com stats, cards de clientes elegantes
- [x] Modal de admins, editar e excluir no Superadmin
- [x] Copiar slug com feedback visual no card do cliente

## Plataforma Universal com IA (18/07/2026)
- [x] Tabela tenant_config criada no banco (segmento, terminologia, camposExtras, configFluxo, corPrimaria)
- [x] Endpoints tRPC: tenantConfig.obterConfig, tenantConfig.sugerirComIA, tenantConfig.salvarConfig
- [x] IA adapta terminologia, campos extras e fluxo conforme segmento descrito pelo cliente
- [x] Site inicial atualizado: copy universal para qualquer segmento (telecom, energia solar, segurança, etc.)
- [x] Página /admin/configuracao-ia: onboarding em 4 etapas (segmento → descrever → revisar → concluído)
- [x] 11 segmentos disponíveis: educação, telecom, energia solar, segurança, climatização, saúde, varejo, construção, logística, manutenção predial, geral
- [x] Item "Config. com IA" adicionado ao menu do painel admin

## Sistema de Trial Automático (18/07/2026)
- [x] Campos diasTrial, trialInicio, trialFim adicionados ao schema de tenants
- [x] Status "trial" e "expirado" adicionados ao enum de status do tenant
- [x] Middleware tenantAuth verifica expiração automática e bloqueia acesso
- [x] Superadmin: campo "Dias de Demonstração" no formulário de novo cliente (padrão 5 dias)
- [x] Superadmin: indicador de prazo restante nos cards de clientes (roxo/amarelo/vermelho)
- [x] Tela TrialExpirado.tsx com CTA para WhatsApp e botão de voltar ao login
- [x] AdminLayoutTenant verifica status do tenant e exibe tela de bloqueio se expirado/suspenso/cancelado
- [x] Novos clientes criados com status "trial" automaticamente

## Módulo Manutenção + Separação Superadmin/Revenda (18/07/2026)
- [x] Página /admin/manutencao no painel revenda: criar OS com escola/motivo/técnico
- [x] Painel revenda: buscar escolas do tenant ao selecionar (traz todas as informações)
- [x] Painel revenda: ao atribuir técnico, manutenção aparece no app do técnico imediatamente
- [x] App técnico: tela /tecnico/manutencao com lista de manutenções atribuídas
- [x] App técnico: detalhe da manutenção com escola, motivo, fotos antes/depois, concluir
- [x] App técnico: ao concluir, OS sai automaticamente da lista
- [x] Site inicial: link "Painel Admin" → /admin/login (revenda) — já estava correto
- [x] Site inicial: link "Área Master" → /superadmin/login (superadmin) — já estava correto
- [x] AdminLayoutTenant: item "Manutenção" adicionado ao menu lateral
- [x] App técnico: aba "Manutenção" adicionada ao bottom nav (ícone Wrench laranja)

## Usuário Visualizador Executivo (18/07/2026)
- [x] Role "viewer" já existia no enum do schema tenant_admins
- [x] Usuário bitnet@gmail.com / bitneteace criado com role viewer no tenant 1
- [x] Frontend: isViewer detectado via useTenantAuth().admin.role
- [x] Frontend: menu lateral oculta "Nota Fiscal" para viewers (sem valores financeiros)
- [x] Frontend: badge "Visualizador" exibido no perfil do usuário na sidebar
- [x] Frontend: banner executivo premium no Dashboard (Painel Executivo — Ao Vivo)
- [x] Frontend: KPIs de Total de Unidades, Concluídas e % Progresso no banner executivo

## Melhorias Premium (18/07/2026)
- [x] Ocultar valores (R$) na página de Relatórios para role viewer
- [x] Redesenhar site inicial: premium, elegante, copy de vendas profissional
- [x] Mostrar todos os diferenciais e funcionalidades no site
- [x] Vídeo demonstrativo simulado (animação CSS) mostrando abertura/fechamento de OS
- [x] Notificação diária email 08:00 para isabele.vieira@bitinternet.com.br
- [x] Notificação diária email 08:00 para nielsen.bezerra@bitinternet.com.br
- [x] Email com resumo: % concluído, escolas finalizadas no dia anterior

## Melhorias Premium Fase 2 (18/07/2026)
### Site Inicial Premium
- [x] Mudar "Gestão inteligente para equipes externas" para copy premium de vendas
- [x] Copy de vendas premium no hero ("Cada técnico em campo, cada centavo no lugar certo")
- [x] CTA final redesenhado com copy urgente ("Pare de perder dinheiro com operação desorganizada")
- [x] Redesenhar site com visual de empresa grande (Stripe/Linear level)
- [x] Seção de segurança (100% seguro, dados na nuvem, proteção total)
### App do Técnico - Melhorias
- [x] Link do Google Maps com coordenadas na página de manutenção
- [x] WhatsApp clicável com número da planilha na manutenção
- [x] Velocidade ofertada visível na OS de manutenção
- [x] Mapa interativo com todas as manutenções (pins no mapa)
- [x] Distância entre cidades no mapa
- [x] Botão "Iniciar Rota" abrindo Google Maps com navegação
- [x] IA assistente para ajudar o técnico na instalação de infraestrutura (endpoint assistenteIA)
- [x] Visual do app completamente redesenhado (premium, elegante)
### Superadmin Premium
- [x] Aba "Logs de Acesso" adicionada ao painel Superadmin com tabela de auditoria
- [x] Logs de login registrados no banco (IP, userAgent, sucesso/falha, tipo)
- [x] Redesenhar superadmin com visual premium e funcionalidades avançadas
### Segurança Avançada
- [x] Rate limiting no login (proteção contra brute force - 5 tentativas, bloqueio 15min)
- [x] Logs de acesso salvos no banco por tenant (tabela login_logs)
- [x] Tabela login_attempts para controle de brute force
- [x] Headers de segurança (HSTS, CSP, X-Frame-Options)

## Laudo de Manutenção em PDF (22/07/2026)
- [x] Endpoint tRPC manutencao.gerarLaudo — retorna HTML do laudo como string
- [x] Modal de emissão de laudo no painel admin com campo de observação extra do admin
- [x] PDF com: logo Netvius, nome escola, INEP, município, data, técnico, descrição do problema, observação do técnico, observação do admin, fotos do defeito, fotos de conclusão
- [x] Botão "Emitir Laudo" no modal de detalhes da manutenção

## Redesign Landing Page Profissional (28/07/2026)
- [x] Landing page profissional sem imagens 3D inventadas
- [x] Copy de vendas e marketing real com dados verdadeiros
- [x] Design elegante com ícones, gradientes e tipografia premium
- [x] Botão de login com email/senha fornecida pelo painel revenda (/admin/login)
- [x] Seções: Hero, Funcionalidades, Como Funciona, Segurança, Planos, CTA, Footer

## Solicitação atual — revisão premium e segurança
- [x] Auditar autenticação, rotas protegidas e isolamento por tenant
- [x] Redesenhar app do técnico com interface premium e recursos de campo
- [x] Adicionar seleção do Assistente Técnico para redes internas/externas, TP-Link e Intelbras
- [x] Refinar painel administrativo com visual premium e indicadores
- [x] Melhorar exportação de OS com formatação, resumo e gráfico baseado em dados reais
- [x] Escrever testes para segurança, isolamento, assistente, cálculo e exportação
- [x] Validar visualmente desktop/mobile e corrigir regressões
- [x] Salvar checkpoint e publicar a versão validada

> Nota: reconhecimento biométrico só deve ser implementado com WebAuthn/passkeys e requisito confirmado. A proteção imediata será por autenticação forte, sessão segura, autorização por tenant, rate limit e auditoria; não será simulada biometria.

## Pendências herdadas para revisão
- [x] Landing page deve abrir primeiro e áreas internas devem exigir login
- [ ] Cadastro com confirmação por email e notificação WhatsApp dependem de integração configurada
- [x] Confirmar fórmula R$ 200 por escola + R$ 2,50 por km em toda manutenção; OS de instalação usam tabela por AP cadastrada
- [x] Resolver/validar SSL de netvius.org manualmente no painel de domínio
- [ ] Finalizar itens pendentes do histórico sem marcar artificialmente
- [x] Confirmar conclusão do trabalho após testes reais

> Decisão do usuário em 22/08/2026: continuar apenas com verificações internas; envio real de email e WhatsApp permanece desativado e não será simulado.

## Continuidade técnica — fórmula e isolamento
- [x] Mapear todos os pontos de cálculo de manutenção e quilometragem
- [x] Confirmar que manutenção usa o helper centralizado no relatório e na exportação
- [x] Verificar que cada consulta operacional deriva tenantId da sessão autenticada
- [x] Adicionar cobertura de testes para limites de tenant nos fluxos de manutenção
- [x] Executar verificação TypeScript e testes direcionados
- [x] Salvar checkpoint das validações internas

## Cadastro controlado por email
- [x] Auditar as tabelas de tenant, admin e os procedimentos de login existentes
- [x] Criar solicitação de cadastro com token de confirmação e expiração
- [x] Armazenar a senha somente com hash antes de confirmar a conta
- [x] Enviar email de confirmação usando a integração de email já configurada
- [x] Criar telas públicas de cadastro e confirmação, sem abrir painéis internos
- [x] Registrar a solicitação de conta na auditoria do superadmin
- [x] Testar criação, expiração e confirmação de conta
- [x] Preparar ponto de integração para WhatsApp sem simular envio
- [x] Salvar checkpoint e publicar o cadastro controlado

## Exclusão segura de planilhas exportadas
- [x] Validar o administrador admin@netviones@gmail.com e seu tenant — o e-mail não existe; admin@netvionis.com (Rafael Mota) pertence ao tenant 1
- [x] Auditar tabela, tela e endpoints de planilhas exportadas
- [x] Criar exclusão com escopo obrigatório de tenant
- [x] Exigir confirmação explícita antes de excluir
- [x] Exibir a ação somente no painel do administrador autorizado
- [x] Testar bloqueio de exclusão cruzada entre tenants
- [x] Não validar nem executar exclusão: usuário informou que não precisa remover a planilha
- [x] Salvar checkpoint e publicar a ação

> Em 22/08/2026, três verificações da rota `/admin/escolas` redirecionaram corretamente para `/admin/login`. O usuário decidiu não remover planilhas; nenhuma credencial foi informada e nenhuma exclusão foi tentada.

## Elevação de segurança, experiência e relatórios
- [x] Auditar superfícies públicas, sessões, cookies e rotas internas
- [x] Revisar autorização de tenant em operações de escolas, OS, manutenção e planilhas
- [x] Reforçar controles verificáveis contra abuso e acesso cruzado
- [x] Refinar hierarquia e recursos do aplicativo técnico
- [x] Refinar landing page e copy de vendas sem alegações não verificáveis
- [x] Ampliar o Assistente Técnico para infraestrutura, TP-Link, Intelbras e Telbrás com orientações seguras
- [x] Evoluir relatório e gerador de planilhas de OS com filtros, resumos e gráficos de dados reais
- [x] Testar isolamento, cálculos, exportações e interfaces desktop/mobile
- [x] Salvar checkpoint das melhorias verificadas

## Auditoria de riscos críticos relatados
- [x] Confirmar ausência de segredos de fallback previsíveis em produção
- [x] Confirmar que erros de banco e autenticação falham de forma fechada
- [x] Remover acesso público não autorizado a fotos, relatórios e planilhas
- [x] Validar que viewer não consegue executar mutações
- [x] Remover fallback de tenant mágico e escopo implícito das rotas críticas
- [x] Avaliar riscos de arquivos de consulta e dados locais no repositório sem reescrever histórico
- [x] Documentar rotação externa necessária de segredos e invalidação de sessões
- [x] Avaliar sincronização offline para não marcar fotos com falha como concluídas
- [x] Criar testes de autorização por ID e tenant para recursos sensíveis

## Operação sem Google Drive e recuperação de publicação
- [x] Remover chamadas ativas e testes obrigatórios de Google Drive sem apagar fotos já registradas
- [x] Manter fotos no armazenamento atual e documentar o limite de acesso por URL pública
- [x] Atualizar a suíte de testes para não depender de cota do Google Drive
- [x] Diagnosticar e corrigir a falha de healthcheck da última publicação
- [x] Validar a versão publicada sem Google Drive

## Verificação da landing pública publicada
- [x] Alinhar a versão pública com a copy sem números fictícios, preços não confirmados e promessas absolutas de segurança/offline
- [x] Confirmar a propagação do checkpoint atual para netvius.org antes de tratar a landing como publicada

## Continuidade sem integrações externas
- [x] Revisar o estado de sincronização exibido ao técnico e mensagens de recuperação
- [x] Melhorar a resiliência local do aplicativo técnico sem depender de serviços externos
- [x] Testar e publicar as melhorias internas desta continuidade

> Decisão do usuário: não usar segredo temporário gerado a cada inicialização. A publicação seguirá pendente até existir um segredo de produção persistente e seguro.

## Recorte confirmado pelo usuário — OS de 01/08/2026 a 20/08/2026
- [x] Consultar OS/manutenções de Rodrigo e Ricardo entre 01/08/2026 e 20/08/2026, inclusive
- [x] Confirmar tenant atual de cada registro
- [x] Confirmar vínculo das escolas com origem e destino
- [x] Mover somente registros inequivocamente pertencentes ao cliente Rafael
- [x] Preservar as demais ordens do tenant admin@netvionis.com
- [x] Validar que as ordens aparecem no painel de rafael2020ms@gmail.com
- [x] Validar que as ordens não aparecem no painel de admin@netvionis.com
- [x] Separar no relatório os valores de Rodrigo e Ricardo
- [x] Separar na planilha os valores de Rodrigo e Ricardo
- [x] Validar total individual e total geral
- [x] Testar isolamento e exportação sem inserir dados de teste
- [x] Salvar checkpoint e publicar a correção

> Nenhuma ordem será movida fora do período ou por aproximação de nome; a data considerada será a data de criação/abertura do registro correspondente.

## Resultado validado — 22/08/2026
- [x] 20 OS do recorte foram transferidas para o tenant 180002 do cliente Rafael
- [x] Rodrigo: 11 OS e 93 APs no período de 01/08/2026 a 20/08/2026
- [x] Ricardo: 9 OS e 91 APs no período de 01/08/2026 a 20/08/2026
- [x] Rodrigo: total calculado de R$ 16.440,00 conforme valores cadastrados por AP
- [x] Ricardo: total calculado de R$ 15.240,00 conforme valores cadastrados por AP
- [x] Total do recorte: R$ 31.680,00
- [x] Relatório administrativo mostra resumo individual por técnico e total do filtro
- [x] Exportação Excel mantém abas de OS concluídas, resumo por técnico e não instaladas
- [x] TypeScript sem erros após a alteração do relatório
- [x] Testes direcionados de isolamento e regras principais: 29 passaram
- [x] Prévia visual do relatório validada em desktop
- [x] Checkpoint final desta correção

> Observação de testes atualizada: o Google Drive foi removido da operação. A pendência externa restante para a suíte integral é `RESEND_API_KEY`, ainda sem configuração utilizável para entrega real de email. Os testes direcionados de isolamento, sessão, cálculo e sincronização offline passaram.

## Isolamento das 12 escolas de Rodrigo — 22/08/2026
- [x] Identificar as 12 escolas atribuídas a Rodrigo no tenant 180002 (Rafael)
- [x] Verificar tenant de cada escola, OS e registro usado no relatório
- [x] Corrigir apenas vínculos comprovadamente fora do tenant Rafael
- [x] Confirmar que admin@netvionis.com não lista essas escolas, OS ou valores
- [x] Confirmar que rafael2020ms@gmail.com lista as 12 escolas, OS e valores correspondentes
- [x] Testar os filtros de escolas, OS e relatório após a correção
- [x] Salvar checkpoint e publicar a confirmação de isolamento
