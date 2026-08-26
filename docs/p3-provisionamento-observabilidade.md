# P3 — Preparação para escala por tenant

## Objetivo

Preparar o Netvius para provisionamento previsível e observabilidade agregada sem transferir, copiar ou migrar dados produtivos de clientes nesta etapa. O isolamento atual por `tenantId`, sessão e chave de evidência continua sendo a fonte de autorização durante a transição.

## Arquitetura-alvo

Cada novo tenant deve nascer em um plano de provisionamento com identificador, configuração inicial, limites de armazenamento, retenção de auditoria e estado de saúde. A evolução para banco dedicado deve ocorrer por fases: primeiro metadados e telemetria agregada no control plane; depois piloto de um tenant novo; por último, migração assistida e reversível de tenants existentes.

| Componente | Situação atual | Preparação P3 | Limite de segurança |
|---|---|---|---|
| Dados operacionais | Tabelas compartilhadas com `tenantId` obrigatório | Inventário de escopo e migrações aditivas | Não copiar dados entre tenants sem janela e validação de reconciliação |
| Arquivos | Chaves e proxy privados por tenant | Medir volume por prefixo e retenção | Master não abre evidência operacional |
| Sessões | Cookies revogáveis por perfil | Registrar eventos agregados de autenticação | Não expor usuário, escola, OS ou foto no painel Master |
| Fila offline | Namespace por tenant+técnico | Medir pendências e falhas por tenant de forma agregada | Nunca compartilhar payloads ou fotos entre escopos |
| Provisionamento | Criação administrativa de contas | Checklist idempotente de criação, configuração e teste | Nenhum tenant entra em produção sem verificação de escopo |

## Sinais de observabilidade por tenant

O control plane deve registrar somente métricas agregadas: número de sessões ativas, erros de autenticação, pendências de sincronização, falhas de upload, volume de armazenamento, duração de exportações e versão da aplicação. Qualquer análise detalhada de escola, técnico, OS ou evidência permanece no painel do próprio tenant.

## Critérios para piloto de banco dedicado

1. O tenant piloto deve ser novo ou ter uma cópia validada em ambiente isolado.
2. A migração precisa ser idempotente, possuir checksum por tabela e permitir reversão antes da troca de tráfego.
3. Arquivos devem ser reconciliados por chave, tenant e hash antes de liberar acesso.
4. A aplicação só pode alternar para o banco dedicado após teste negativo de acesso cruzado, exportações e fila offline.
5. O painel Master acompanha saúde agregada; não ganha acesso ao conteúdo operacional.

## Próxima implementação segura

Criar uma visão de saúde agregada no control plane e um checklist de provisionamento idempotente. A criação de bancos dedicados e qualquer migração de dados ficam bloqueadas até existir ambiente de piloto, política de backup e validação de reversão.
