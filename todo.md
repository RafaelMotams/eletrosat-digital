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
- [x] Testes vitest para routers principais (11 testes passando)

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
