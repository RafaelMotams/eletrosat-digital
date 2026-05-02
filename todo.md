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
