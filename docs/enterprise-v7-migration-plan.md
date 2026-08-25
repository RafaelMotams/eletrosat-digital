# Plano Incremental de Isolamento e Migração — Netvius Enterprise V7

**Objetivo:** evoluir o isolamento atual por `tenantId` para uma arquitetura mais forte sem interromper a operação, apagar dados ou reescrever o sistema de uma vez.

## Estado de partida

O Netvius usa React, Express, tRPC, Drizzle e MySQL/TiDB. Os dados operacionais compartilham o mesmo banco e são separados por `tenantId`. A camada de aplicação já possui testes de isolamento, mas a segurança depende de cada consulta aplicar corretamente o escopo do tenant.

## Estratégia adotada

| Etapa | Alteração | Compatibilidade | Evidência de aceite | Rollback |
|---|---|---|---|---|
| A — Sessão confiável | Assinar sessões de revenda e técnico; derivar tenant e usuário somente da sessão | Mantém contratos atuais temporariamente, mas ignora IDs que não correspondam à sessão | Testes de IDOR, técnico cruzado, tenant cruzado e acesso não autenticado | Reverter checkpoint de código; nenhuma mudança destrutiva no banco |
| B — Autorização deny-by-default | Trocar rotas operacionais públicas por procedimentos autenticados e validar propriedade do recurso | Frontend continua enviando IDs durante transição, porém o servidor confere a sessão | Chamadas sem cookie/JWT retornam `UNAUTHORIZED`; recursos externos retornam `FORBIDDEN` ou `NOT_FOUND` | Reverter procedimentos por checkpoint, preservando dados |
| C — Namespace de arquivos | Prefixar novos objetos com `tenants/{tenantId}` e criar pasta Drive por tenant | URLs antigas permanecem legíveis; somente novos uploads mudam de caminho | Upload novo contém namespace; leitura cruzada é negada | Voltar a gravar no caminho antigo sem mover ou excluir arquivos |
| D — Auditoria e chaves externas | Registrar ator, tenant, ação e recurso; reduzir exposição de IDs sequenciais em links públicos | IDs internos permanecem no banco; identificadores públicos podem ser introduzidos gradualmente | Evento de auditoria para ações sensíveis e testes de acesso | Desativar uso do identificador público sem remover colunas |
| E — Preparação para banco por empresa | Centralizar resolução de conexão por tenant e impedir consultas diretas em componentes/rotas | Começa usando a conexão atual; interface do repositório fica preparada para múltiplas conexões | Toda consulta operacional passa por um contexto de tenant obrigatório | Retornar adaptador à conexão única |
| F — Piloto físico | Provisionar banco dedicado apenas para um novo tenant piloto, sem dados fictícios | Tenants existentes permanecem no banco compartilhado durante validação | Testes de criação, login, OS, fotos, exportação e exclusão lógica no piloto | Desativar roteamento do piloto e retornar à conexão compartilhada |
| G — Migração gradual | Copiar tenant por tenant com dupla validação, janela de leitura e reconciliação | Sem alteração massiva simultânea | Contagens, hashes lógicos, amostras e testes funcionais iguais antes do corte | Roteamento volta ao banco anterior, que permanece intacto durante a janela |

## Regras de segurança da migração

Nenhuma etapa remove colunas ou registros no mesmo release em que deixa de usá-los. Migrações de schema devem ser aditivas; leituras antigas continuam válidas até a reconciliação. Arquivos existentes não serão movidos automaticamente. O Master não terá conexão operacional com bancos de clientes. Jobs, exportações e notificações receberão contexto de tenant assinado.

## Decisão sobre RLS

Row Level Security é nativo de PostgreSQL, enquanto o projeto atual usa MySQL/TiDB. Portanto, não será simulada uma garantia inexistente. No curto prazo, o controle será reforçado por sessão assinada, repositórios tenant-aware, filtros obrigatórios, testes negativos e segregação de arquivos. A decisão entre PostgreSQL com RLS e banco dedicado por empresa será tomada somente após o piloto da camada de roteamento, com métricas de custo, operação e recuperação.

## Ordem dos próximos checkpoints

O primeiro checkpoint cobre sessão técnica, remoção de personificação, autorização de OS/manutenção e namespace de arquivos. O segundo cobre RBAC de papéis e auditoria. O terceiro cobre divergências de AP e exportações. O quarto cobre offline criptografado e conflitos. Somente depois será iniciado um piloto de banco físico por tenant.
