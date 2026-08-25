# Prompt de Produto e Engenharia — Netvius Operação Premium

## Objetivo

Evoluir o Netvius como uma plataforma B2B de inteligência operacional para equipes que instalam e mantêm infraestrutura de rede em escolas e outros locais. O sistema deve ajudar o técnico a concluir o trabalho em campo com poucos toques, mesmo em zona rural, e oferecer ao gestor uma visão confiável de execução, exceções, materiais, custos e evidências.

> O produto deve parecer um sistema de empresa grande: claro, rápido, consistente, responsivo e baseado em dados reais. Segurança é tratada em camadas e nunca descrita como absoluta ou infalível.

## Princípios inegociáveis

| Princípio | Aplicação prática |
|---|---|
| Isolamento por empresa | Toda consulta, arquivo, cache, fila, relatório e exportação deriva o tenant da sessão validada no servidor. IDs enviados pelo navegador nunca definem o tenant. |
| Master sem operação do cliente | O Master vê somente dados comerciais, plano, status técnico agregado, segurança e provisionamento. Não acessa escolas, OS, fotos, mapa ou histórico operacional de uma empresa. |
| Técnico em campo primeiro | A próxima ação, localização, contato, pendências e suporte devem ficar visíveis em até cinco segundos. |
| Offline consciente | O aplicativo armazena apenas dados do técnico e tenant ativos, mostra o estado da conexão, mantém fila idempotente e informa conflitos em vez de sobrescrever silenciosamente. |
| Evidência sem burocracia | A conclusão da OS mantém o fluxo atual simples: AP instalada, observação e mapa de calor quando aplicável. Fotos diagnósticas são opcionais no Assistente Técnico. |
| Segurança física | Para energia, altura, fibra, travessia ou ferramentas, a orientação deve indicar limites de competência, EPI, interrupção segura e escalonamento ao responsável técnico. |
| Dados reais | Nenhum KPI, estoque, rota, foto, preço ou alerta fictício aparece em produção. Ambientes de demonstração são explicitamente separados. |

## Design System Netvius

O visual deve combinar confiança operacional com legibilidade em sol e campo. A base usa **azul-marinho profundo**, superfícies claras e acentos de **verde-esmeralda** para sucesso, **âmbar** para atenção e **vermelho** apenas para risco ou bloqueio. O técnico usa cartões grandes, botões de toque amplo e hierarquia vertical; o painel usa tabelas densas, filtros persistentes e cards de decisão.

| Contexto | Ação primária | Informação prioritária | Tratamento de nomes longos |
|---|---|---|---|
| App do técnico | Abrir próxima OS ou manutenção | Escola, status, rota e pendência | Duas linhas, truncamento visual com título acessível e tela de detalhe completa |
| Detalhe de OS | Iniciar/concluir conforme estado | Endereço, contato, AP planejada, AP instalada e orientação | Seções empilhadas; nenhum texto cobre ícones ou ações |
| Estoque técnico | Registrar consumo | Saldo do item e vínculo com a atividade | Busca por nome/código e cartões com unidade visível |
| Painel administrativo | Resolver exceção ou criar ação | pendências, déficit de AP, baixa de estoque e falhas de sincronização | Tabelas com coluna fixa para identificação e detalhe lateral |
| Master/Revenda | Gerir conta, plano ou suporte autorizado | status comercial, plano e saúde agregada | Nunca renderizar conteúdo operacional de cliente |

Imagens ou modelos 3D podem ser usados somente como ilustração de onboarding, guia de rack ou orientação visual acessível. Eles não substituem dados operacionais, mapa real, texto alternativo ou regras técnicas fornecidas pelo administrador.

## Aplicativo do técnico

### Tela inicial

O topo mostra conexão, fila pendente e a próxima atividade. Os cartões seguem a ordem: **ação necessária**, escola, distância/rota quando disponível, status e risco. O técnico pode filtrar por instalação, manutenção, em andamento, pendente e concluída. A tela não deve carregar uma lista extensa sem busca, filtros ou prioridade.

### Rota profissional editável

O aplicativo pode sugerir uma sequência por proximidade usando coordenadas já autorizadas. A sugestão deve exibir por que aquela ordem foi escolhida, permitir reordenar manualmente e exigir confirmação antes de substituir uma rota salva. Não há mudança silenciosa de atribuição, técnico ou prioridade. Offline, o aplicativo mantém a última rota confirmada, coordenadas e documentos essenciais já sincronizados.

### Checklist contextual sem aumentar a conclusão obrigatória

Cada tipo de atendimento pode exibir um guia opcional e progressivo: rede interna, rack, Wi-Fi, fibra, manutenção e diagnóstico. O guia apresenta etapas e riscos, mas não adiciona MAC, material, foto ou checklist obrigatório ao fluxo atual de conclusão de OS. O técnico escolhe quando consultar; o sistema registra apenas ações necessárias à auditoria.

### Estoque do técnico

O técnico enxerga materiais que estão sob sua responsabilidade, saldo atual, unidade, alerta de estoque baixo e últimas movimentações. Ao consumir um item, seleciona o material, quantidade e atividade relacionada. Offline, a baixa fica em fila identificada por tenant, técnico e dispositivo; ao sincronizar, o servidor aplica validação de saldo e retorna conflito legível se a quantidade mudou.

## Estoque e materiais

### Modelo funcional

