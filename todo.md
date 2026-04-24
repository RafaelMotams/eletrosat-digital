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