| Entidade | Campos essenciais | Regras |
|---|---|---|
| Material | tenant, código, nome, categoria, unidade, estoque mínimo, ativo | Código único por tenant; sem estoque compartilhado entre empresas |
| Saldo de local | tenant, material, local/técnico, quantidade | Um saldo por material e detentor; nunca negativo sem permissão explícita de ajuste |
| Movimentação | tenant, material, origem, destino, tipo, quantidade, ator, data, referência | Append-only; tipos incluem entrada, transferência, consumo, ajuste e devolução |
| Reserva/consumo | tenant, técnico, OS/manutenção, material, quantidade, status de sincronização | Vínculo opcional à atividade; consumo offline aguarda validação do servidor |

O gestor administra catálogo, entrada, transferência, saldo mínimo e inventário. A transferência requer origem, destino, quantidade e responsável. O sistema grava auditoria sem registrar credenciais ou conteúdo sensível desnecessário.

## Assistente Técnico por texto e foto

O Assistente Técnico é um orientador especializado em infraestrutura interna e externa, rack, patch panel, switch, controladora, fibra, TP-Link Omada, Intelbras, Ubiquiti e MikroTik. Ele deve:

1. Fazer perguntas objetivas antes de sugerir mudanças de configuração;
2. Usar instruções passo a passo e indicar como verificar o resultado;
3. Informar incerteza quando a foto ou relato não permitir diagnóstico confiável;
4. Alertar sobre risco elétrico, trabalho em altura, travessia, fibra, ferramenta inadequada e necessidade de escalonamento;
5. Nunca alegar conformidade com regras do Aprender Conectado ou Escola Conectada sem documento oficial fornecido ou fonte identificada;
6. Nunca expor dados de outra empresa na conversa, na foto ou no contexto enviado ao modelo.

O envio de imagem aceita câmera ou galeria. A imagem é enviada ao armazenamento segregado do tenant, com tamanho e tipo validados, e é usada somente para a solicitação atual. A resposta inclui: **o que é visível**, **hipóteses**, **próximo teste seguro**, **quando interromper** e **quando chamar o responsável técnico**. A foto não vira requisito para concluir OS.

## Painel administrativo

O painel deve priorizar decisões. O dashboard mostra exceções: OS atrasadas, manutenção parada, déficit de AP por escola, estoque abaixo do mínimo, fila offline pendente e necessidade de revisão de rota. Todo indicador abre os registros reais que o formam.

### Relatórios e planilhas

Cada relatório de OS apresenta lado a lado AP planejada, instalada, a menos, a mais, diferença líquida e percentual de execução. Déficits e excedentes permanecem separados por escola: um excesso não compensa uma falta em outra unidade. A planilha XLSX possui aba de resumo, aba de ordens e aba de indicadores auditáveis, com filtros, formatos numéricos, totais e identificação do período.

### Manutenção

Manutenção permanece separada da OS de instalação. Exibe escola ou local não cadastrado, técnico, problema, status, localização, contato, quilometragem, remuneração conforme a regra configurada e laudo. Toda criação, atribuição, exclusão, upload e conclusão valida o tenant e o técnico no servidor.

## Segurança e auditoria

O sistema usa sessão assinada, autorização por servidor, escopo de tenant obrigatório, logs de ações críticas, proteção de força bruta e headers de segurança. Novos arquivos usam namespace por empresa. O cache e a fila offline carregam tenant e técnico; o logout remove sessão e dados locais daquele contexto sem apagar pendências ainda não sincronizadas sem confirmação explícita.

Não são aceitáveis botões decorativos, módulos sem backend, permissões apenas visuais, personificação silenciosa pelo Master ou dados operacionais na Central Master. Suporte assistido, se criado futuramente, exige consentimento, prazo, escopo, aviso visível e auditoria.

## Critérios de aceite de cada entrega

1. O fluxo principal funciona em desktop e celular, com carregamento, vazio, erro, offline, conflito e permissão negada quando aplicável.
2. A ação primária é única e clara; ações avançadas aparecem apenas no contexto necessário.
3. O servidor bloqueia acesso cruzado entre tenant, técnico e recurso.
4. Há teste para a operação permitida e para a operação proibida.
5. A exportação gera `.xlsx` verdadeiro, com dados reais, filtros e estilos.
6. Mudanças de schema são aditivas, migradas com segurança e sem apagar dados existentes.
7. A entrega passa por TypeScript, testes, build e validação visual antes de checkpoint.

## Entregas incrementais

| Checkpoint | Escopo | Dependências |
|---|---|---|
| 1 | Catálogo de materiais, saldo e movimentações auditáveis por tenant | Migração aditiva |
| 2 | Estoque do técnico e consumo associado a atividade, inclusive fila offline | Sincronização idempotente |
| 3 | Rota editável, sequência confirmada e visualização operacional | Coordenadas válidas das escolas |
| 4 | Assistente por foto com armazenamento segregado e limites de segurança | Capacidade multimodal do provedor de IA |
| 5 | Alertas de estoque, relatórios e exportações avançadas | Serviço de notificação autorizado |

## Referências de regras oficiais

Documentos de projetos públicos, fabricantes ou normas não devem ser inventados. Quando o administrador fornecer manuais, contratos, documentos do Aprender Conectado, Escola Conectada, EACE ou fabricantes, eles devem ser versionados e adicionados à base de conhecimento com fonte, vigência e escopo.
